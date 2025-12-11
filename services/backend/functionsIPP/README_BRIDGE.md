# 🌉 Lambda Bridge: IPP → Factor de Redondeo

## 📊 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: Frontend → IPP Verificador/Iniciador                   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Usuario ingresa mostradores en frontend                     │
│ 2. ipp-verificador valida contra Databricks                    │
│ 3. ipp-iniciador dispara Databricks Job 1                      │
│ 4. Frontend hace polling de status                             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: Databricks Job 1 Procesa y Guarda en S3                │
├─────────────────────────────────────────────────────────────────┤
│ 1. Databricks Job 1 recibe parámetros (job_id, mostradores)    │
│ 2. Procesa IPP Tradicional + Normalizador                      │
│ 3. Calcula Factor_A, Factor_B, Factor_C, Factor_4, etc.        │
│ 4. Guarda PARTICIONADO por cliente en S3:                      │
│    ├── resultados/{job_id}/clientes/cliente_7051602.json       │
│    ├── resultados/{job_id}/clientes/cliente_7051603.json       │
│    └── resultados/{job_id}/metadata.json ← TRIGGER              │
│ 5. Actualiza DynamoDB: status = 'completed'                    │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ FASE 3: S3 Event Dispara Lambda Bridge (NUEVA) ⭐               │
├─────────────────────────────────────────────────────────────────┤
│ 1. S3 Event detecta: metadata.json creado                      │
│ 2. ipp-to-factor-bridge se ejecuta automáticamente             │
│ 3. Lee metadata.json (obtiene lista de clientes)               │
│ 4. Por cada cliente:                                           │
│    a. Lee cliente_{id}.json desde S3                           │
│    b. Transforma JSON → Excel (formato Factor Redondeo)        │
│    c. Sube Excel a uploads/ipp-to-factor/{job_id}/{cliente}/   │
│    d. Invoca Lambda 'initiator' (Factor Redondeo) ← REUTILIZA  │
│ 5. Actualiza DynamoDB IPP: status = 'factor_initiated'         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ FASE 4: Factor de Redondeo Procesa (EXISTENTE - Sin cambios)   │
├─────────────────────────────────────────────────────────────────┤
│ 1. initiator genera processId y guarda en DynamoDB             │
│ 2. Inicia Step Function                                        │
│ 3. client-separator detecta 1 cliente (ya viene separado)      │
│ 4. processor aplica Factor de Redondeo:                        │
│    - Lee Excel del cliente                                     │
│    - Consulta ventas en Databricks                             │
│    - Calcula factor óptimo                                     │
│    - Aplica reglas de redondeo                                 │
│ 5. Guarda resultado en S3: results/resultados/{processId}/     │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ FASE 5: Subir Resultados a Databricks Gold (FUTURO)            │
├─────────────────────────────────────────────────────────────────┤
│ 1. factor-to-databricks lee consolidado.xlsx                   │
│ 2. Por cada cliente crea/actualiza tabla Gold:                 │
│    invenadro.gold.factor_redondeo_{mostrador}                  │
│ 3. Actualiza DynamoDB IPP: status = 'databricks_uploaded'      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estructura de Archivos en S3

### **IPP Raw Bucket:**
```
s3://invenadro-backend-jul-dev-ipp-raw/
└── resultados/
    └── ipp_abc123/
        ├── metadata.json                    ← Dispara Lambda Bridge
        └── clientes/
            ├── cliente_7051602.json         ← 5,000 registros
            ├── cliente_7051603.json         ← 5,000 registros
            └── cliente_7051604.json         ← 5,000 registros
```

### **Uploads Bucket (Factor Redondeo Input):**
```
s3://invenadro-backend-jul-dev-uploads/
└── ipp-to-factor/
    └── ipp_abc123/
        ├── 7051602/
        │   └── input.xlsx                   ← Excel para Factor Redondeo
        ├── 7051603/
        │   └── input.xlsx
        └── 7051604/
            └── input.xlsx
```

### **Results Bucket (Factor Redondeo Output):**
```
s3://invenadro-backend-jul-dev-results/
└── resultados/
    ├── uuid-111/
    │   └── resultado.json                   ← Resultado cliente 7051602
    ├── uuid-222/
    │   └── resultado.json                   ← Resultado cliente 7051603
    └── uuid-333/
        └── resultado.json                   ← Resultado cliente 7051604
```

