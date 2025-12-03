# Documentación de Roles IAM - Proyecto Invenadro

**Ambiente:** nadro-prod  
**Cuenta AWS:** 767398004339  
**Fecha de Documentación:** 2025-12-03

---

## Resumen Ejecutivo

Este documento describe todos los roles IAM que se crean automáticamente durante el despliegue del proyecto Invenadro en el ambiente de producción. Los roles son creados por Serverless Framework y asignados a los servicios AWS correspondientes para permitir su ejecución con los permisos mínimos necesarios.

**Total de Roles:** 13 roles
- 11 roles para funciones Lambda
- 1 rol para Step Functions
- 1 rol para API Gateway

---

## 1. Roles para Funciones Lambda

### 1.1. Rol: `invenadro-backend-nadro-prod-initiator-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-initiator`

**Descripción de Funcionalidad:**
Función Lambda que inicia el flujo de procesamiento de optimización de inventarios. Recibe solicitudes del frontend, valida los datos, crea un registro de trabajo en DynamoDB y dispara la Step Function que orquesta todo el proceso.

**Permisos:**
- `states:StartExecution` - Iniciar la ejecución de Step Functions
- `dynamodb:PutItem` - Crear registros de trabajo en la tabla de jobs
- `dynamodb:GetItem` - Leer registros de trabajo
- `dynamodb:UpdateItem` - Actualizar estado de trabajos
- `s3:GetObject` - Leer archivos Excel subidos por usuarios
- `s3:PutObject` - Escribir archivos temporales en S3
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Endpoint API Gateway:** `POST /calcular-redondeo`

---

### 1.2. Rol: `invenadro-backend-nadro-prod-get-presigned-url-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-get-presigned-url`

**Descripción de Funcionalidad:**
Genera URLs pre-firmadas (presigned URLs) de S3 para que el frontend pueda subir archivos Excel directamente al bucket de uploads sin exponer credenciales.

**Permisos:**
- `s3:PutObject` - Generar URLs para subir archivos al bucket de uploads
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Endpoint API Gateway:** `POST /get-presigned-url`

---

### 1.3. Rol: `invenadro-backend-nadro-prod-status-checker-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-status-checker`

**Descripción de Funcionalidad:**
Consulta el estado de un proceso de optimización en curso. Lee el estado desde DynamoDB y Step Functions para proporcionar información actualizada al frontend sobre el progreso del cálculo.

**Permisos:**
- `dynamodb:GetItem` - Leer estado del trabajo desde DynamoDB
- `dynamodb:UpdateItem` - Actualizar estado si es necesario
- `states:DescribeExecution` - Consultar estado de ejecución en Step Functions
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Endpoint API Gateway:** `GET /status/{processId}`

---

### 1.4. Rol: `invenadro-backend-nadro-prod-client-separator-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-client-separator`

**Descripción de Funcionalidad:**
Separa el archivo Excel de entrada por cliente (mostrador). Lee el archivo consolidado del bucket de uploads, lo divide en archivos individuales por cliente y los guarda en el bucket de resultados. Esta función es invocada por Step Functions, no directamente por API Gateway.

**Permisos:**
- `s3:GetObject` - Leer archivo Excel consolidado del bucket de uploads
- `s3:PutObject` - Escribir archivos separados por cliente en el bucket de resultados
- `dynamodb:UpdateItem` - Actualizar progreso del trabajo en DynamoDB
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Invocado por:** Step Functions (no tiene endpoint HTTP directo)

---

### 1.5. Rol: `invenadro-backend-nadro-prod-processor-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-processor`

**Descripción de Funcionalidad:**
Función principal que ejecuta el algoritmo de optimización de inventarios (Método de Brent) para cada cliente. Procesa los datos de entrada, calcula factores de redondeo óptimos, y genera los resultados optimizados. También se conecta a Databricks para validar configuraciones.

**Permisos:**
- `s3:GetObject` - Leer archivos de entrada del bucket de uploads
- `s3:PutObject` - Escribir resultados procesados en el bucket de resultados
- `ssm:GetParameters` - Leer credenciales de Databricks desde Systems Manager Parameter Store
- `kms:Decrypt` - Desencriptar variables de entorno encriptadas con KMS
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Invocado por:** Step Functions (no tiene endpoint HTTP directo)

---

### 1.6. Rol: `invenadro-backend-nadro-prod-client-aggregator-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-client-aggregator`

**Descripción de Funcionalidad:**
Consolida los resultados procesados de todos los clientes en un archivo Excel final. Lee los archivos individuales del bucket de resultados, los combina y genera el reporte consolidado.

**Permisos:**
- `s3:GetObject` - Leer archivos de resultados individuales del bucket de resultados
- `s3:PutObject` - Escribir archivo Excel consolidado final
- `dynamodb:UpdateItem` - Actualizar estado final del trabajo en DynamoDB
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Invocado por:** Step Functions (no tiene endpoint HTTP directo)

