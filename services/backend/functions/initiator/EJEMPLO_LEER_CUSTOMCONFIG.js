/**
 * EJEMPLO: Cómo Leer customConfig desde DynamoDB
 * 
 * Este archivo es solo de referencia. Muestra cómo leer el customConfig
 * si en el futuro necesitas consultarlo desde DynamoDB.
 * 
 * NOTA: Actualmente NO se lee desde DynamoDB, se pasa via Step Functions.
 */

const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');

// ===========================================================
// OPCIÓN 1: Leer con DynamoDB Client (raw)
// ===========================================================
async function leerCustomConfigRaw(processId) {
  const dynamoDB = new DynamoDBClient({ region: 'mx-central-1' });
  
  const result = await dynamoDB.send(new GetItemCommand({
    TableName: 'invenadro-backend-jul-dev-jobs',
    Key: {
      processId: { S: processId }
    }
  }));
  
  if (!result.Item) {
    throw new Error('Proceso no encontrado');
  }
  
  // Parsear el JSON string
  const customConfig = JSON.parse(result.Item.customConfig.S);
  
  console.log('customConfig completo:', customConfig);
  /*
    {
      source: 'IPP',
      ipp_job_id: 'ipp_abc123',
      cliente: '7051602',
      factorRedondeo: 0.47,
      joroba: 3.5,
      diasInversionDeseados: 27
    }
  */
  
  // Acceder a campos específicos
  console.log('Origen:', customConfig.source);
  console.log('IPP Job ID:', customConfig.ipp_job_id);
  console.log('Cliente:', customConfig.cliente);
  console.log('Factor:', customConfig.factorRedondeo);
  
  return customConfig;
}

// ===========================================================
// OPCIÓN 2: Leer con Document Client (más fácil)
// ===========================================================
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

async function leerCustomConfigDocClient(processId) {
  const dynamoDB = new DynamoDBClient({ region: 'mx-central-1' });
  const docClient = DynamoDBDocumentClient.from(dynamoDB);
  
  const result = await docClient.send(new GetCommand({
    TableName: 'invenadro-backend-jul-dev-jobs',
    Key: { processId }
  }));
  
  if (!result.Item) {
    throw new Error('Proceso no encontrado');
  }
  
  // Con Document Client, customConfig YA es un string
  const customConfig = JSON.parse(result.Item.customConfig);
  
  console.log('customConfig:', customConfig);
  
  return customConfig;
}

// ===========================================================
// OPCIÓN 3: Query para buscar procesos que vienen de IPP
// ===========================================================
const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

async function buscarProcesosPorIPP(ippJobId) {
  const dynamoDB = new DynamoDBClient({ region: 'mx-central-1' });
  const docClient = DynamoDBDocumentClient.from(dynamoDB);
  
  // NOTA: Esto requiere un GSI (Global Secondary Index) o hacer Scan
  // Como es ineficiente, mejor mantener un registro en la tabla IPP
  
  // Scan (no recomendado para producción con muchos registros)
  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
  
  const result = await docClient.send(new ScanCommand({
    TableName: 'invenadro-backend-jul-dev-jobs',
    FilterExpression: 'contains(customConfig, :ipp_job_id)',
    ExpressionAttributeValues: {
      ':ipp_job_id': ippJobId
    }
  }));
  
  // Parsear customConfig de cada item
  const procesos = result.Items.map(item => ({
    processId: item.processId,
    status: item.status,
    customConfig: JSON.parse(item.customConfig)
  }));
  
  // Filtrar solo los que realmente vienen de este IPP
  const procesosIPP = procesos.filter(p => 
    p.customConfig.source === 'IPP' && 
    p.customConfig.ipp_job_id === ippJobId
  );
  
  console.log(`Encontrados ${procesosIPP.length} procesos del IPP ${ippJobId}`);
  
  return procesosIPP;
}

// ===========================================================
// EJEMPLO DE USO
// ===========================================================
async function ejemplo() {
  try {
    // Leer un proceso específico
    const config1 = await leerCustomConfigRaw('uuid-123');
    console.log('Viene de IPP:', config1.source === 'IPP');
    
    // Buscar todos los procesos de un IPP Job
    const procesos = await buscarProcesosPorIPP('ipp_abc123');
    
    for (const proceso of procesos) {
      console.log(`Cliente ${proceso.customConfig.cliente}: ${proceso.status}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// ===========================================================
// RECOMENDACIÓN
// ===========================================================
/*
  En lugar de hacer Scan en la tabla de Factor de Redondeo,
  es MEJOR mantener un registro en la tabla IPP:
  
  Tabla: ipp-jobs
  {
    "job_id": "ipp_abc123",
    "status": "factor_completed",
    "factor_processes": [
      {
        "cliente": "7051602",
        "process_id": "uuid-111",
        "status": "COMPLETED",
        "result_path": "s3://results/resultados/uuid-111/"
      },
      {
        "cliente": "7051603",
        "process_id": "uuid-222",
        "status": "COMPLETED",
        "result_path": "s3://results/resultados/uuid-222/"
      }
    ]
  }
  
  Así desde IPP puedes ver directamente todos sus procesos
  sin hacer Scan costoso en la tabla de Factor.
*/

module.exports = {
  leerCustomConfigRaw,
  leerCustomConfigDocClient,
  buscarProcesosPorIPP
};

