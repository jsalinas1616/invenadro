const AWS = require('aws-sdk');
const XLSX = require('xlsx');

// Configurar AWS SDK
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB();

// VALIDAR VARIABLES DE ENTORNO
const RESULTS_BUCKET = process.env.RESULTS_BUCKET;
const JOBS_TABLE = process.env.JOBS_TABLE;

if (!RESULTS_BUCKET) {
    throw new Error('ERROR: RESULTS_BUCKET no está configurado en variables de entorno');
}
if (!JOBS_TABLE) {
    throw new Error('ERROR: JOBS_TABLE no está configurado en variables de entorno');
}

// ORÍGENES PERMITIDOS PARA CORS - Desde variable de entorno por ambiente
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000']; // Fallback solo para desarrollo local

console.log('CORS - Orígenes permitidos:', ALLOWED_ORIGINS);

// Helper para obtener el origen correcto según el request
const getCorsOrigin = (event) => {
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    console.log(`CORS - Origin recibido: ${origin}, usando: ${allowedOrigin}`);
    return allowedOrigin;
};

exports.handler = async (event) => {
    console.log('Iniciando generación de Excel por cliente');
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // EXTRAER INFORMACIÓN DEL USUARIO AUTENTICADO
        let userInfo = null;
        if (event.requestContext?.authorizer?.claims) {
            const claims = event.requestContext.authorizer.claims;
            userInfo = {
                email: claims.email || claims['cognito:username'],
                username: claims['cognito:username']
            };
            console.log('Usuario descargando Excel:', userInfo.email);
        }
        
        // Extraer parámetros del evento
        const { processId, clienteId } = event.pathParameters || event;
        
        if (!processId || !clienteId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': getCorsOrigin(event),
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                body: JSON.stringify({
                    error: 'Faltan parámetros requeridos: processId y clienteId'
                })
            };
        }

        console.log(`Generando Excel para proceso: ${processId}, cliente: ${clienteId}`);

        // 1. Obtener datos del resultado desde S3
        let resultadoData = await obtenerResultadoDesdeS3(processId);
        
        // DETECTAR SI ES MULTI-CLIENTE
        const isMultiClient = resultadoData?.tipoProcesso === 'MULTI_CLIENT_AGGREGATED' || 
                             resultadoData?.resumenPorCliente;
        
        let datosCliente;
        
        if (isMultiClient) {
            console.log('Detectado proceso MULTI-CLIENTE, buscando resultado individual del cliente...');
            
            // Buscar el resultado individual del cliente en resultados/{clienteId}/{processId}/resultado.json
            const clienteResultado = await buscarResultadoClienteIndividual(processId, clienteId);
            
            if (!clienteResultado || !clienteResultado.datos) {
                throw new Error(`No se encontraron datos individuales para el cliente ${clienteId}`);
            }
            
            datosCliente = clienteResultado.datos;
            resultadoData = clienteResultado; // Usar el resultado individual
            
        } else {
            console.log('Detectado proceso SINGLE-CLIENTE');
            
            if (!resultadoData || !resultadoData.datos) {
                throw new Error('No se encontraron datos del proceso');
            }

            // 2. Filtrar datos específicos del cliente
            datosCliente = filtrarDatosDeCliente(resultadoData.datos, clienteId);
            
            if (datosCliente.length === 0) {
                throw new Error(`No se encontraron datos para el cliente ${clienteId}`);
            }
        }

        console.log(`Encontrados ${datosCliente.length} registros para el cliente ${clienteId}`);

        // 3. Generar Excel específico del cliente
        const excelBuffer = generarExcelCliente(datosCliente, clienteId, resultadoData);
        
        console.log(`Excel buffer generado, tamaño: ${excelBuffer.length} bytes`);
        
        // Convertir a Base64
        const base64String = excelBuffer.toString('base64');
        console.log(`Base64 generado, tamaño: ${base64String.length} chars`);
        console.log(`Primeros 50 caracteres: ${base64String.substring(0, 50)}...`);
        console.log(`Ultimos 20 caracteres: ...${base64String.substring(base64String.length - 20)}`);

        // 4. Retornar el Excel como Base64 en texto plano
        // IMPORTANTE: Content-Type DEBE ser text/plain para que API Gateway NO transforme el body
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': getCorsOrigin(event),
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            body: base64String
        };

    } catch (error) {
        console.error('ERROR: Error generando Excel por cliente:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': getCorsOrigin(event),
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            body: JSON.stringify({
                error: 'Error interno del servidor',
                message: error.message,
                processId: event.pathParameters?.processId,
                clienteId: event.pathParameters?.clienteId
            })
        };
    }
};

