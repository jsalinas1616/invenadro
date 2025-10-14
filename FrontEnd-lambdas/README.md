# 🚀 FrontEnd para Sistema de Factor de Redondeo con AWS Lambda

## 📋 Descripción

Este es el frontend adaptado para trabajar con el sistema de **AWS Lambda + Step Functions** para el cálculo de factor de redondeo. Es una versión moderna y asíncrona que reemplaza el sistema anterior basado en App Runner.

## 🏗️ Arquitectura

### **📦 TODOS LOS ARCHIVOS - Upload directo a S3:**
```
FrontEnd → lambda-get-presigned-url → FrontEnd sube a S3 → lambda-initiator → Step Function
```

### **Flujo de Usuario:**
1. **Usuario sube archivo Excel** → Frontend obtiene presigned URL
2. **Frontend pide presigned URL** → lambda-get-presigned-url genera URL temporal S3
3. **Frontend sube DIRECTO a S3** → Sin límite de tamaño
4. **Frontend llama a lambda-initiator** → Con s3Key + s3Bucket (referencia al archivo)
5. **Step Function orquesta el proceso** → Procesamiento paralelo o individual
6. **Frontend hace polling** → Consulta estado en DynamoDB cada 5 segundos
7. **Usuario ve progreso en tiempo real** → Estados: RUNNING → PROCESSING → COMPLETED
8. **Resultado disponible** → Usuario puede descargar Excel consolidado

### **✅ Ventajas del upload directo a S3:**
- **Sin límites de tamaño** - Archivos de cualquier tamaño
- **Más rápido** - Upload directo sin conversión Base64
- **Más simple** - Un solo flujo, menos código
- **Más confiable** - Menos puntos de falla

## 🚀 Características

### **✅ Ventajas del Nuevo Sistema:**
- **Asíncrono**: Usuario no espera, proceso continúa en segundo plano
- **Escalable**: Múltiples archivos se pueden procesar simultáneamente
- **Resiliente**: Reintentos automáticos y manejo de errores
- **Rastreable**: Cada proceso tiene ID único y estado visible
- **Sin timeouts**: Procesamiento de archivos grandes sin límites

### **🔄 Estados del Proceso:**
- `RUNNING` → Proceso iniciado
- `PROCESSING` → Procesando Excel
- `PROCESSED` → Excel procesado
- `CHECKING` → Verificando estado
- `CHECKED` → Estado verificado
- `DOWNLOADING` → Generando resultado
- `COMPLETED` → Proceso completado
- `FAILED` → Error en el proceso

## 🛠️ Configuración Requerida

### **1. Credenciales AWS:**
```bash
# Configurar AWS CLI
aws configure

# O usar variables de entorno
export AWS_ACCESS_KEY_ID=tu_access_key
export AWS_SECRET_ACCESS_KEY=tu_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### **2. Variables de Entorno:**
```bash
# Crear archivo .env en la raíz
REACT_APP_AWS_REGION=us-east-1
REACT_APP_S3_RESULTS_BUCKET=factor-redondeo-lambda-results-dev
REACT_APP_DYNAMODB_TABLE=factor-redondeo-lambda-jobs-dev
```

### **3. Configuración en `src/config.js`:**
```javascript
const config = {
  lambdaInitiatorUrl: 'https://tu-api-gateway-url.amazonaws.com/prod/initiate',
  awsRegion: 'us-east-1',
  s3ResultsBucket: 'factor-redondeo-lambda-results-dev',
  dynamoDBTable: 'factor-redondeo-lambda-jobs-dev',
  s3UploadsBucket: 'factor-redondeo-files',
  stepFunctionArn: 'arn:aws:states:us-east-1:...',
  statusPollingInterval: 5000
};
```

## 📦 Instalación y Ejecución

### **1. Instalar dependencias:**
```bash
npm install
```

### **2. Ejecutar en desarrollo:**
```bash
npm start
```

### **3. Construir para producción:**
```bash
npm run build
```

## 🔧 Dependencias Principales

- **React 18**: Framework principal
- **AWS SDK v2**: Para interactuar con servicios AWS
- **CSS Modules**: Estilos modulares y responsivos

## 📱 Interfaz de Usuario

### **Pantalla Principal:**
- **Header**: Título y estado de credenciales AWS
- **Formulario de Upload**: Selección de archivo Excel
- **Configuración**: Parámetros de factor de redondeo, joroba, días
- **Botón de Procesamiento**: Inicia el flujo asíncrono

### **Estados de Procesamiento:**
- **Uploading**: Subiendo archivo a AWS
- **Processing**: Procesando en segundo plano
- **Completed**: Resultado listo para descarga
- **Failed**: Error en el proceso

### **Información de Debug:**
- Estado actual del proceso
- Process ID único
- Información de credenciales AWS
- Logs de errores

## 🔐 Seguridad y Permisos

### **Permisos AWS Requeridos:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::factor-redondeo-files/*",
        "arn:aws:s3:::factor-redondeo-lambda-results-dev/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/factor-redondeo-lambda-jobs-dev"
    }
  ]
}
```

