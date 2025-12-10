const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { GetCommand, UpdateCommand, DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const axios = require('axios');

/**
 * IPP STATUS - Consultar estado del proceso IPP
 * 
 * Responsabilidades:
 * 1. Consultar DynamoDB por job_id
 * 2. Si Job 1 está running, consultar estado en Databricks
 * 3. Si Job 1 terminó, verificar si processing/job2 está activo
 * 4. Retornar estado actual al frontend
 * 
 * Endpoint: GET /ipp/status/{job_id}
 */

const dynamoClient = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true  // Evitar error con valores undefined
  }
});

// Helper para CORS
const getCorsHeaders = (event) => {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || '*');
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  };
};

/**
 * Obtener job de DynamoDB
 */
const getJobFromDynamoDB = async (jobId) => {
  const tableName = process.env.IPP_JOBS_TABLE || 'invenadro-backend-jul-dev-ipp-jobs';
  
  console.log(`[IPP-STATUS] Consultando job: ${jobId}`);
  
  const command = new GetCommand({
    TableName: tableName,
    Key: { job_id: jobId }
  });
  
  const response = await docClient.send(command);
  
  if (!response.Item) {
    throw new Error('Job no encontrado');
  }
  
  return response.Item;
};

/**
 * Actualizar estado del job en DynamoDB
 */
const updateJobStatus = async (jobId, status, additionalData = {}) => {
  const tableName = process.env.IPP_JOBS_TABLE || 'invenadro-backend-jul-dev-ipp-jobs';
  
  console.log(`[IPP-STATUS] Actualizando job ${jobId} a status: ${status}`);
  
  const command = new UpdateCommand({
    TableName: tableName,
    Key: { job_id: jobId },
    UpdateExpression: 'SET #status = :status, updated_at = :timestamp, #data = :data',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#data': 'additional_data'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':timestamp': new Date().toISOString(),
      ':data': additionalData
    }
  });
  
  await docClient.send(command);
};

/**
 * Consultar estado de Databricks Run
 */
const checkDatabricksRunStatus = async (runId) => {
  const workspaceUrl = process.env.DATABRICKS_WORKSPACE_URL;
  const accessToken = process.env.DATABRICKS_ACCESS_TOKEN;
  
  if (!workspaceUrl || !accessToken) {
    throw new Error('Configuración de Databricks incompleta');
  }
  
  try {
    const response = await axios.get(
      `${workspaceUrl}/api/2.1/jobs/runs/get`,
      {
        params: { run_id: runId },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    const runData = response.data;
    const state = runData.state?.life_cycle_state; // PENDING, RUNNING, TERMINATING, TERMINATED, SKIPPED, INTERNAL_ERROR
    const resultState = runData.state?.result_state; // SUCCESS, FAILED, TIMEDOUT, CANCELED
    
    console.log(`[IPP-STATUS] Databricks run ${runId} - State: ${state}, Result: ${resultState || 'N/A'}`);
    
    return {
      state,
      resultState,
      stateMessage: runData.state?.state_message,
      runPageUrl: runData.run_page_url
    };
    
  } catch (error) {
    console.error('[IPP-STATUS] Error consultando Databricks:', error.message);
    throw error;
  }
};

/**
 * Mapear estado de Databricks a estado IPP
 */
const mapDatabricksStateToIPP = (databricksState, resultState) => {
  if (databricksState === 'TERMINATED') {
    if (resultState === 'SUCCESS') {
      return 'JOB1_DONE';
    } else {
      return 'FAILED';
    }
  }
  
  if (databricksState === 'RUNNING' || databricksState === 'PENDING' || databricksState === 'TERMINATING') {
    return 'JOB1_RUNNING';
  }
  
  if (databricksState === 'SKIPPED' || databricksState === 'INTERNAL_ERROR') {
    return 'FAILED';
  }
  
  return 'UNKNOWN';
};

exports.handler = async (event) => {
  console.log('[IPP-STATUS] Evento recibido:', JSON.stringify(event, null, 2));
  
  const corsHeaders = getCorsHeaders(event);
  
  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  try {
    // Obtener job_id del path
    const jobId = event.pathParameters?.job_id;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'job_id es requerido en el path',
          message: 'Usa: GET /ipp/status/{job_id}'
        })
      };
    }
    
    // 1. Obtener job de DynamoDB
    const job = await getJobFromDynamoDB(jobId);
    
    console.log(`[IPP-STATUS] Job encontrado. Status actual: ${job.status}`);
    
    // 2. Si el job ya está completado o falló, retornar estado
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          job_id: jobId,
          status: job.status,
          message: job.status === 'COMPLETED' ? 'Proceso completado' : 'Proceso fallido',
          mostradores_count: job.mostradores_count,
          created_at: job.created_at,
          updated_at: job.updated_at
        })
      };
    }
    
    // 3. Si Job 1 está corriendo, consultar Databricks
    if (job.status === 'JOB1_RUNNING' && job.databricks_run_id) {
      const databricksStatus = await checkDatabricksRunStatus(job.databricks_run_id);
      const newStatus = mapDatabricksStateToIPP(databricksStatus.state, databricksStatus.resultState);
      
      // Actualizar estado si cambió
      if (newStatus !== job.status) {
        await updateJobStatus(jobId, newStatus, {
          databricks_state: databricksStatus.state,
          databricks_result: databricksStatus.resultState,
          databricks_message: databricksStatus.stateMessage
        });
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          job_id: jobId,
          status: newStatus,
          message: newStatus === 'JOB1_RUNNING' ? 'Databricks Job 1 en ejecución...' : 
                   newStatus === 'JOB1_DONE' ? 'Job 1 completado, listo para procesamiento' :
                   'Job 1 falló',
          databricks_state: databricksStatus.state,
          databricks_run_url: databricksStatus.runPageUrl,
          mostradores_count: job.mostradores_count,
          progress: newStatus === 'JOB1_RUNNING' ? 25 : newStatus === 'JOB1_DONE' ? 40 : 0
        })
      };
    }
    
    // 4. Otros estados (PROCESSING, JOB2_RUNNING, etc.)
    const progressMap = {
      'JOB1_RUNNING': 25,
      'JOB1_DONE': 40,
      'PROCESSING': 60,
      'JOB2_RUNNING': 80,
      'COMPLETED': 100,
      'FAILED': 0
    };
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        job_id: jobId,
        status: job.status,
        message: `Proceso en estado: ${job.status}`,
        mostradores_count: job.mostradores_count,
        progress: progressMap[job.status] || 50,
        created_at: job.created_at,
        updated_at: job.updated_at
      })
    };
    
  } catch (error) {
    console.error('[IPP-STATUS] ❌ Error:', error);
    console.error('Stack:', error.stack);
    
    const statusCode = error.message === 'Job no encontrado' ? 404 : 500;
    
    return {
      statusCode,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message === 'Job no encontrado' ? 'Job no encontrado' : 'Error interno',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

