const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { GetCommand, UpdateCommand, DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
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
  },
  unmarshallOptions: {
    wrapNumbers: false  // Convertir Numbers a números JS nativos, no objetos
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
 * Obtener job de DynamoDB usando cliente RAW para evitar bugs del Document Client
 */
const getJobFromDynamoDB = async (jobId) => {
  const tableName = process.env.IPP_JOBS_TABLE || 'invenadro-backend-jul-dev-ipp-jobs';
  
  console.log(`[IPP-STATUS] Consultando job: ${jobId}`);
  
  // Usar cliente RAW en lugar de Document Client para evitar problemas con objetos anidados grandes
  const command = new GetItemCommand({
    TableName: tableName,
    Key: { 
      job_id: { S: jobId }
    }
  });
  
  const response = await dynamoClient.send(command);
  
  if (!response.Item) {
    throw new Error('Job no encontrado');
  }
  
  // Deserializar manualmente con unmarshall
  const item = unmarshall(response.Item);
  
  // LOGS EXHAUSTIVOS para debugging
  console.log('[IPP-STATUS] ===== ITEM DE DYNAMODB (RAW CLIENT) =====');
  console.log('[IPP-STATUS] Keys presentes en item:', Object.keys(item));
  console.log('[IPP-STATUS] factor_results existe?', 'factor_results' in item);
  console.log('[IPP-STATUS] factor_results es null?', item.factor_results === null);
  console.log('[IPP-STATUS] factor_results es undefined?', item.factor_results === undefined);
  console.log('[IPP-STATUS] factor_results tipo:', typeof item.factor_results);
  if (item.factor_results) {
    console.log('[IPP-STATUS] factor_results contenido:', JSON.stringify(item.factor_results, null, 2));
  }
  console.log('[IPP-STATUS] ============================');
  
  return item;
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
      return 'completed'; // Job 1 completado exitosamente
    } else {
      return 'failed';
    }
  }
  
  // Diferenciar entre cola y ejecución
  // Databricks puede devolver PENDING o QUEUED dependiendo de la versión
  if (databricksState === 'PENDING' || databricksState === 'QUEUED') {
    return 'job1_queued'; // En cola, esperando recursos
  }
  
  if (databricksState === 'RUNNING' || databricksState === 'TERMINATING') {
    return 'job1_running'; // Ejecutándose
  }
  
  if (databricksState === 'SKIPPED' || databricksState === 'INTERNAL_ERROR') {
    return 'failed';
  }
  
  return 'unknown';
};

exports.handler = async (event) => {
  console.log('[IPP-STATUS] Evento recibido:', JSON.stringify(event, null, 2));
  
  const corsHeaders = getCorsHeaders(event);
  
  // Definir progressMap al inicio para que esté disponible en todo el handler
  const progressMap = {
    'validating': 5,
    'job1_queued': 15,      // En cola esperando recursos
    'job1_running': 35,     // Ejecutándose
    'processing': 50,
    'completed': 50,
    'factor_initiated': 60,
    'factor_processing': 80,
    'factor_completed': 100,
    'job2_running': 80,
    'failed': 0
  };
  
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
    console.log(`[IPP-STATUS] Factor results disponibles: ${job.factor_results ? 'SI' : 'NO'}`);
    if (job.factor_results) {
      console.log(`[IPP-STATUS] Factor results:`, JSON.stringify(job.factor_results, null, 2));
    }
    
    // 2. Si el job ya está completado, en factor de redondeo, o falló, retornar estado
    if (job.status === 'completed' || job.status === 'failed' || 
        job.status === 'factor_initiated' || job.status === 'factor_processing' || 
        job.status === 'factor_completed') {
      
      console.log(`[IPP-STATUS] Retornando status final/factor para job: ${jobId}`);
      
      // LOGS EXHAUSTIVOS de la respuesta
      const responsePayload = {
        job_id: jobId,
        status: job.status,
        message: job.status === 'factor_completed' ? 'Proceso completado (con Factor de Redondeo)' : 
                 job.status === 'factor_processing' ? 'Factor de Redondeo procesando clientes...' :
                 job.status === 'factor_initiated' ? 'Factor de Redondeo iniciado...' :
                 job.status === 'completed' ? 'Databricks completado, iniciando Factor de Redondeo...' : 
                 'Proceso fallido',
        mostradores_count: job.mostradores_count,
        total_clientes: job.total_clientes,
        factor_results: job.factor_results || null,
        databricks_run_url: job.databricks_run_url || null,
        created_at: job.created_at,
        updated_at: job.updated_at
      };
      
      console.log('[IPP-STATUS] ===== RESPUESTA HTTP =====');
      console.log('[IPP-STATUS] factor_results en payload?', 'factor_results' in responsePayload);
      console.log('[IPP-STATUS] factor_results es null?', responsePayload.factor_results === null);
      console.log('[IPP-STATUS] factor_results contenido:', JSON.stringify(responsePayload.factor_results, null, 2));
      console.log('[IPP-STATUS] ==========================');
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(responsePayload)
      };
    }
    
    // 3. Si Job 1 está corriendo, consultar Databricks
    if (job.status === 'job1_running' && job.databricks_run_id) {
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
          message: newStatus === 'job1_queued' ? 'Databricks: En cola, esperando recursos...' :
                   newStatus === 'job1_running' ? 'Databricks: Ejecutando IPP Tradicional + Normalización...' : 
                   newStatus === 'completed' ? 'Databricks completado, iniciando Factor de Redondeo...' :
                   'Job 1 falló',
          databricks_state: databricksStatus.state,
          databricks_run_url: databricksStatus.runPageUrl,
          mostradores_count: job.mostradores_count,
          progress: progressMap[newStatus] || 50
        })
      };
    }
    
    // 4. Otros estados (processing, job2_running, etc.)
    console.log(`[IPP-STATUS] Estado: ${job.status}, Progreso: ${progressMap[job.status] || 50}%`);
    console.log(`[IPP-STATUS] Factor results en respuesta:`, job.factor_results ? 'SI' : 'NO');
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        job_id: jobId,
        status: job.status,
        message: `Proceso en estado: ${job.status}`,
        mostradores_count: job.mostradores_count,
        total_clientes: job.total_clientes,
        progress: progressMap[job.status] || 50,
        factor_results: job.factor_results || null,
        databricks_run_url: job.databricks_run_url || null,
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

