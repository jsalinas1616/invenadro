# 📊 Comparación de Infraestructura - Proyecto Original vs Invenadro

Este documento muestra las diferencias entre el proyecto original y tu nueva infraestructura independiente.

---

## 🎯 Objetivo

**Problema:** Este proyecto es una copia del proyecto "Factor de Redondeo" y comparte toda la infraestructura AWS.

**Solución:** Crear infraestructura completamente independiente para evitar conflictos en deployments.

---

## 📋 Tabla Comparativa Completa

### 1. API Gateway

| Aspecto | Proyecto Original | Invenadro (Nuevo) | Estado |
|---------|-------------------|-------------------|---------|
| **API Gateway ID** | `8zck1369x8` | `<NUEVO_ID>` | 🔴 Crear |
| **Base URL** | `https://8zck1369x8.execute-api.us-east-1.amazonaws.com/dev` | `https://<NUEVO_ID>.execute-api.us-east-1.amazonaws.com/dev` | 🔴 Crear |
| **Authorizer** | Compartido | Independiente | 🔴 Crear |

**Endpoints que necesitas configurar:**
- `POST /calcular-redondeo`
- `GET /calcular-redondeo/status/{processId}`
- `GET /calcular-redondeo/download/{processId}`
- `GET /excel/{processId}/{clienteId}`
- `POST /get-presigned-url`

---

### 2. AWS Lambda

| Función | Nombre Original | Nombre Nuevo | Estado |
|---------|-----------------|--------------|---------|
| Initiator | `factor-redondeo-lambda-dev-initiator` | `invenadro-dev-initiator` | 🟡 Renombrar |
| Client Separator | `factor-redondeo-lambda-dev-client-separator` | `invenadro-dev-client-separator` | 🟡 Renombrar |
| Processor | `factor-redondeo-lambda-dev-processor` | `invenadro-dev-processor` | 🟡 Renombrar |
| Status Checker | `factor-redondeo-lambda-dev-status-checker` | `invenadro-dev-status-checker` | 🟡 Renombrar |
| Client Aggregator | `factor-redondeo-lambda-dev-client-aggregator` | `invenadro-dev-client-aggregator` | 🟡 Renombrar |
| Download Result | `factor-redondeo-lambda-dev-download-result` | `invenadro-dev-download-result` | 🟡 Renombrar |
| Excel Generator | `factor-redondeo-lambda-dev-excel-generator` | `invenadro-dev-excel-generator` | 🟡 Renombrar |
| Get Presigned URL | `factor-redondeo-lambda-dev-get-presigned-url` | `invenadro-dev-get-presigned-url` | 🟡 Renombrar |

**Total:** 8 funciones Lambda

---

### 3. Amazon S3

| Tipo | Bucket Original | Bucket Nuevo | Estado |
|------|----------------|--------------|---------|
| **Uploads** | `factor-redondeo-lambda-uploads-dev` | `invenadro-uploads-dev` | 🔴 Crear |
| **Results** | `factor-redondeo-lambda-results-dev` | `invenadro-results-dev` | 🔴 Crear |
| **Frontend** | `factor-redondeo-v3-frontend-dev` | `invenadro-frontend-dev` | 🔴 Crear |

---

### 4. DynamoDB

| Aspecto | Original | Nuevo | Estado |
|---------|----------|-------|---------|
| **Table Name** | `factor-redondeo-lambda-jobs-dev` | `invenadro-jobs-dev` | 🔴 Crear |
| **Primary Key** | `processId` (String) | `processId` (String) | ✅ Igual |
| **Billing Mode** | Pay per Request | Pay per Request | ✅ Igual |

---

### 5. Step Functions

