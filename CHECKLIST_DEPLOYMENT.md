# Checklist - Deployment y Testing IPP

## CÓDIGO LISTO (Todo creado)

### Backend Lambdas:
- [x] ipp-verificador (valida clientes)
- [x] ipp-iniciador (inicia proceso)
- [x] ipp-status (polling de estado)
- [x] ipp-results (obtener resultados)
- [x] ipp-to-factor-bridge (conecta IPP con Factor)
- [x] factor-completion-callback (sincroniza Factor -> IPP)
- [x] initiator modificado (guarda customConfig completo)

### Frontend:
- [x] IPPPage.js (página principal)
- [x] ClientInputForm (formulario entrada)
- [x] ClientValidationTable (tabla validación)
- [x] ValidationWarningModal (modal confirmación)
- [x] IPPProcessStatus (estados actualizados con flujo real)
- [x] ippService (service layer con nuevos estados)

### Databricks:
- [x] Código Python para agregar al notebook (DATABRICKS_NOTEBOOK_CODE.py)

---

## PASOS PARA DEPLOYMENT

### 1. Backend - Subir a AWS

```bash
cd services/backend
npx serverless deploy --stage jul-dev
```

**Tiempo estimado:** 10-15 minutos

**Se creará:**
- 6 Lambdas nuevas (ipp-* y factor-completion-callback)
- DynamoDB table: ipp-jobs
- S3 buckets: ipp-raw, uploads (ya existe)
- S3 Event Notifications (automáticas)
- IAM Roles y Policies

---

### 2. Databricks - Configurar Job

#### A. Agregar Código al Notebook:

1. Abrir tu notebook existente en Databricks
2. **PRIMERA CELL** (al inicio): Copiar sección "WIDGETS"
3. **ÚLTIMA CELL** (al final): Copiar sección "GUARDAR EN S3 + DYNAMODB"

Archivos a usar:
```
services/backend/functionsIPP/DATABRICKS_NOTEBOOK_CODE.py
```

#### B. Configurar Secrets en Databricks:

```bash
# Crear scope (una vez)
databricks secrets create-scope --scope aws-creds

# Agregar credenciales AWS
databricks secrets put --scope aws-creds --key access-key
databricks secrets put --scope aws-creds --key secret-key
```

O desde UI:
- Settings -> Secrets -> Create Scope
- Scope name: `aws-creds`
- Keys: `access-key`, `secret-key`

#### C. Crear/Actualizar Job en Databricks:

1. Jobs -> Create Job
2. Task name: "IPP Tradicional + Normalizador"
3. Type: Notebook
4. Notebook path: (tu notebook con el código agregado)
5. Cluster: (tu cluster existente)
6. Parameters: (se pasan automáticamente desde Lambda)

**IMPORTANTE:** Copiar el Job ID del job creado.

---

### 3. GitHub Secrets - Agregar Job ID

```bash
# En tu repositorio GitHub:
Settings -> Secrets and variables -> Actions -> New repository secret

Name: DATABRICKS_IPP_JOB1_ID
Value: (el Job ID que copiaste de Databricks)
```

---

### 4. Frontend - Subir Cambios

```bash
cd FrontEnd-lambdas
git add .
git commit -m "feat: actualizar estados IPP con flujo real"
git push origin main
```

**GitHub Actions deployará automáticamente.**

---

## TESTING - FLUJO COMPLETO

### Test 1: Validación de Clientes

```bash
# 1. Ir al frontend: https://tu-dominio.com/ipp
# 2. Ingresar clientes válidos: 7051602, 7051603
# 3. Click "Validar Clientes"
# 4. Verificar tabla con resultados (válidos/inválidos)
```

**Esperado:**
- Tabla muestra clientes válidos en verde
- Clientes inválidos en rojo
- Botón "Continuar" habilitado

---

### Test 2: Inicio del Proceso IPP

```bash
# 1. Click "Continuar con Clientes Válidos"
# 2. Verificar que aparece barra de progreso
# 3. Status debe ser: "validating" -> "job1_running"
```

**Esperado:**
- Progress bar animada
- Status: "Databricks: Procesando IPP Tradicional..."
- Link a Databricks visible

---

### Test 3: Databricks Job 1

```bash
# 1. Click en "Ver Job en Databricks"
# 2. Verificar que el job está corriendo
# 3. Ver logs en tiempo real
```

**Esperado:**
- Job corriendo en Databricks
- Logs muestran: "PARÁMETROS DEL JOB IPP"
- Al final: "PROCESO IPP COMPLETADO EXITOSAMENTE"

---

### Test 4: Bridge Automático

```bash
# Verificar S3:
aws s3 ls s3://invenadro-backend-jul-dev-ipp-raw/resultados/{job_id}/

# Deberías ver:
# - metadata.json
# - clientes/cliente_7051602.json
# - clientes/cliente_7051603.json

# Verificar logs del Bridge:
npx serverless logs -f ippToFactorBridge --stage jul-dev --tail
```