/**
 * Obtener datos del resultado desde S3
 */
async function obtenerResultadoDesdeS3(processId) {
    try {
        // Primero obtener el cliente de DynamoDB
        console.log(`Consultando DynamoDB para obtener cliente del proceso: ${processId}`);
        const dynamoParams = {
            TableName: JOBS_TABLE,
            Key: { processId: { S: processId } }
        };
        
        const dynamoResponse = await dynamoDB.getItem(dynamoParams).promise();
        const cliente = dynamoResponse.Item?.cliente?.S || 'multi-cliente';
        
        console.log(`Cliente identificado: ${cliente}`);
        console.log(`Descargando resultado desde S3: resultados/${cliente}/${processId}/resultado.json`);
        
        // Nueva estructura: resultados/{cliente}/{processId}/resultado.json
        const params = {
            Bucket: RESULTS_BUCKET,
            Key: `resultados/${cliente}/${processId}/resultado.json`
        };

        const response = await s3.getObject(params).promise();
        const resultadoData = JSON.parse(response.Body.toString());
        
        console.log(`Resultado descargado: ${resultadoData.datos?.length || 0} registros totales`);
        return resultadoData;
        
    } catch (error) {
        console.error('ERROR: Error descargando resultado desde S3:', error);
        throw new Error(`No se pudo obtener el resultado del proceso ${processId}`);
    }
}

/**
 * Buscar resultado individual de un cliente en proceso multi-cliente
 */
async function buscarResultadoClienteIndividual(processId, clienteId) {
    try {
        // Con la nueva estructura: resultados/{cliente}/{processId}/resultado.json
        // Listar todos los archivos en la carpeta del cliente
        console.log(`Buscando resultado individual para cliente ${clienteId} en proceso ${processId}`);
        
        const listParams = {
            Bucket: RESULTS_BUCKET,
            Prefix: `resultados/${clienteId}/`,
            Delimiter: '/'
        };
        
        console.log(`Listando en: ${listParams.Prefix}`);
        const listResponse = await s3.listObjectsV2(listParams).promise();
        
        // Buscar la carpeta que corresponde al processId relacionado
        let clienteFolder = null;
        
        if (listResponse.CommonPrefixes) {
            for (const prefix of listResponse.CommonPrefixes) {
                const folderName = prefix.Prefix;
                console.log(`Revisando carpeta: ${folderName}`);
                
                // Intentar leer el resultado de esta carpeta
                try {
                    const testKey = `${folderName}resultado.json`;
                    const testResponse = await s3.getObject({
                        Bucket: RESULTS_BUCKET,
                        Key: testKey
                    }).promise();
                    
                    const testData = JSON.parse(testResponse.Body.toString());
                    
                    // Verificar si los datos pertenecen al proceso buscado
                    // (puede ser por customConfig o simplemente retornar el primero encontrado)
                    if (testData.customConfig?.ipp_job_id || testData.processId) {
                        console.log(`Encontrado resultado del cliente ${clienteId} en ${folderName}`);
                        return testData;
                    }
                } catch (err) {
                    console.log(`WARNING: No se pudo leer ${folderName}: ${err.message}`);
                }
            }
        }
        
        throw new Error(`No se encontró resultado individual para el cliente ${clienteId}`);
        
    } catch (error) {
        console.error('ERROR: Error buscando resultado individual del cliente:', error);
        throw error;
    }
}

/**
 * Filtrar datos específicos de un cliente
 */
