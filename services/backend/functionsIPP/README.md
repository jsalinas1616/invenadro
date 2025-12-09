# Módulo IPP (Inventario de Precisión Predictiva) - Backend

## 📁 Estructura

```
functionsIPP/
├── ipp-verificador/           # Lambda 1: Validar mostradores
│   ├── index.js
│   └── package.json
├── ipp-iniciador/             # Lambda 2: Trigger Job 1
│   ├── index.js
│   └── package.json
├── ipp-status/                # Lambda 3: Polling de estado
│   ├── index.js
│   └── package.json
├── ipp-results/               # Lambda 4: Obtener resultados
│   ├── index.js
│   └── package.json
└── README.md                  # Este archivo
```

---

## 🎯 Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO IPP COMPLETO                        │
└─────────────────────────────────────────────────────────────┘

1. VALIDACIÓN (ipp-verificador)
   Frontend → POST /ipp/validate-clients
   ↓ Body: { "mostradores": ["7051602", "7051603"] }
   ↓
   Query Databricks: SELECT mostrador FROM configuraciones WHERE mostrador IN (...)
   ↓
   Response: { validClients: [...], invalidClients: [...] }

2. INICIO (ipp-iniciador)
   Frontend → POST /ipp/start
   ↓ Body: { "mostradores": ["7051602", "7051603"] }
   ↓
   a) Generar job_id único
   b) Guardar en DynamoDB (status: JOB1_RUNNING)
   c) Trigger Databricks Job 1 (Normalizador)
   ↓
   Response: { job_id, status: "JOB1_RUNNING" }

3. POLLING (ipp-status)
   Frontend → GET /ipp/status/{job_id} (cada 5 segundos)
   ↓
   a) Consultar DynamoDB
   b) Si JOB1_RUNNING → Consultar estado en Databricks
   c) Actualizar estado si cambió
   ↓
   Response: { status, progress, message }
   
   Estados posibles:
   - JOB1_RUNNING (25%)
   - JOB1_DONE (40%)
   - PROCESSING (60%)
   - JOB2_RUNNING (80%)
   - COMPLETED (100%)
   - FAILED

4. RESULTADOS (ipp-results)
   Frontend → GET /ipp/results/{job_id}
   ↓
   Verificar status === COMPLETED
   ↓
   Response: { job_id, mostradores, databricks_info, s3_locations }
```

---

## 🔧 Lambda 1: ipp-verificador

### Responsabilidades:
- Validar lista de mostradores contra Databricks
- Soportar **modo manual** (desde Frontend) y **modo automático** (desde EventBridge)

### Modos de Operación:

#### Modo Manual (desde Frontend):
```json
POST /ipp/validate-clients
{
  "mostradores": ["7051602", "7051603", "7051604"]
}
```

#### Modo Automático (desde EventBridge/Cron):
```json
POST /ipp/validate-clients
{}  // Sin body → procesa TODOS los mostradores activos
```

### Response:
```json
{
  "status": "partial_valid",
  "message": "2 de 3 mostradores tienen configuración",
  "mode": "manual",
  "validClients": ["7051602", "7051603"],
  "invalidClients": ["7051604"],
  "total": 3,
  "validated": 2
}
```

### Query Databricks:
```sql
-- Si modo manual (con lista):
SELECT mostrador 
FROM invenadro.bronze.invenadro_input_automatizacion
WHERE mostrador IN (7051602, 7051603, 7051604)

