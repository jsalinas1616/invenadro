# 🏗️ Arquitectura - Invenadro

## 📊 Diagrama General

```
┌──────────────────────────────────────────────────────────────┐
│                         USUARIO                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                           │
│  - Autenticación con Cognito                                 │
│  - Upload de archivos                                        │
│  - Monitoreo de progreso                                     │
│  - Descarga de resultados                                    │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              API GATEWAY + COGNITO AUTHORIZER                 │
│  Endpoints:                                                   │
│  - POST   /calcular-redondeo                                 │
│  - GET    /calcular-redondeo/status/{processId}             │
│  - GET    /calcular-redondeo/download/{processId}           │
│  - GET    /excel/{processId}/{clienteId}                    │
│  - POST   /get-presigned-url                                 │
└────────────────────────┬─────────────────────────────────────┘
                         │
        ┌────────────────┴─────────────────┐
        │                                  │
        ▼                                  ▼
┌──────────────────┐              ┌──────────────────┐
│  Lambda Initiator│              │  Lambda Get URL  │
└────────┬─────────┘              └──────────────────┘
         │
         │ Inicia Step Function
         ▼
┌──────────────────────────────────────────────────────────────┐
│                    STEP FUNCTIONS                             │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. ValidarEntrada                                  │    │
│  └─────────────────┬───────────────────────────────────┘    │
│                    │                                          │
│  ┌─────────────────▼───────────────────────────────────┐    │
│  │  2. AnalizarYSepararClientes                        │    │
│  │     (Lambda: Client Separator)                      │    │
│  └─────────────────┬───────────────────────────────────┘    │
│                    │                                          │
│         ┌──────────┴──────────┐                             │
│         │                     │                              │
│  ┌──────▼──────┐       ┌─────▼──────┐                      │
│  │ SINGLE      │       │ MULTI      │                       │
│  │ CLIENT      │       │ CLIENT     │                       │
│  │             │       │            │                        │
│  │ 3.Procesar  │       │ 3.Esperar │                        │
│  │   Único     │       │ 4.Monitor │                        │
│  │             │       │ 5.Agregar │                        │
│  └──────┬──────┘       └─────┬──────┘                      │
│         │                     │                              │
│         └──────────┬──────────┘                             │
│                    │                                          │
│  ┌─────────────────▼───────────────────────────────────┐    │
│  │  6. GenerarResultadoFinal                           │    │
│  │     (Lambda: Download Result)                       │    │
│  └─────────────────┬───────────────────────────────────┘    │
│                    │                                          │
│  ┌─────────────────▼───────────────────────────────────┐    │
│  │  7. ProcesoCompletado ✅                            │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                  ▼
┌──────────────────┐              ┌──────────────────┐
│   S3 Buckets     │              │   DynamoDB       │
│  - uploads       │              │  - jobs table    │
│  - results       │              │  (tracking)      │
└──────────────────┘              └──────────────────┘
```

---

## 🔧 Componentes Principales

### 1. **Frontend (React)**
- **Ubicación:** `FrontEnd-lambdas/`
- **Tecnología:** React + AWS Amplify
- **Funcionalidad:**
  - Registro/Login con Cognito
  - Upload de archivos Excel
  - Monitoreo de progreso en tiempo real
  - Descarga de resultados procesados

### 2. **API Gateway**
- **Tipo:** REST API
- **Autenticación:** Cognito User Pools
- **CORS:** Habilitado
- **Endpoints:** 5 rutas principales
- **Rate Limiting:** Configurable por stage

### 3. **Lambda Functions (8 funciones)**

#### **Initiator**
- **Handler:** `functions/initiator/index.handler`
- **Timeout:** 300s
- **Memory:** 512 MB
- **Rol:** Inicia Step Function, escribe en DynamoDB

#### **Client Separator**
- **Handler:** `functions/client-separator/index.handler`
- **Timeout:** 900s
- **Memory:** 1024 MB
- **Rol:** Analiza archivo, separa por cliente

#### **Processor**
- **Handler:** `functions/processor/index.handler`
- **Timeout:** 900s
- **Memory:** 3008 MB (máximo)
- **Rol:** Procesa cálculos de redondeo

#### **Status Checker**
- **Handler:** `functions/status-checker/index.handler`
- **Timeout:** 60s
- **Memory:** 256 MB
- **Rol:** Monitorea estado de procesos

#### **Client Aggregator**
- **Handler:** `functions/client-aggregator/index.handler`
- **Timeout:** 600s
- **Memory:** 2048 MB
- **Rol:** Combina resultados de múltiples clientes

#### **Download Result**
- **Handler:** `functions/download-result/index.handler`
- **Timeout:** 300s
- **Memory:** 512 MB
- **Rol:** Genera URLs de descarga

#### **Excel Generator**
- **Handler:** `functions/excel-generator/index.handler`
- **Timeout:** 300s
- **Memory:** 1024 MB
- **Rol:** Genera archivos Excel individuales

#### **Get Presigned URL**
- **Handler:** `functions/get-presigned-url/index.handler`
- **Timeout:** 60s
- **Memory:** 256 MB
- **Rol:** Genera URLs firmadas para upload

### 4. **Step Functions**
- **State Machine:** `ProcessingStateMachine`
- **Definición:** `stepfunctions/processing.yml`
- **Estados:** 22 estados
- **Tipos de flujo:**
  - **Single Client:** Procesamiento directo
  - **Multi Client:** Procesamiento paralelo + agregación