**Esperado:**
- S3 tiene metadata.json
- Lambda bridge se ejecuta automáticamente
- Logs muestran: "Procesando cliente X de Y"

---

### Test 5: Factor de Redondeo

```bash
# Verificar logs del initiator:
npx serverless logs -f initiator --stage jul-dev --tail

# Deberías ver:
# - "customConfig: {source: IPP, ipp_job_id: ipp_xxx, cliente: 7051602}"
```

**Esperado:**
- Initiator se invoca para cada cliente
- customConfig incluye source=IPP
- Step Function ejecuta processor

---

### Test 6: Callback Automático

```bash
# Verificar logs del callback:
npx serverless logs -f factorCompletionCallback --stage jul-dev --tail

# Deberías ver:
# - "Viene de IPP: ipp_job_id: ipp_xxx"
# - "Cliente 7051602 registrado en IPP job"
```

**Esperado:**
- Callback se dispara cuando Factor termina
- DynamoDB IPP se actualiza con factor_results
- Status cambia a "factor_processing"

---

### Test 7: Frontend Detecta Completado

```bash
# En el frontend:
# 1. Progress bar llega a 100%
# 2. Status: "factor_completed"
# 3. Mensaje: "Proceso completado exitosamente"
```

**Esperado:**
- Status final: "factor_completed"
- Timeline muestra todos los pasos en verde
- Alert verde con mensaje de éxito

---

## VERIFICACIÓN FINAL

### DynamoDB IPP:

```bash
aws dynamodb get-item \
  --table-name invenadro-backend-jul-dev-ipp-jobs \
  --key '{"job_id":{"S":"ipp_abc123"}}'
```

**Esperado:**
```json
{
  "job_id": "ipp_abc123",
  "status": "factor_completed",
  "total_clientes": 2,
  "factor_results": {
    "7051602": {
      "process_id": "uuid-111",
      "status": "COMPLETED",
      "result_path": "s3://results/resultados/uuid-111/resultado.json"
    },
    "7051603": {
      "process_id": "uuid-222",
      "status": "COMPLETED",
      "result_path": "s3://results/resultados/uuid-222/resultado.json"
    }
  }
}
```

---

### DynamoDB Factor:

```bash
aws dynamodb get-item \
  --table-name invenadro-backend-jul-dev-jobs \
  --key '{"processId":{"S":"uuid-111"}}'
```

**Esperado:**
```json
{
  "processId": "uuid-111",
  "status": "COMPLETED",
  "customConfig": "{\"source\":\"IPP\",\"ipp_job_id\":\"ipp_abc123\",\"cliente\":\"7051602\",...}"
}
```

---

## TROUBLESHOOTING

### Problema: Frontend no inicia proceso

**Verificar:**
```bash
# API Gateway
curl -X POST https://tu-api.com/ipp/start \
  -H "Authorization: Bearer TOKEN" \
  -d '{"clients":["7051602"]}'
```

---

### Problema: Databricks no guarda en S3

**Verificar:**
```python
# En notebook Databricks, test manual:
dbutils.secrets.get(scope="aws-creds", key="access-key")
# No debe dar error
```

---

### Problema: Bridge no se ejecuta

**Verificar:**
```bash
# S3 Event Notification
aws s3api get-bucket-notification-configuration \
  --bucket invenadro-backend-jul-dev-ipp-raw

# Debe mostrar LambdaFunctionConfiguration
```

---

### Problema: Callback no actualiza IPP

**Verificar:**
```bash
# Logs del callback
npx serverless logs -f factorCompletionCallback --stage jul-dev

# Buscar: "Proceso normal del Factor (sin IPP)"
# Si aparece, verificar que customConfig.source === 'IPP'
```

---

## RESUMEN

### Orden de Ejecución:

1. Frontend → Valida clientes
2. Frontend → Inicia proceso
3. Lambda ipp-iniciador → Trigger Databricks
4. Databricks → Procesa + Guarda S3
5. S3 Event → Trigger ipp-to-factor-bridge
6. Bridge → Transforma + Invoca initiator
7. Factor → Procesa cada cliente
8. S3 Event → Trigger factor-completion-callback
9. Callback → Actualiza DynamoDB IPP
10. Frontend (polling) → Detecta completado

### Estados en Frontend:

```
validating (5%)
  ↓
job1_running (25%)
  ↓
completed (50%)
  ↓
factor_initiated (60%)
  ↓
factor_processing (80%)
  ↓
factor_completed (100%)
```

---

## SIGUIENTE PASO

```bash
# Deploy backend
cd services/backend
npx serverless deploy --stage jul-dev
```