## 🚨 Solución de Problemas

### **Error: "Credenciales AWS no configuradas"**
```bash
# Solución: Configurar AWS CLI
aws configure
```

### **Error: "CORS policy"**
```bash
# Solución: Configurar CORS en las Lambdas
# O usar API Gateway con CORS habilitado
```

### **Error: "Access Denied"**
```bash
# Solución: Verificar permisos IAM
# Asegurar que el usuario tenga acceso a S3, DynamoDB y Lambda
```

### **Error: "Network Error"**
```bash
# Solución: Verificar conectividad a internet
# Verificar que las Lambdas estén desplegadas y funcionando
```

## 📊 Monitoreo y Logs

### **CloudWatch Logs:**
- Cada Lambda tiene sus propios logs
- Verificar `lambda-initiator`, `lambda-processor`, `lambda-status-checker`, `lambda-download-result`

### **DynamoDB:**
- Tabla `factor-redondeo-lambda-jobs-dev` contiene todos los estados
- Consultar por `processId` para ver progreso

### **S3:**
- Bucket `factor-redondeo-files` para archivos subidos
- Bucket `factor-redondeo-lambda-results-dev` para resultados

## 🔄 Migración desde Sistema Anterior

### **Cambios Principales:**
1. **Sin serverless**: Configuración manual de AWS
2. **Sin App Runner**: Usa Lambda + Step Functions
3. **Sin polling de backend**: Consulta directa a DynamoDB
4. **Sin timeouts**: Procesamiento asíncrono sin límites

### **Ventajas de la Migración:**
- **Mejor escalabilidad**: Múltiples procesos simultáneos
- **Mejor monitoreo**: Estados visibles en tiempo real
- **Mejor manejo de errores**: Reintentos automáticos
- **Mejor rendimiento**: Sin timeouts de 15 minutos

## 🎯 Próximos Pasos

### **1. Configurar API Gateway:**
- Crear API REST para exponer las Lambdas
- Configurar CORS para permitir requests del frontend
- Obtener URL del endpoint para `lambda-initiator`

### **2. Configurar Permisos IAM:**
- Crear usuario IAM con permisos mínimos
- Configurar políticas para S3, DynamoDB y Lambda

### **3. Probar el Flujo Completo:**
- Subir archivo Excel pequeño para pruebas
- Verificar que el proceso complete todos los estados
- Descargar resultado final

### **4. Optimizaciones:**
- Ajustar intervalo de polling según necesidades
- Implementar notificaciones push (opcional)
- Agregar métricas y analytics

---

## 📞 Soporte

Para problemas técnicos o preguntas sobre la implementación:
1. Revisar logs en CloudWatch
2. Verificar estados en DynamoDB
3. Confirmar permisos IAM
4. Verificar configuración de API Gateway

---

*Este frontend está diseñado para ser robusto, escalable y fácil de usar. Cada componente tiene una responsabilidad específica y todo se comunica a través de AWS de manera asíncrona.* 🚀