---

## 🔧 Configuración Necesaria

### **1. Databricks Secrets (Ya deberías tenerlos):**
```bash
databricks secrets create-scope --scope aws-creds
databricks secrets put --scope aws-creds --key access-key
databricks secrets put --scope aws-creds --key secret-key
```

### **2. Usuario IAM en AWS:**
Ya lo creaste antes con permisos para S3 y DynamoDB.

### **3. Notebook de Databricks:**
Copia el código de `DATABRICKS_NOTEBOOK_CODE.py` y agrégalo a tu notebook:
- **Widgets**: Al inicio del notebook (primera cell)
- **Procesamiento IPP**: Tu código actual (medio)
- **Guardar en S3**: Al final del notebook (última cell)

---

## 🚀 Deploy

### **1. Instalar dependencias nuevas:**
```bash
cd services/backend
npm install
```

### **2. Verificar cambios:**
```bash
# Ver funciones que se deployarán
npx serverless info --stage jul-dev
```

### **3. Deploy completo:**
```bash
npx serverless deploy --stage jul-dev
```

O deploy solo de la nueva función:
```bash
npx serverless deploy function -f ippToFactorBridge --stage jul-dev
```

---

## 🧪 Testing

### **Paso 1: Probar IPP completo desde Frontend**
```
1. Ir a frontend IPP
2. Ingresar mostradores: 7051602,7051603
3. Validar
4. Continuar
5. Esperar que Databricks Job 1 complete (~20 min)
```

### **Paso 2: Verificar archivos en S3**
```bash
# Ver que se crearon los archivos particionados
aws s3 ls s3://invenadro-backend-jul-dev-ipp-raw/resultados/ --recursive

# Ver metadata.json
aws s3 cp s3://invenadro-backend-jul-dev-ipp-raw/resultados/ipp_XXX/metadata.json - | jq .

# Ver archivo de un cliente
aws s3 cp s3://invenadro-backend-jul-dev-ipp-raw/resultados/ipp_XXX/clientes/cliente_7051602.json - | jq .
```

### **Paso 3: Verificar que Bridge se ejecutó**
```bash
# Ver logs de la lambda bridge
npx serverless logs -f ippToFactorBridge --stage jul-dev --tail

# Deberías ver:
# ✅ Metadata leída
# ✅ [1/2] Procesando cliente: 7051602
# ✅ Excel generado
# ✅ Initiator invocado
# ✅ [2/2] Procesando cliente: 7051603
```

### **Paso 4: Verificar que Factor de Redondeo se ejecutó**
```bash
# Ver logs del initiator (uno por cliente)
npx serverless logs -f initiator --stage jul-dev --tail

# Ver resultados en S3
aws s3 ls s3://invenadro-backend-jul-dev-results/resultados/ --recursive
```

---

## 📊 Monitoreo en DynamoDB

### **Tabla IPP Jobs:**
```bash
aws dynamodb get-item \
  --table-name invenadro-backend-jul-dev-ipp-jobs \
  --key '{"job_id":{"S":"ipp_abc123"}}'
```

**Estados esperados:**
```
job1_running      → Databricks procesando
completed         → Databricks terminó, guardó en S3
factor_initiated  → Bridge envió clientes a Factor Redondeo
factor_completed  → Todos los clientes procesados (futuro)
```

### **Tabla Jobs (Factor Redondeo):**
```bash
aws dynamodb scan \
  --table-name invenadro-backend-jul-dev-jobs \
  --filter-expression "contains(customConfig, :source)" \
  --expression-attribute-values '{":source":{"S":"IPP"}}'
```

---

## 🐛 Troubleshooting

### **Problema: Bridge no se ejecuta**

**Síntoma:** Databricks completa pero Bridge no arranca.

**Solución:**
```bash
# 1. Verificar que metadata.json existe
aws s3 ls s3://invenadro-backend-jul-dev-ipp-raw/resultados/ipp_XXX/

# 2. Verificar permisos S3 Event Notification
aws s3api get-bucket-notification-configuration \
  --bucket invenadro-backend-jul-dev-ipp-raw

# 3. Invocar manualmente para testing
aws lambda invoke \
  --function-name invenadro-backend-jul-dev-ipp-to-factor-bridge \
  --payload file://test-event.json \
  response.json
```

