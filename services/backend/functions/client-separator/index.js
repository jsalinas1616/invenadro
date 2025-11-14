const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const XLSX = require('xlsx');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const stepFunctions = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
    try {
        console.log('🔀 CLIENT SEPARATOR - Evento recibido:', JSON.stringify(event, null, 2));
        
        // ✅ VALIDAR VARIABLE DE ENTORNO
        const JOBS_TABLE = process.env.JOBS_TABLE;
        if (!JOBS_TABLE) {
            throw new Error('❌ JOBS_TABLE no está configurado en variables de entorno');
        }
        
        const { s3Bucket, s3Key, customConfig, processId } = event;
        
        if (!s3Bucket || !s3Key) {
            throw new Error('s3Bucket y s3Key son requeridos');
        }
        
        // Actualizar estado en DynamoDB
        await updateDynamoDBStatus(processId, 'SEPARATING_CLIENTS', 'Analizando archivo para detectar clientes múltiples...', JOBS_TABLE);
        
        // Descargar archivo de S3
        console.log('📥 Descargando archivo de S3...');
        const fileBuffer = await downloadFileFromS3(s3Bucket, s3Key);
        
        // Analizar Excel para detectar clientes
        console.log('🔍 Analizando clientes en el archivo...');
        const clientesInfo = await analizarClientesEnExcel(fileBuffer);
        
        console.log('📊 Análisis completado:', {
            totalClientes: clientesInfo.length,
            clientes: clientesInfo.map(c => c.cliente)
        });
        
        // Decidir el flujo según número de clientes
        if (clientesInfo.length === 1) {
            // SINGLE CLIENTE - Procesar directamente
            console.log('🎯 SINGLE CLIENTE detectado - Procesando directamente');
            
            await updateDynamoDBStatus(processId, 'PROCESSING_SINGLE', `Cliente único detectado: ${clientesInfo[0].cliente}`, JOBS_TABLE);
            
            const resultado = await procesarClienteUnico(event, clientesInfo[0]);
            return resultado;
            
        } else if (clientesInfo.length > 1) {
            // MULTI CLIENTE - Separar y procesar cada uno
            console.log('🔄 MULTI CLIENTE detectado - Iniciando separación');
            
            await updateDynamoDBStatus(processId, 'PROCESSING_MULTI', `Múltiples clientes detectados: ${clientesInfo.length}`, JOBS_TABLE);
            
            const resultado = await procesarMultiplesClientes(event, clientesInfo, fileBuffer);
            return resultado;
            
        } else {
            throw new Error('No se detectaron clientes válidos en el archivo');
        }
        
    } catch (error) {
        console.error('❌ Error en client-separator:', error);
        
        // Actualizar estado de error en DynamoDB si tenemos processId
        if (event.processId) {
            const JOBS_TABLE_FALLBACK = process.env.JOBS_TABLE || 'invenadro-backend-jul-dev-jobs';
            await updateDynamoDBStatus(event.processId, 'ERROR', `Error en separación: ${error.message}`, JOBS_TABLE_FALLBACK);
        }
        
        throw error;
    }
};

/**
 * DESCARGAR ARCHIVO DE S3
 */
async function downloadFileFromS3(bucket, key) {
    const response = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
    }));
    
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * ANALIZAR CLIENTES EN EXCEL - OPTIMIZADO
 * Solo cuenta clientes sin cargar todos los datos en memoria
 */