| Aspecto | Original | Nuevo | Estado |
|---------|----------|-------|---------|
| **State Machine Name** | `FactorRedondeo` | `InvenadroStateMachine` | 🟡 Renombrar |
| **ARN** | `arn:aws:states:us-east-1:975130647458:stateMachine:FactorRedondeo` | `arn:aws:states:us-east-1:975130647458:stateMachine:InvenadroStateMachine` | 🔴 Crear |
| **Definition File** | `infrastructure/step-function.json` | `infrastructure/step-function.json` (actualizado) | 🟡 Actualizar |

---

### 6. Amazon Cognito

| Aspecto | Original | Nuevo | Estado |
|---------|----------|-------|---------|
| **User Pool Name** | `factor-redondeo-users` (compartido) | `invenadro-users-dev` | 🔴 Crear |
| **User Pool ID** | `us-east-1_UQ9eT0Tgn` | `<NUEVO_ID>` | 🔴 Crear |
| **App Client ID** | `47s3l4n3u40a9g48abp0jr3adq` | `<NUEVO_ID>` | 🔴 Crear |
| **Password Policy** | 8 chars, upper, lower, numbers | 8 chars, upper, lower, numbers | ✅ Igual |

---

### 7. IAM Roles

| Role | Original | Nuevo | Estado |
|------|----------|-------|---------|
| **Lambda Execution Role** | `factor-redondeo-lambda-execution-role` (compartido) | `invenadro-lambda-execution-role` | 🔴 Crear |
| **Step Function Role** | `factor-redondeo-stepfunction-role` (compartido) | `invenadro-stepfunction-execution-role` | 🔴 Crear |

---

### 8. Frontend

| Aspecto | Original | Nuevo | Estado |
|---------|----------|-------|---------|
| **Config File** | `src/services/lambdaService.js` | `src/services/lambdaService.js` (actualizado) | 🟡 Actualizar |
| **Auth Config** | `src/aws-config.js` | `src/aws-config.js` (actualizado) | 🟡 Actualizar |
| **Build Output** | `build/` | `build/` | ✅ Igual |
| **Deploy Bucket** | `factor-redondeo-v3-frontend-dev` | `invenadro-frontend-dev` | 🔴 Crear |

---

## 🔄 Archivos que Necesitan Actualización

### Backend (Lambda Functions)

#### 1. `infrastructure/step-function.json`
**Cambios:**
```json
// ANTES
"FunctionName": "arn:aws:lambda:us-east-1:975130647458:function:factor-redondeo-lambda-dev-initiator:$LATEST"

// DESPUÉS
"FunctionName": "arn:aws:lambda:us-east-1:975130647458:function:invenadro-dev-initiator:$LATEST"
```

#### 2. `lambda-initiator/index.js`
**Cambios:**
```javascript
// ANTES
const ALLOWED_ORIGINS = [
    'http://factor-redondeo-v3-frontend-dev.s3-website-us-east-1.amazonaws.com',
    'http://factor-redondeo-lambda-frontend.s3-website-us-east-1.amazonaws.com'
];

// DESPUÉS
const ALLOWED_ORIGINS = [
    'http://invenadro-frontend-dev.s3-website-us-east-1.amazonaws.com',
    'http://localhost:3000',
    'http://localhost:3001'
];
```

#### 3. `lambda-client-separator/index.js`
**Cambios:**
```javascript
// ANTES (línea 268)
'arn:aws:states:us-east-1:975130647458:stateMachine:FactorRedondeo'

// DESPUÉS
'arn:aws:states:us-east-1:975130647458:stateMachine:InvenadroStateMachine'

// ANTES (línea 339)
TableName: process.env.JOBS_TABLE || 'factor-redondeo-lambda-jobs-dev'

// DESPUÉS
TableName: process.env.JOBS_TABLE || 'invenadro-jobs-dev'
```

#### 4. `lambda-processor/index.js`
**Cambios:**
```javascript
// ANTES (líneas 22, 108, 148)
TableName: process.env.JOBS_TABLE || 'factor-redondeo-lambda-jobs-dev'

// DESPUÉS
TableName: process.env.JOBS_TABLE || 'invenadro-jobs-dev'

// ANTES (línea 65)
const resultsBucket = process.env.RESULTS_BUCKET || 'factor-redondeo-lambda-results-dev';

// DESPUÉS
const resultsBucket = process.env.RESULTS_BUCKET || 'invenadro-results-dev';
```

