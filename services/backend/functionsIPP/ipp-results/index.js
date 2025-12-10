const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { GetCommand, DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

/**
 * IPP RESULTS - Obtener resultados finales del proceso IPP
 * 
 * Responsabilidades:
 * 1. Consultar DynamoDB por job_id
 * 2. Verificar que proceso esté completado
 * 3. Retornar metadata de resultados (ubicación en Databricks, S3, etc.)
 * 
 * Endpoint: GET /ipp/results/{job_id}
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
  
  console.log(`[IPP-RESULTS] Consultando resultados para job: ${jobId}`);
  
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

exports.handler = async (event) => {
  console.log('[IPP-RESULTS] Evento recibido:', JSON.stringify(event, null, 2));
  
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
          message: 'Usa: GET /ipp/results/{job_id}'
        })
      };
    }
    
    // Obtener job de DynamoDB
    const job = await getJobFromDynamoDB(jobId);
    
    console.log(`[IPP-RESULTS] Job encontrado. Status: ${job.status}`);
    
    // Verificar que el proceso esté completado
    if (job.status !== 'COMPLETED') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Proceso no completado',
          message: `El proceso está en estado: ${job.status}. Espera a que se complete.`,
          job_id: jobId,
          current_status: job.status
        })
      };
    }
    
    // Construir respuesta con metadata de resultados
    const results = {
      job_id: jobId,
      status: job.status,
      mostradores: job.mostradores,
      mostradores_count: job.mostradores_count,
      
      // Metadata del proceso
      process_info: {
        created_at: job.created_at,
        updated_at: job.updated_at,
        user_info: job.user_info
      },
      
      // Ubicación de resultados en Databricks
      databricks_info: {
        job1_run_id: job.databricks_run_id,
        job2_run_id: job.job2_run_id,
        results_table: 'invenadro.gold.ipp_resultados_finales', // Tabla en Databricks
        query_example: `SELECT * FROM invenadro.gold.ipp_resultados_finales WHERE job_id = '${jobId}'`
      },
      
      // S3 (si se guardaron archivos)
      s3_locations: job.s3_results || {},
      
      // Additional data guardada durante el proceso
      additional_data: job.additional_data || {},
      
      // Resumen
      summary: {
        mostradores_processed: job.mostradores_count,
        total_time_seconds: job.total_time_seconds,
        success: true
      }
    };
    
    // Logs estructurados
    console.log(JSON.stringify({
      level: 'INFO',
      action: 'results_retrieved',
      job_id: jobId,
      mostradores_count: job.mostradores_count,
      user: job.user_info?.email,
      timestamp: new Date().toISOString()
    }));
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(results)
    };
    
  } catch (error) {
    console.error('[IPP-RESULTS] ❌ Error:', error);
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

