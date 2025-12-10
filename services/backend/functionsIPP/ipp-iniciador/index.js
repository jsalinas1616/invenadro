const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { PutCommand, DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

/**
 * IPP INICIADOR - Iniciar proceso IPP y trigger Databricks Job 1
 * 
 * Responsabilidades:
 * 1. Generar JOB_ID único
 * 2. Guardar estado inicial en DynamoDB
 * 3. Trigger Databricks Job 1 (Notebook Tradicional + Normalizador)
 * 4. Retornar job_id al frontend
 * 
 * Endpoint: POST /ipp/start
 * Body: { "mostradores": ["7051602", "7051603"] }
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
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
};

/**
 * Trigger Databricks Job 1
 */
const triggerDatabricksJob1 = async (jobId, mostradores) => {
  console.log(`[IPP-INICIADOR] Triggering Databricks Job 1 para job_id: ${jobId}`);
  
  const workspaceUrl = process.env.DATABRICKS_WORKSPACE_URL;
  const accessToken = process.env.DATABRICKS_ACCESS_TOKEN;
  const jobIdDatabricks = process.env.DATABRICKS_JOB1_ID; // ID del job en Databricks
  
  if (!workspaceUrl || !accessToken || !jobIdDatabricks) {
    throw new Error('Configuración de Databricks incompleta (WORKSPACE_URL, ACCESS_TOKEN, JOB1_ID)');
  }
  
  try {
    // Trigger Databricks Job con parámetros
    const response = await axios.post(
      `${workspaceUrl}/api/2.1/jobs/run-now`,
      {
        job_id: Number(jobIdDatabricks),
        notebook_params: {
          job_id: jobId,
          mostradores: mostradores.join(','), // CSV de mostradores
          timestamp: new Date().toISOString()
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const runId = response.data.run_id;
    console.log(`[IPP-INICIADOR] ✅ Job 1 triggered exitosamente. Run ID: ${runId}`);
    
    return { runId, jobIdDatabricks };
    
  } catch (error) {
    console.error('[IPP-INICIADOR] ❌ Error triggering Databricks Job 1:', error.message);
    if (error.response) {
      console.error('[IPP-INICIADOR] Error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Error al iniciar Job Databricks: ${error.message}`);
  }
};

/**
 * Guardar job en DynamoDB
 */
const saveJobToDynamoDB = async (jobData) => {
  const tableName = process.env.IPP_JOBS_TABLE || 'invenadro-backend-jul-dev-ipp-jobs';
  
  console.log(`[IPP-INICIADOR] Guardando job en DynamoDB: ${jobData.job_id}`);
  
  const command = new PutCommand({
    TableName: tableName,
    Item: jobData
  });
  
  await docClient.send(command);
  console.log('[IPP-INICIADOR] ✅ Job guardado en DynamoDB');
};

exports.handler = async (event) => {
  console.log('[IPP-INICIADOR] Evento recibido:', JSON.stringify(event, null, 2));
  
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
    // Parsear body
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Obtener lista de mostradores (o alias "clients")
    const mostradores = body.mostradores || body.clients || [];
    
    if (!Array.isArray(mostradores) || mostradores.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Lista de mostradores vacía',
          message: 'Envía una lista de mostradores como: { "mostradores": ["7051602", "7051603"] }'
        })
      };
    }
    
    console.log(`[IPP-INICIADOR] Iniciando proceso para ${mostradores.length} mostradores`);
    
    // 1. Generar JOB_ID único
    const jobId = `ipp-${uuidv4()}`;
    const timestamp = new Date().toISOString();
    
    // 2. Extraer información del usuario si está disponible
    let userInfo = null;
    if (event.requestContext?.authorizer?.claims) {
      const claims = event.requestContext.authorizer.claims;
      userInfo = {
        email: claims.email || claims['cognito:username'],
        username: claims['cognito:username'],
        sub: claims.sub,
        name: claims.name || claims.email
      };
      console.log('[IPP-INICIADOR] 👤 Usuario:', userInfo.email);
    }
    
    // 3. Trigger Databricks Job 1
    const { runId, jobIdDatabricks } = await triggerDatabricksJob1(jobId, mostradores);
    
    // 4. Guardar job en DynamoDB
    const jobData = {
      job_id: jobId,
      status: 'JOB1_RUNNING',
      mostradores: mostradores,
      mostradores_count: mostradores.length,
      databricks_run_id: runId,
      databricks_job_id: jobIdDatabricks,
      user_info: userInfo,
      created_at: timestamp,
      updated_at: timestamp,
      ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 días TTL
    };
    
    await saveJobToDynamoDB(jobData);
    
    // Logs estructurados
    console.log(JSON.stringify({
      level: 'INFO',
      action: 'ipp_process_initiated',
      job_id: jobId,
      mostradores_count: mostradores.length,
      databricks_run_id: runId,
      user: userInfo?.email,
      timestamp
    }));
    
    // 5. Respuesta exitosa
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        job_id: jobId,
        status: 'JOB1_RUNNING',
        message: 'Proceso IPP iniciado exitosamente',
        mostradores_count: mostradores.length,
        databricks_run_id: runId,
        timestamp
      })
    };
    
  } catch (error) {
    console.error('[IPP-INICIADOR] ❌ Error:', error);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Error interno al iniciar proceso IPP',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