async function analizarClientesEnExcel(fileBuffer) {
    // Leer archivo completo una sola vez
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leer solo headers (primera fila)
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const headers = [];
    for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
        const cellAddress = { r: range.s.r, c: colNum };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        const cell = worksheet[cellRef];
        headers.push(cell ? cell.v : null);
    }
    
    console.log('📋 Headers detectados:', headers);
    
    // Detectar columna de cliente
    const posiblesColumnasCliente = ['Cliente', 'CLIENTE', 'cliente', 'Client', 'CLIENT'];
    let columnaCliente = null;
    
    for (const col of posiblesColumnasCliente) {
        if (headers.includes(col)) {
            columnaCliente = col;
            break;
        }
    }
    
    if (!columnaCliente) {
        throw new Error(`No se encontró columna de Cliente. Columnas disponibles: ${headers.filter(h => h).join(', ')}`);
    }
    
    console.log(`🎯 Columna de cliente detectada: "${columnaCliente}"`);
    
    // Leer todos los datos para contar clientes
    const datos = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📋 Total registros leídos: ${datos.length}`);
    
    if (datos.length === 0) {
        throw new Error('El archivo Excel no contiene datos válidos');
    }
    
    // Contar clientes únicos SIN guardar todos los registros
    const clientesCount = new Map();
    
    datos.forEach((fila) => {
        const cliente = fila[columnaCliente];
        if (!cliente || cliente.toString().trim() === '') {
            return;
        }
        
        const clienteNormalizado = cliente.toString().trim();
        clientesCount.set(clienteNormalizado, (clientesCount.get(clienteNormalizado) || 0) + 1);
    });
    
    // Crear info mínima de clientes
    const clientesInfo = Array.from(clientesCount.entries()).map(([cliente, count]) => ({
        cliente: cliente,
        totalRegistros: count,
        columnaCliente: columnaCliente
    })).sort((a, b) => b.totalRegistros - a.totalRegistros);
    
    console.log('📊 Clientes detectados:');
    clientesInfo.forEach(info => {
        console.log(`  - ${info.cliente}: ${info.totalRegistros} registros`);
    });
    
    // Liberar memoria
    datos.length = 0;
    
    return clientesInfo;
}

/**
 * PROCESAR CLIENTE ÚNICO - Retornar info para que continúe la ejecución actual
 */
async function procesarClienteUnico(event, clienteInfo) {
    console.log('🎯 Cliente único detectado:', clienteInfo.cliente);
    
    // NO crear nueva ejecución, solo devolver la información para que 
    // el Step Function actual continúe con ProcesarClienteUnico
    return {
        tipoProcesso: 'SINGLE_CLIENT',
        cliente: clienteInfo.cliente,
        totalRegistros: clienteInfo.totalRegistros,
        s3Bucket: event.s3Bucket,
        s3Key: event.s3Key,
        customConfig: event.customConfig,
        processId: event.processId
    };
}

/**
 * PROCESAR MÚLTIPLES CLIENTES - OPTIMIZADO
 * Procesa uno por uno para liberar memoria entre iteraciones
 */
async function procesarMultiplesClientes(event, clientesInfo, fileBuffer) {
    console.log('🔄 Procesando múltiples clientes:', clientesInfo.length);
    
    const { s3Bucket, customConfig, processId } = event;
    const executions = [];
    
    // Leer workbook una sola vez
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const columnaCliente = clientesInfo[0].columnaCliente;
    
    // Liberar fileBuffer ya no lo necesitamos
    fileBuffer = null;
    
    // Procesar cada cliente uno por uno
    for (let i = 0; i < clientesInfo.length; i++) {
        const clienteInfo = clientesInfo[i];
        console.log(`📝 [${i + 1}/${clientesInfo.length}] Procesando cliente: ${clienteInfo.cliente}`);
        
        // Actualizar progreso en DynamoDB
        const JOBS_TABLE_LOCAL = process.env.JOBS_TABLE || 'invenadro-backend-jul-dev-jobs';
        await updateDynamoDBStatus(
            processId, 
            'PROCESSING_MULTI', 
            `Separando archivos: ${i + 1}/${clientesInfo.length} clientes procesados (${clienteInfo.cliente})`,
            JOBS_TABLE_LOCAL
        );
        
        // Leer datos del Excel SOLO para este cliente (streaming)
        const datosCliente = [];
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
            const row = {};
            let isEmpty = true;
            
            for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
                const cellAddress = { r: rowNum, c: colNum };
                const cellRef = XLSX.utils.encode_cell(cellAddress);
                const cell = worksheet[cellRef];
                
                if (cell) {
                    const headerCell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: colNum })];
                    const header = headerCell ? headerCell.v : `Column${colNum}`;
                    row[header] = cell.v;
                    isEmpty = false;
                }
            }
            
            if (!isEmpty && row[columnaCliente] && row[columnaCliente].toString().trim() === clienteInfo.cliente) {
                datosCliente.push(row);
            }
        }
        
        console.log(`  📊 ${datosCliente.length} registros para ${clienteInfo.cliente}`);
        
        // Crear workbook para este cliente
        const nuevoWorkbook = XLSX.utils.book_new();
        const nuevaHoja = XLSX.utils.json_to_sheet(datosCliente);
        XLSX.utils.book_append_sheet(nuevoWorkbook, nuevaHoja, 'Inventario');
        
        // Convertir a buffer
        const clienteBuffer = XLSX.write(nuevoWorkbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Liberar memoria
        datosCliente.length = 0;
        
        // Subir archivo del cliente a S3
        const clienteKey = `separated/${processId}/${clienteInfo.cliente.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
        
        await s3.send(new PutObjectCommand({
            Bucket: s3Bucket,
            Key: clienteKey,
            Body: clienteBuffer,
            ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }));
        
        console.log(`  ✅ Archivo subido: ${clienteKey}`);
        
        // Crear ejecución individual
        const stepFunctionArn = process.env.PROCESSOR_STEP_FUNCTION_ARN || 
            'arn:aws:states:us-east-1:975130647458:stateMachine:FactorRedondeo';
        
        const executionInput = {
            s3Bucket: s3Bucket,
            s3Key: clienteKey,
            customConfig: customConfig,
            processId: `${processId}-cliente-${i + 1}`,
            clienteOriginal: processId,
            cliente: clienteInfo.cliente,
            totalRegistros: clienteInfo.totalRegistros,
            tipoProcesso: 'MULTI_CLIENT_INDIVIDUAL',
            clienteIndex: i + 1,
            totalClientes: clientesInfo.length
        };
        
        const params = {
            stateMachineArn: stepFunctionArn,
            name: `multi-client-${processId}-${i + 1}-${Date.now()}`,
            input: JSON.stringify(executionInput)
        };
        
        const result = await stepFunctions.send(new StartExecutionCommand(params));
        
        executions.push({
            cliente: clienteInfo.cliente,
            executionArn: result.executionArn,
            processId: `${processId}-cliente-${i + 1}`,
            s3Key: clienteKey,
            totalRegistros: clienteInfo.totalRegistros
        });
        
        console.log(`  🚀 Ejecución iniciada: ${result.executionArn.split(':').pop()}`);
        
        // Forzar garbage collection si está disponible
        if (global.gc) {
            global.gc();
        }
    }
    
    // Guardar información de las ejecuciones
    const executionsInfo = {
        processIdOriginal: processId,
        totalClientes: clientesInfo.length,
        executions: executions,
        timestamp: new Date().toISOString()
    };
    
    await s3.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: `executions/${processId}/executions-info.json`,
        Body: JSON.stringify(executionsInfo, null, 2),
        ContentType: 'application/json'
    }));
    
    console.log('✅ Todos los clientes procesados exitosamente');
    
    return {
        statusCode: 200,
        tipoProcesso: 'MULTI_CLIENT',
        totalClientes: clientesInfo.length,
        executions: executions,
        processId: processId
    };
}

/**
 * ACTUALIZAR ESTADO EN DYNAMODB
 */
async function updateDynamoDBStatus(processId, status, details, jobsTable) {
    try {
        await dynamoDB.send(new UpdateItemCommand({
            TableName: jobsTable,
            Key: { processId: { S: processId } },
            UpdateExpression: "SET #status = :status, #details = :details, lastUpdate = :time",
            ExpressionAttributeNames: { 
                "#status": "status",
                "#details": "details"
            },
            ExpressionAttributeValues: {
                ":status": { S: status },
                ":details": { S: details },
                ":time": { S: new Date().toISOString() }
            }
        }));
        console.log(`📝 Estado actualizado: ${status} - ${details}`);
    } catch (error) {
        console.error('❌ Error actualizando DynamoDB:', error);
    }
}