**Estados principales:**
1. ValidarEntrada
2. AnalizarYSepararClientes
3. DecidirFlujo
4. ProcesarClienteUnico / EsperarProcesosMultiples
5. GenerarResultadoFinal
6. ProcesoCompletado

### 5. **DynamoDB**
- **Tabla:** `invenadro-simplicidad-{stage}-jobs`
- **Partition Key:** `processId` (String)
- **Billing Mode:** PAY_PER_REQUEST
- **Features:**
  - Streams habilitados
  - Point-in-time recovery
  - TTL (opcional)

**Schema del item:**
```json
{
  "processId": "uuid-v4",
  "status": "PROCESSING | COMPLETED | FAILED",
  "fileName": "archivo.xlsx",
  "uploadTime": "2024-01-01T12:00:00Z",
  "processingTime": 45000,
  "clientCount": 5,
  "resultS3Key": "results/uuid-v4/output.xlsx",
  "errors": []
}
```

### 6. **S3 Buckets**

#### **Uploads Bucket**
- **Nombre:** `invenadro-simplicidad-{stage}-uploads`
- **Lifecycle:** Eliminar archivos después de 7 días
- **CORS:** Habilitado para uploads directos
- **Acceso:** Privado (presigned URLs)

#### **Results Bucket**
- **Nombre:** `invenadro-simplicidad-{stage}-results`
- **Lifecycle:** Eliminar resultados después de 30 días
- **CORS:** Habilitado para downloads
- **Acceso:** Privado (presigned URLs)

### 7. **Cognito User Pool**
- **Nombre:** `invenadro-simplicidad-{stage}-users`
- **Attributes:** email (required), name
- **Auth Flows:** USER_PASSWORD_AUTH, USER_SRP_AUTH
- **Password Policy:** Min 8 chars, uppercase, lowercase, numbers
- **MFA:** Optional (TOTP)

---

## 🔄 Flujos de Procesamiento

### **Flujo 1: Single Client**
```
1. Usuario sube archivo
2. Initiator crea job en DynamoDB
3. Initiator inicia Step Function
4. Step Function valida entrada
5. Client Separator analiza → detecta 1 cliente
6. Processor procesa directamente
7. Status Checker verifica resultado
8. Download Result prepara archivo final
9. Usuario descarga resultado
```

**Tiempo:** ~30-60 segundos

### **Flujo 2: Multi Client**
```
1. Usuario sube archivo
2. Initiator crea job en DynamoDB
3. Initiator inicia Step Function
4. Step Function valida entrada
5. Client Separator analiza → detecta N clientes
6. Client Separator separa en N archivos
7. Step Function espera (30s)
8. Status Checker monitorea N procesos paralelos
9. Client Aggregator combina resultados
10. Download Result prepara archivo final
11. Usuario descarga resultado
```

**Tiempo:** ~2-5 minutos (depende de N)

---

## 🔐 Seguridad

### **IAM Roles**
- **Lambda Execution Role:** Permisos mínimos necesarios por función
- **Step Function Role:** Permisos para invocar Lambdas
- **Least Privilege:** Cada función solo tiene acceso a los recursos que necesita

### **Encryption**
- **S3:** Server-side encryption (SSE-S3)
- **DynamoDB:** Encryption at rest habilitado
- **API Gateway:** HTTPS only

### **Authentication**
- **Cognito:** JWT tokens
- **API Gateway Authorizer:** Valida tokens en cada request
- **Token Expiry:** 60 minutos

---

## 📈 Escalabilidad

### **Lambda Concurrency**
- **Reserved:** No configurado (usa shared pool)
- **Auto-scaling:** Automático por AWS
- **Límites:** 1000 ejecuciones concurrentes por defecto

### **DynamoDB**
- **On-Demand:** Escala automáticamente
- **No throttling:** Ajusta capacity según demanda

### **API Gateway**
- **Rate Limit:** 10,000 requests/segundo
- **Burst:** 5,000 requests

---

## 💰 Optimización de Costos

### **Estrategias:**
1. **Lambda Memory:** Ajustado por función (256MB - 3008MB)
2. **DynamoDB:** On-Demand (más barato para tráfico variable)
3. **S3 Lifecycle:** Auto-delete de archivos viejos
4. **CloudWatch Logs:** Retention de 7 días

### **Costo estimado DEV:**
- Lambda: $2/mes
- DynamoDB: $0 (free tier)
- S3: $1/mes
- API Gateway: $1/mes
- **Total: ~$5/mes**

---

## 🔍 Monitoreo

### **CloudWatch Metrics**
- Lambda duration, errors, invocations
- Step Function executions, failures
- API Gateway 4xx, 5xx errors
- DynamoDB consumed capacity

### **Alarms recomendadas:**
- Lambda errors > 5 en 5 minutos
- Step Function failures > 2 en 10 minutos
- API Gateway 5xx > 10 en 5 minutos

---

## 🚀 Mejoras Futuras

- [ ] CloudFront para frontend
- [ ] SQS para procesamiento asíncrono
- [ ] EventBridge para eventos
- [ ] X-Ray para tracing distribuido
- [ ] WAF para seguridad API Gateway
- [ ] Backup automatizado de DynamoDB

---

**Última actualización:** Noviembre 2024
**Versión de arquitectura:** 2.0 (Serverless Framework)