function filtrarDatosDeCliente(datos, clienteId) {
    console.log(`Filtrando datos para cliente: ${clienteId}`);
    
    // Convertir clienteId a número para comparación
    const clienteIdNum = parseInt(clienteId);
    
    const datosCliente = datos.filter(item => {
        const itemClienteId = item.Cliente || item.cliente;
        return itemClienteId === clienteIdNum || itemClienteId === clienteId;
    });
    
    console.log(`Filtrados ${datosCliente.length} registros para cliente ${clienteId}`);
    return datosCliente;
}

/**
 * Generar archivo Excel específico para un cliente
 */
function generarExcelCliente(datosCliente, clienteId, resultadoCompleto) {
    console.log(`Generando Excel para cliente ${clienteId} con ${datosCliente.length} registros`);
    
    try {
        // Crear un nuevo workbook
        const workbook = XLSX.utils.book_new();
        
        // === HOJA 1: Datos del Cliente ===
        const worksheet = XLSX.utils.json_to_sheet(datosCliente);
        XLSX.utils.book_append_sheet(workbook, worksheet, `Cliente_${clienteId}`);
        
        // === HOJA 2: Resumen del Cliente ===
        const resumenCliente = calcularResumenCliente(datosCliente, clienteId, resultadoCompleto);
        const resumenSheet = XLSX.utils.json_to_sheet([resumenCliente]);
        XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');
        
        // === HOJA 3: Métricas por Producto ===
        const metricasProducto = calcularMetricasPorProducto(datosCliente);
        if (metricasProducto.length > 0) {
            const metricasSheet = XLSX.utils.json_to_sheet(metricasProducto);
            XLSX.utils.book_append_sheet(workbook, metricasSheet, 'Metricas_Productos');
        }
        
        // Generar el buffer del Excel
        const excelBuffer = XLSX.write(workbook, { 
            type: 'buffer', 
            bookType: 'xlsx',
            compression: true 
        });
        
        console.log(`Excel generado exitosamente para cliente ${clienteId}`);
        return excelBuffer;
        
    } catch (error) {
        console.error('ERROR: Error generando Excel:', error);
        throw new Error(`Error generando Excel para cliente ${clienteId}: ${error.message}`);
    }
}

/**
 * Calcular resumen específico del cliente
 */
function calcularResumenCliente(datosCliente, clienteId, resultadoCompleto) {
    const totalRegistros = datosCliente.length;
    const totalImporte = datosCliente.reduce((sum, item) => sum + (parseFloat(item.Importe) || 0), 0);
    const materialesUnicos = new Set(datosCliente.map(item => item.Material)).size;
    const categoriasUnicas = new Set(datosCliente.map(item => item['Categoría de Material'])).size;
    
    // Obtener factor específico (si está disponible por cliente)
    const factorOptimo = resultadoCompleto.factorRedondeoEncontrado || 0;
    
    return {
        'Cliente': clienteId,
        'Total_Registros': totalRegistros,
        'Total_Importe': totalImporte,
        'Materiales_Unicos': materialesUnicos,
        'Categorias_Unicas': categoriasUnicas,
        'Factor_Optimo_Aplicado': factorOptimo,
        'Fecha_Procesamiento': resultadoCompleto.timestamp || new Date().toISOString(),
        'ID_Proceso': resultadoCompleto.processId || 'N/A'
    };
}

/**
 * Calcular métricas por producto para el cliente
 */
function calcularMetricasPorProducto(datosCliente) {
    const productosMap = {};
    
    datosCliente.forEach(item => {
        const material = item.Material;
        if (!productosMap[material]) {
            productosMap[material] = {
                'Material': material,
                'Descripcion': item.Descripción || 'N/A',
                'Categoria': item['Categoría de Material'] || 'N/A',
                'Cantidad_Registros': 0,
                'Importe_Total': 0,
                'Precio_Promedio': 0,
                'Optimo_Premium': item['Óptimo Premium'] || 0
            };
        }
        
        productosMap[material]['Cantidad_Registros']++;
        productosMap[material]['Importe_Total'] += parseFloat(item.Importe) || 0;
    });
    
    // Calcular precio promedio
    Object.values(productosMap).forEach(producto => {
        if (producto['Cantidad_Registros'] > 0) {
            producto['Precio_Promedio'] = producto['Importe_Total'] / producto['Cantidad_Registros'];
        }
    });
    
    return Object.values(productosMap);
}