#### 5. Todas las demás Lambdas
Aplicar cambios similares en:
- `lambda-status-checker/index.js`
- `lambda-client-aggregator/index.js`
- `lambda-download-result/index.js`
- `lambda-excel-generator/index.js`
- `lambda-get-presigned-url/index.js`

---

### Frontend

#### 1. `FrontEnd-lambdas/src/services/lambdaService.js`
**Cambios:**
```javascript
// ANTES (líneas 6-7)
lambdaInitiatorUrl: 'https://8zck1369x8.execute-api.us-east-1.amazonaws.com/dev/calcular-redondeo',
apiGatewayBaseUrl: 'https://8zck1369x8.execute-api.us-east-1.amazonaws.com/dev',

// DESPUÉS
lambdaInitiatorUrl: 'https://<NUEVO_API_ID>.execute-api.us-east-1.amazonaws.com/dev/calcular-redondeo',
apiGatewayBaseUrl: 'https://<NUEVO_API_ID>.execute-api.us-east-1.amazonaws.com/dev',

// ANTES (líneas 9-10)
s3ResultsBucket: 'factor-redondeo-lambda-results-dev',
dynamoDBTable: 'factor-redondeo-lambda-jobs-dev',
s3UploadsBucket: 'factor-redondeo-lambda-uploads-dev',

// DESPUÉS
s3ResultsBucket: 'invenadro-results-dev',
dynamoDBTable: 'invenadro-jobs-dev',
s3UploadsBucket: 'invenadro-uploads-dev',

// ANTES (línea 12)
stepFunctionArn: 'arn:aws:states:us-east-1:975130647458:stateMachine:FactorRedondeo',

// DESPUÉS
stepFunctionArn: 'arn:aws:states:us-east-1:975130647458:stateMachine:InvenadroStateMachine',

// ANTES (línea 214)
const downloadUrl = `https://8zck1369x8.execute-api.us-east-1.amazonaws.com/dev/excel/${processId}/${clienteId}`;

// DESPUÉS
const downloadUrl = `https://<NUEVO_API_ID>.execute-api.us-east-1.amazonaws.com/dev/excel/${processId}/${clienteId}`;
```

#### 2. `FrontEnd-lambdas/src/aws-config.js`
**Cambios:**
```javascript
// ANTES (líneas 9-10)
userPoolId: 'us-east-1_UQ9eT0Tgn',
userPoolClientId: '47s3l4n3u40a9g48abp0jr3adq',