---

### 1.7. Rol: `invenadro-backend-nadro-prod-download-result-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-download-result`

**Descripción de Funcionalidad:**
Genera URLs pre-firmadas para descargar los archivos Excel de resultados. Valida que el usuario tenga acceso al proceso y genera URLs temporales seguras para descargar los archivos desde S3.

**Permisos:**
- `s3:GetObject` - Generar URLs para descargar archivos del bucket de resultados
- `dynamodb:GetItem` - Validar que el proceso existe y está completo
- `dynamodb:UpdateItem` - Registrar descargas si es necesario
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Endpoint API Gateway:** `GET /download/{processId}`

---

### 1.8. Rol: `invenadro-backend-nadro-prod-excel-generator-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-excel-generator`

**Descripción de Funcionalidad:**
Genera archivos Excel personalizados por cliente a partir de los resultados procesados. Permite descargar reportes individuales por mostrador.

**Permisos:**
- `s3:GetObject` - Leer archivos de resultados del bucket de resultados
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Endpoint API Gateway:** `GET /excel/{processId}/{clienteId}`

---

### 1.9. Rol: `invenadro-backend-nadro-prod-create-config-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-create-config`

**Descripción de Funcionalidad:**
Crea nuevas configuraciones de mostradores en la tabla de Databricks. Permite al frontend registrar parámetros de optimización por mostrador (presupuesto, tolerancias, incluir/excluir refrigerados, etc.).

**Permisos:**
- Acceso a Databricks (mediante credenciales en variables de entorno encriptadas)
- `kms:Decrypt` - Desencriptar credenciales de Databricks
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Endpoint API Gateway:** `POST /configuraciones`

---

### 1.10. Rol: `invenadro-backend-nadro-prod-read-config-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-read-config`

**Descripción de Funcionalidad:**
Lee configuraciones de mostradores desde Databricks. Permite consultar todas las configuraciones o una específica por ID de mostrador.

**Permisos:**
- Acceso a Databricks (mediante credenciales en variables de entorno encriptadas)
- `kms:Decrypt` - Desencriptar credenciales de Databricks
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Endpoint API Gateway:** 
- `GET /configuraciones` (lista todas)
- `GET /configuraciones/{mostradorId}` (una específica)

---

### 1.11. Rol: `invenadro-backend-nadro-prod-update-config-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-update-config`

**Descripción de Funcionalidad:**
Actualiza configuraciones existentes de mostradores en Databricks. Permite modificar parámetros de optimización sin eliminar y recrear la configuración.

**Permisos:**
- Acceso a Databricks (mediante credenciales en variables de entorno encriptadas)
- `kms:Decrypt` - Desencriptar credenciales de Databricks
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Endpoint API Gateway:** `PUT /configuraciones/{mostradorId}`

---

### 1.12. Rol: `invenadro-backend-nadro-prod-delete-config-lambdaRole`

**Asignado a:** Lambda Function `invenadro-backend-nadro-prod-delete-config`

**Descripción de Funcionalidad:**
Elimina configuraciones de mostradores de la tabla de Databricks. Permite remover configuraciones que ya no se utilizan.

**Permisos:**
- Acceso a Databricks (mediante credenciales en variables de entorno encriptadas)
- `kms:Decrypt` - Desencriptar credenciales de Databricks
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs en CloudWatch

**Endpoint API Gateway:** `DELETE /configuraciones/{mostradorId}`

---

## 2. Rol para Step Functions

### 2.1. Rol: `invenadro-backend-nadro-prod-stepfunction-role`

**Asignado a:** Step Functions State Machine `invenadro-backend-nadro-prod-StateMachine`

**Descripción de Funcionalidad:**
Rol que permite a Step Functions orquestar el flujo completo de procesamiento de optimización de inventarios. Step Functions invoca las funciones Lambda en el orden correcto, maneja errores, reintentos y paralelización.

**Permisos:**
- `lambda:InvokeFunction` - Invocar las siguientes funciones Lambda:
  - `invenadro-backend-nadro-prod-initiator`
  - `invenadro-backend-nadro-prod-client-separator`
  - `invenadro-backend-nadro-prod-processor`
  - `invenadro-backend-nadro-prod-status-checker`
  - `invenadro-backend-nadro-prod-client-aggregator`
  - `invenadro-backend-nadro-prod-download-result`