-- Si modo automático (todos):
SELECT DISTINCT mostrador 
FROM invenadro.bronze.invenadro_input_automatizacion
WHERE mostrador IS NOT NULL
```

---

## 🚀 Lambda 2: ipp-iniciador

### Responsabilidades:
- Generar job_id único
- Guardar estado inicial en DynamoDB
- Trigger Databricks Job 1

### Request:
```json
POST /ipp/start
{
  "mostradores": ["7051602", "7051603"]
}
```

### Response:
```json
{
  "job_id": "ipp-abc123-def456",
  "status": "JOB1_RUNNING",
  "message": "Proceso IPP iniciado exitosamente",
  "mostradores_count": 2,
  "databricks_run_id": "123456"
}
```

### DynamoDB Item:
```json
{
  "job_id": "ipp-abc123-def456",
  "status": "JOB1_RUNNING",
  "mostradores": ["7051602", "7051603"],
  "mostradores_count": 2,
  "databricks_run_id": "123456",
  "databricks_job_id": "789",
  "user_info": {
    "email": "user@example.com",
    "username": "user@example.com",
    "sub": "abc-123",
    "name": "Usuario"
  },
  "created_at": "2024-12-09T10:30:00.000Z",
  "updated_at": "2024-12-09T10:30:00.000Z",
  "ttl": 1702123456
}
```

### Variables de Entorno Requeridas:
```bash
DATABRICKS_WORKSPACE_URL=https://adb-xxx.azuredatabricks.net
DATABRICKS_ACCESS_TOKEN=dapi...
DATABRICKS_JOB1_ID=789  # ID del Job en Databricks
IPP_JOBS_TABLE=invenadro-backend-jul-dev-ipp-jobs
```

---

## 🔍 Lambda 3: ipp-status

### Responsabilidades:
- Consultar DynamoDB por job_id
- Si JOB1_RUNNING → Consultar Databricks
- Actualizar estado si cambió
- Retornar progreso al frontend

### Request:
```http
GET /ipp/status/{job_id}
```

### Response:
```json
{
  "job_id": "ipp-abc123-def456",
  "status": "JOB1_RUNNING",
  "message": "Databricks Job 1 en ejecución...",
  "databricks_state": "RUNNING",
  "databricks_run_url": "https://...",
  "mostradores_count": 2,
  "progress": 25
}
```

### Mapeo de Estados:
| Databricks State | IPP Status | Progress |
|------------------|------------|----------|
| PENDING | JOB1_RUNNING | 25% |
| RUNNING | JOB1_RUNNING | 25% |
| TERMINATED + SUCCESS | JOB1_DONE | 40% |
| TERMINATED + FAILED | FAILED | 0% |

---

## 📊 Lambda 4: ipp-results

### Responsabilidades:
- Obtener resultados finales
- Verificar que proceso esté completado
- Retornar metadata de resultados

### Request:
```http
GET /ipp/results/{job_id}
```

### Response:
```json
{
  "job_id": "ipp-abc123-def456",
  "status": "COMPLETED",
  "mostradores": ["7051602", "7051603"],
  "mostradores_count": 2,
  "process_info": {
    "created_at": "2024-12-09T10:30:00.000Z",
    "updated_at": "2024-12-09T10:45:00.000Z",
    "user_info": {...}
  },
  "databricks_info": {
    "job1_run_id": "123456",
    "job2_run_id": "123457",
    "results_table": "invenadro.gold.ipp_resultados_finales",
    "query_example": "SELECT * FROM invenadro.gold.ipp_resultados_finales WHERE job_id = 'ipp-abc123-def456'"
  },
  "s3_locations": {...},
  "summary": {
    "mostradores_processed": 2,
    "total_time_seconds": 900,
    "success": true
  }
}
```

---

## 🗄️ Recursos AWS

### DynamoDB Table: `ipp-jobs`
```yaml
Partition Key: job_id (String)
TTL: 7 días
GSI: created_at-index
```

### S3 Buckets:
- **ipp-raw**: Datos desde Databricks Job 1 (raw_data.xlsx)
- **ipp-processed**: Datos después de aplicar factor (processed_data.csv)

---

## 🚀 Deployment

### Deploy completo:
```bash
cd services/backend
npx serverless deploy --stage jul-dev
```

### Deploy función individual:
```bash
npx serverless deploy function -f ippVerificador --stage jul-dev
npx serverless deploy function -f ippIniciador --stage jul-dev
npx serverless deploy function -f ippStatus --stage jul-dev
npx serverless deploy function -f ippResults --stage jul-dev
```

### Ver logs:
```bash
npx serverless logs -f ippVerificador --stage jul-dev --tail
```

---

## 🔐 Permisos IAM Requeridos

Cada Lambda necesita:
- **DynamoDB**: GetItem, PutItem, UpdateItem, Query
- **S3**: GetObject, PutObject
- **Databricks**: N/A (usa Access Token en variables de entorno)

---

## 🧪 Testing

### 1. Test ipp-verificador:
```bash
curl -X POST https://xxx.execute-api.mx-central-1.amazonaws.com/jul-dev/ipp/validate-clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mostradores": ["7051602", "7051603"]}'
```

### 2. Test ipp-iniciador:
```bash
curl -X POST https://xxx.execute-api.mx-central-1.amazonaws.com/jul-dev/ipp/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mostradores": ["7051602", "7051603"]}'
```

### 3. Test ipp-status:
```bash
curl -X GET https://xxx.execute-api.mx-central-1.amazonaws.com/jul-dev/ipp/status/ipp-abc123-def456 \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test ipp-results:
```bash
curl -X GET https://xxx.execute-api.mx-central-1.amazonaws.com/jul-dev/ipp/results/ipp-abc123-def456 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Configuración EventBridge (Futuro)

Para automatización con cron:

```yaml
# En serverless.yml
ippVerificador:
  events:
    # Endpoint HTTP (actual)
    - http:
        path: /ipp/validate-clients
        method: post
        cors: true
        authorizer: ${self:custom.auth.default}
    
    # EventBridge Schedule (futuro)
    - schedule:
        rate: cron(0 8 * * ? *)  # Diario a las 8am
        enabled: true
        input:
          mode: automatic  # Sin lista de mostradores
```

---

## 🐛 Troubleshooting

### Error: "Configuración de Databricks incompleta"
- Verificar variables de entorno: `DATABRICKS_WORKSPACE_URL`, `DATABRICKS_ACCESS_TOKEN`, `DATABRICKS_JOB1_ID`

### Error: "Job no encontrado"
- Verificar que job_id sea correcto
- Verificar que tabla DynamoDB exista

### Error: "Proceso no completado"
- El proceso aún está en ejecución
- Usar `/ipp/status/{job_id}` para ver progreso

---

## 📚 Referencias

- [Documentación Frontend](../../../FrontEnd-lambdas/src/components/ipp/README.md)
- [Diagrama de Arquitectura](../../../docs/ipp-architecture.png)
- [Databricks Jobs API](https://docs.databricks.com/api/workspace/jobs)

---

**Última actualización**: Diciembre 2024