// DESPUÉS
userPoolId: '<NUEVO_USER_POOL_ID>',
userPoolClientId: '<NUEVO_CLIENT_ID>',
```

---

## 🚨 Riesgos si NO Migras

| Riesgo | Impacto | Probabilidad |
|--------|---------|--------------|
| **Sobrescribir Lambdas del otro proyecto** | 🔴 CRÍTICO | 🔴 ALTA |
| **Conflictos en DynamoDB** | 🟠 ALTO | 🟠 MEDIA |
| **Datos mezclados en S3** | 🟠 ALTO | 🟠 MEDIA |
| **Usuarios de Cognito mezclados** | 🟡 MEDIO | 🟡 BAJA |
| **Step Function compartida** | 🔴 CRÍTICO | 🔴 ALTA |

**Conclusión:** Es CRÍTICO migrar a infraestructura independiente antes de hacer cualquier deployment.

---

## ✅ Beneficios de la Migración

1. **Independencia Total** - Cero riesgo de afectar el otro proyecto
2. **Deployment Seguro** - Puedes hacer deploy sin miedo
3. **Testing Aislado** - Pruebas no afectan producción del otro proyecto
4. **Control de Versiones** - Cada proyecto tiene su propia versión de infraestructura
5. **Escalabilidad** - Puedes ajustar recursos independientemente
6. **Auditoría Limpia** - Logs y métricas separadas
7. **Seguridad Mejorada** - Permisos específicos por proyecto

---

## 📝 Checklist de Migración

### Fase 1: Preparación (Completado ✅)
- [x] Crear archivo de configuración centralizada
- [x] Crear plan de migración detallado
- [x] Crear scripts de automatización
- [x] Documentar diferencias

### Fase 2: Crear Infraestructura (Pendiente)
- [ ] Ejecutar `1-create-infrastructure.sh`
- [ ] Verificar que todos los recursos se crearon
- [ ] Guardar IDs generados (Cognito, etc.)

### Fase 3: Actualizar Configuraciones (Pendiente)
- [ ] Ejecutar `update-all-configs.sh`
- [ ] Verificar cambios con `git diff`
- [ ] Confirmar que no hay referencias al proyecto original

### Fase 4: Crear Lambdas (Pendiente)
- [ ] Ejecutar `2-create-lambdas.sh`
- [ ] Verificar que las 8 funciones existen
- [ ] Probar una Lambda manualmente

### Fase 5: Crear API Gateway (Pendiente)
- [ ] Crear API Gateway desde consola
- [ ] Configurar endpoints
- [ ] Configurar Cognito Authorizer
- [ ] Configurar CORS
- [ ] Deploy a stage `dev`
- [ ] Re-ejecutar `update-all-configs.sh` con nuevo API ID

### Fase 6: Crear Step Function (Pendiente)
- [ ] Actualizar `step-function.json` con nuevos ARNs
- [ ] Crear State Machine
- [ ] Verificar que puede invocar las Lambdas

### Fase 7: Deploy Frontend (Pendiente)
- [ ] Build: `npm run build`
- [ ] Deploy a S3: `aws s3 sync build/ s3://invenadro-frontend-dev`
- [ ] Configurar bucket policy
- [ ] Verificar acceso público

### Fase 8: Testing (Pendiente)
- [ ] Crear usuario en Cognito
- [ ] Login en frontend
- [ ] Subir archivo de prueba
- [ ] Verificar proceso completo
- [ ] Verificar logs en CloudWatch

### Fase 9: Cleanup (Pendiente)
- [ ] Remover referencias hardcodeadas que quedaron
- [ ] Actualizar README principal
- [ ] Commit de cambios
- [ ] Tag de versión

---

## 🎯 Resultado Final

Después de la migración, tendrás:

```
PROYECTO ORIGINAL                  INVENADRO (NUEVO)
├── API Gateway: 8zck1369x8       ├── API Gateway: <nuevo_id>
├── Lambdas: factor-redondeo-*    ├── Lambdas: invenadro-*
├── S3: factor-redondeo-*         ├── S3: invenadro-*
├── DynamoDB: factor-redondeo-*   ├── DynamoDB: invenadro-*
├── Step Function: FactorRedondeo ├── Step Function: InvenadroStateMachine
├── Cognito: (compartido)         ├── Cognito: invenadro-users-dev
└── Frontend: factor-redondeo-*   └── Frontend: invenadro-frontend-dev

        ⬇️                                  ⬇️
   INDEPENDIENTE                      INDEPENDIENTE
```

**Sin conflictos, sin interferencias, sin problemas.**

---

## 📞 ¿Necesitas Ayuda?

Si tienes dudas sobre algún paso específico:

1. **Consulta** `deployment/QUICK_START.md` para inicio rápido
2. **Lee** `deployment/MIGRATION_PLAN.md` para plan detallado
3. **Ejecuta** los scripts con `-h` o `--help` para opciones
4. **Revisa** logs de CloudWatch si algo falla

---

**Última actualización:** Octubre 2025  
**Estado:** 🟡 Pendiente de migración