- `states:StartExecution` - Iniciar sub-ejecuciones de Step Functions (si hay anidamiento)
- `states:DescribeExecution` - Consultar estado de ejecuciones
- `states:StopExecution` - Detener ejecuciones si es necesario
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` - Escribir logs de ejecución en CloudWatch

**Flujo Orquestado:**
1. Separar archivo por clientes (client-separator)
2. Procesar cada cliente en paralelo (processor)
3. Consolidar resultados (client-aggregator)
4. Actualizar estado final

---

## 3. Rol para API Gateway

### 3.1. Rol: `serverlessApiGatewayCloudWatchRole`

**Asignado a:** API Gateway REST API `invenadro-backend-nadro-prod`

**Descripción de Funcionalidad:**
Rol que permite a API Gateway escribir logs de todas las peticiones HTTP (requests/responses) en CloudWatch Logs. Este rol es compartido entre todos los ambientes en la misma cuenta AWS (nombre estático).

**Permisos:**
- `logs:CreateLogGroup` - Crear grupos de logs si no existen
- `logs:CreateLogStream` - Crear streams de logs
- `logs:PutLogEvents` - Escribir eventos de logs
- `logs:DescribeLogStreams` - Consultar streams existentes
- `logs:DescribeLogGroups` - Consultar grupos de logs

**Política Utilizada:** `AmazonAPIGatewayPushToCloudWatchLogs` (AWS Managed Policy)

**Logs Generados:**
- Todas las peticiones HTTP entrantes
- Respuestas HTTP salientes
- Errores y códigos de estado
- Tiempos de respuesta
- Información de autenticación (Cognito)

---

## Tabla Resumen de Roles

| # | Nombre del Rol | Asignado a | Tipo | Endpoint HTTP |
|---|----------------|------------|------|---------------|
| 1 | `invenadro-backend-nadro-prod-initiator-lambdaRole` | Lambda: initiator | Lambda | `POST /calcular-redondeo` |
| 2 | `invenadro-backend-nadro-prod-get-presigned-url-lambdaRole` | Lambda: get-presigned-url | Lambda | `POST /get-presigned-url` |
| 3 | `invenadro-backend-nadro-prod-status-checker-lambdaRole` | Lambda: status-checker | Lambda | `GET /status/{processId}` |
| 4 | `invenadro-backend-nadro-prod-client-separator-lambdaRole` | Lambda: client-separator | Lambda | N/A (Step Functions) |
| 5 | `invenadro-backend-nadro-prod-processor-lambdaRole` | Lambda: processor | Lambda | N/A (Step Functions) |
| 6 | `invenadro-backend-nadro-prod-client-aggregator-lambdaRole` | Lambda: client-aggregator | Lambda | N/A (Step Functions) |
| 7 | `invenadro-backend-nadro-prod-download-result-lambdaRole` | Lambda: download-result | Lambda | `GET /download/{processId}` |
| 8 | `invenadro-backend-nadro-prod-excel-generator-lambdaRole` | Lambda: excel-generator | Lambda | `GET /excel/{processId}/{clienteId}` |
| 9 | `invenadro-backend-nadro-prod-create-config-lambdaRole` | Lambda: create-config | Lambda | `POST /configuraciones` |
| 10 | `invenadro-backend-nadro-prod-read-config-lambdaRole` | Lambda: read-config | Lambda | `GET /configuraciones` |
| 11 | `invenadro-backend-nadro-prod-update-config-lambdaRole` | Lambda: update-config | Lambda | `PUT /configuraciones/{mostradorId}` |
| 12 | `invenadro-backend-nadro-prod-delete-config-lambdaRole` | Lambda: delete-config | Lambda | `DELETE /configuraciones/{mostradorId}` |
| 13 | `invenadro-backend-nadro-prod-stepfunction-role` | Step Functions: StateMachine | Step Functions | N/A |
| 14 | `serverlessApiGatewayCloudWatchRole` | API Gateway: REST API | API Gateway | N/A (Logs) |

**Total:** 14 roles

---

## Principios de Seguridad Aplicados

1. **Principio de Mínimo Privilegio:** Cada rol tiene solo los permisos necesarios para su función específica
2. **Separación de Responsabilidades:** Roles diferentes para cada servicio y función
3. **Resource-based Restrictions:** Todos los permisos están limitados a recursos específicos con ARNs completos
4. **Service-based Trust:** Cada rol solo puede ser asumido por el servicio AWS correspondiente (lambda.amazonaws.com, states.amazonaws.com, apigateway.amazonaws.com)
5. **Encriptación:** Variables de entorno sensibles (credenciales Databricks) están encriptadas con KMS
6. **Auditoría:** Todos los accesos quedan registrados en CloudTrail y CloudWatch Logs

---

## Notas Técnicas

- **Creación Automática:** Todos los roles son creados automáticamente por Serverless Framework durante el despliegue
- **Plugin Utilizado:** `serverless-iam-roles-per-function` (línea 7 de serverless.yml)
- **Naming Convention:** `{service}-{stage}-{functionName}-{region}-lambdaRole`
- **Región:** mx-central-1
- **Runtime:** Node.js 20.x
- **Encriptación:** Variables de entorno encriptadas con KMS customer-managed key

---

## Contacto

Para preguntas sobre esta documentación o solicitudes de cambios en los permisos, contactar al equipo de desarrollo del proyecto Invenadro.

**Última Actualización:** 2025-12-03