### **Problema: Transformación JSON → Excel falla**

**Síntoma:** Bridge ejecuta pero Excel está corrupto.

**Solución:**
```bash
# 1. Ver logs detallados
npx serverless logs -f ippToFactorBridge --stage jul-dev --startTime 10m

# 2. Verificar estructura del JSON cliente
aws s3 cp s3://invenadro-backend-jul-dev-ipp-raw/resultados/ipp_XXX/clientes/cliente_7051602.json - | jq '.datos[0]'

# Debe tener: MATERIAL_MG, Descripcion, Factor_4, Precio_Farmacia
```

### **Problema: Factor de Redondeo no procesa correctamente**

**Síntoma:** Initiator ejecuta pero processor falla.

**Solución:**
```bash
# 1. Descargar Excel generado y verificar
aws s3 cp s3://invenadro-backend-jul-dev-uploads/ipp-to-factor/ipp_XXX/7051602/input.xlsx .

# 2. Ver logs del processor
npx serverless logs -f processor --stage jul-dev --tail

# 3. Verificar que Excel tiene columnas correctas:
# - Cliente
# - Material
# - Descripcion
# - Inventario
# - Precio
```

---

## 📈 Métricas y Costos

### **Ejecución típica (100 clientes):**

| Lambda | Duración | Costo (aprox) |
|--------|----------|---------------|
| ipp-iniciador | 5s | $0.0001 |
| Databricks Job 1 | 20 min | Costo Databricks |
| ipp-to-factor-bridge | 2 min | $0.002 |
| initiator × 100 | 5s × 100 | $0.01 |
| processor × 100 | 60s × 100 | $0.10 |
| **TOTAL** | ~22 min | **~$0.12** + Databricks |

**S3 Requests:**
- PutObject: ~300 (metadata + clientes + excels)
- GetObject: ~400 (lectura bridge + processor)
- Costo: ~$0.0015

**DynamoDB:**
- Writes: ~205 (1 IPP + 4 por cliente)
- Reads: ~100 (status checks)
- Costo: ~$0.0003

---

## ⚡ Optimizaciones Futuras

### **1. Paralelizar Bridge (Si tienes 1000+ clientes):**
```javascript
// En lugar de procesar secuencialmente, usar Promise.all con batches
const BATCH_SIZE = 10;
for (let i = 0; i < clientes.length; i += BATCH_SIZE) {
  const batch = clientes.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(cliente => procesarCliente(cliente)));
}
```

### **2. Usar SQS como Buffer:**
```
Bridge → SQS Queue → Lambda Consumer (procesa 1 cliente)
```
Ventajas: Mejor control de rate limiting, reintentos automáticos.

### **3. Agregar CloudWatch Dashboard:**
Monitorear:
- Tiempo de ejecución Bridge
- Éxito/Fallo por cliente
- Throughput (clientes/minuto)

---

## 📝 Próximos Pasos

1. ✅ Deploy de `ipp-to-factor-bridge`
2. ✅ Modificar Notebook Databricks (agregar código S3)
3. ⏳ Probar flujo completo end-to-end
4. ⏳ Crear `factor-to-databricks` (Fase 5)
5. ⏳ Integrar multi-cuenta (nadro-prod)

---

## 🎯 Resumen

**Lo que hicimos:**
1. ✅ Creamos Lambda `ipp-to-factor-bridge`
2. ✅ Configuramos S3 Event Notification (automático)
3. ✅ Reutilizamos TODO el Factor de Redondeo existente
4. ✅ Particionamos por cliente para evitar problemas de memoria
5. ✅ Hicimos que cada cliente se procese independientemente

**Ventajas:**
- ✅ No modificamos nada del Factor de Redondeo
- ✅ Escalable (1 cliente o 1000 clientes)
- ✅ Resiliente (si falla 1 cliente, los demás continúan)
- ✅ Trazable (logs por cada paso)
- ✅ Event-driven (sin polling innecesario)

---

¿Preguntas? Revisa el código en:
- `functionsIPP/ipp-to-factor-bridge/index.js`
- `DATABRICKS_NOTEBOOK_CODE.py`

