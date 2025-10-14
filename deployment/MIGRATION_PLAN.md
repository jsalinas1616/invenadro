# 🚀 Plan de Migración - Infraestructura Independiente

## ⚠️ PROBLEMA ACTUAL

Este proyecto es una copia de otro y comparte la misma infraestructura AWS:
- Mismo API Gateway ID: `8zck1369x8`
- Mismas funciones Lambda: `factor-redondeo-lambda-dev-*`
- Mismos buckets S3
- Misma tabla DynamoDB
- Mismo Cognito User Pool
- Misma Step Function

**RIESGO**: Al hacer deploy, actualizas la infraestructura del otro proyecto y lo rompes.

---

## ✅ SOLUCIÓN: Infraestructura Completamente Independiente

### Nuevo Prefijo del Proyecto
- **Anterior**: `factor-redondeo-lambda`
- **Nuevo**: `invenadro`

---

## 📋 PASO 1: Crear Nueva Infraestructura AWS

### 1.1 Crear Buckets S3

```bash
# Bucket para uploads
aws s3 mb s3://invenadro-uploads-dev --region us-east-1

# Bucket para resultados
aws s3 mb s3://invenadro-results-dev --region us-east-1

# Bucket para frontend
aws s3 mb s3://invenadro-frontend-dev --region us-east-1
aws s3 website s3://invenadro-frontend-dev --index-document index.html
```

### 1.2 Crear Tabla DynamoDB

```bash
aws dynamodb create-table \
  --table-name invenadro-jobs-dev \
  --attribute-definitions \
      AttributeName=processId,AttributeType=S \
  --key-schema \
      AttributeName=processId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 1.3 Crear Cognito User Pool

```bash
# Crear User Pool
aws cognito-idp create-user-pool \
  --pool-name invenadro-users-dev \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
  --auto-verified-attributes email \
  --region us-east-1

# NOTA: Guardar el UserPoolId que te devuelva

# Crear App Client (SIN secret para frontend)
aws cognito-idp create-user-pool-client \
  --user-pool-id <USER_POOL_ID_DEL_COMANDO_ANTERIOR> \
  --client-name invenadro-app-client \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region us-east-1

# NOTA: Guardar el ClientId que te devuelva
```

### 1.4 Crear IAM Role para Lambda

```bash
# Crear trust policy
cat > /tmp/lambda-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Crear role
aws iam create-role \
  --role-name invenadro-lambda-execution-role \
  --assume-role-policy-document file:///tmp/lambda-trust-policy.json

# Adjuntar políticas básicas
aws iam attach-role-policy \
  --role-name invenadro-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 1.5 Crear Policy personalizada para Lambda

Ver archivo `deployment/aws-permissions/invenadro-lambda-policy.json` (se creará en siguiente paso)

```bash
aws iam put-role-policy \
  --role-name invenadro-lambda-execution-role \
  --policy-name InvenadroLambdaPolicy \
  --policy-document file://deployment/aws-permissions/invenadro-lambda-policy.json
```

---

## 📋 PASO 2: Crear Funciones Lambda

### 2.1 Crear las 8 funciones Lambda

Para cada función, ejecutar:

```bash
# Ejemplo para lambda-initiator
cd lambda-initiator
zip -r lambda-initiator-deploy.zip . -x "*.git*" "*.zip" "node_modules/.cache/*"

aws lambda create-function \
  --function-name invenadro-dev-initiator \
  --runtime nodejs20.x \
  --role arn:aws:iam::975130647458:role/invenadro-lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://lambda-initiator-deploy.zip \
  --timeout 900 \
  --memory-size 1024 \
  --environment "Variables={
    AWS_REGION=us-east-1,
    JOBS_TABLE=invenadro-jobs-dev,
    STEP_FUNCTION_ARN=arn:aws:states:us-east-1:975130647458:stateMachine:InvenadroStateMachine
  }" \
  --region us-east-1
```

**Repetir para todas las funciones:**
1. `invenadro-dev-initiator`
2. `invenadro-dev-client-separator`
3. `invenadro-dev-processor`
4. `invenadro-dev-status-checker`
5. `invenadro-dev-client-aggregator`
6. `invenadro-dev-download-result`
7. `invenadro-dev-excel-generator`
8. `invenadro-dev-get-presigned-url`

---

## 📋 PASO 3: Crear Step Function

```bash
# 1. Actualizar el archivo infrastructure/step-function.json con los nuevos ARNs de Lambda

# 2. Crear Step Function
aws stepfunctions create-state-machine \
  --name InvenadroStateMachine \
  --definition file://infrastructure/step-function.json \
  --role-arn arn:aws:iam::975130647458:role/invenadro-stepfunction-execution-role \
  --region us-east-1

# NOTA: Necesitas crear el role de Step Function primero
```

---

## 📋 PASO 4: Crear API Gateway

### 4.1 Crear API REST

```bash
# Crear API
aws apigateway create-rest-api \
  --name "Invenadro API" \
  --description "API para sistema de optimización de inventarios" \
  --region us-east-1

# NOTA: Guardar el API_ID que te devuelva
```

### 4.2 Configurar Endpoints

**Endpoints necesarios:**

1. `POST /calcular-redondeo` → `invenadro-dev-initiator`
2. `GET /calcular-redondeo/status/{processId}` → `invenadro-dev-status-checker`
3. `GET /calcular-redondeo/download/{processId}` → `invenadro-dev-download-result`
4. `GET /excel/{processId}/{clienteId}` → `invenadro-dev-excel-generator`
5. `POST /get-presigned-url` → `invenadro-dev-get-presigned-url`

### 4.3 Configurar Cognito Authorizer

```bash
aws apigateway create-authorizer \
  --rest-api-id <API_ID> \
  --name InvenadroAuth \
  --type COGNITO_USER_POOLS \
  --provider-arns arn:aws:cognito-idp:us-east-1:975130647458:userpool/<USER_POOL_ID> \
  --identity-source method.request.header.Authorization \
  --region us-east-1
```

### 4.4 Deploy API

```bash
aws apigateway create-deployment \
  --rest-api-id <API_ID> \
  --stage-name dev \
  --region us-east-1
```

---

## 📋 PASO 5: Actualizar Código con Nuevas Configuraciones

### 5.1 Archivos a Actualizar

Usaré scripts automatizados (siguiente paso) para actualizar:

**Backend (Lambdas):**
- ✅ `infrastructure/step-function.json`
- ✅ `lambda-initiator/index.js`
- ✅ `lambda-client-separator/index.js`
- ✅ `lambda-processor/index.js`
- ✅ `lambda-status-checker/index.js`
- ✅ `lambda-client-aggregator/index.js`
- ✅ `lambda-download-result/index.js`
- ✅ `lambda-excel-generator/index.js`
- ✅ `lambda-get-presigned-url/index.js`

**Frontend:**
- ✅ `FrontEnd-lambdas/src/services/lambdaService.js`
- ✅ `FrontEnd-lambdas/src/aws-config.js`

**Configuración:**
- ✅ `deployment/aws-permissions/*.json`

---

## 📋 PASO 6: Variables de Entorno en Lambda

Para cada Lambda, configurar las siguientes variables de entorno:

```bash
# Variables comunes
AWS_REGION=us-east-1
JOBS_TABLE=invenadro-jobs-dev
RESULTS_BUCKET=invenadro-results-dev
UPLOADS_BUCKET=invenadro-uploads-dev

# Variables específicas
STEP_FUNCTION_ARN=arn:aws:states:us-east-1:975130647458:stateMachine:InvenadroStateMachine
PROCESSOR_STEP_FUNCTION_ARN=arn:aws:states:us-east-1:975130647458:stateMachine:InvenadroStateMachine
```

---

## 📋 PASO 7: Configurar Permisos Resource-Based

```bash
# Permitir que API Gateway invoque las Lambdas
aws lambda add-permission \
  --function-name invenadro-dev-initiator \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:975130647458:<API_ID>/*/POST/calcular-redondeo"

# Repetir para todas las funciones que API Gateway invoca
```

---

## 📋 PASO 8: Configurar CORS en Lambdas y API Gateway

Actualizar en cada Lambda los `ALLOWED_ORIGINS` con:

```javascript
const ALLOWED_ORIGINS = [
    'http://invenadro-frontend-dev.s3-website-us-east-1.amazonaws.com',
    'http://localhost:3000',
    'http://localhost:3001'
];
```

---

## 📋 PASO 9: Desplegar Frontend

```bash
cd FrontEnd-lambdas
npm run build

# Subir a S3
aws s3 sync build/ s3://invenadro-frontend-dev --delete

# Configurar política de bucket público
aws s3api put-bucket-policy \
  --bucket invenadro-frontend-dev \
  --policy file://deployment/s3-frontend-policy.json
```

---

## 📋 PASO 10: Testing End-to-End

1. **Acceder al frontend**: `http://invenadro-frontend-dev.s3-website-us-east-1.amazonaws.com`
2. **Registrar un usuario** en Cognito
3. **Login**
4. **Subir archivo Excel de prueba**
5. **Verificar el flujo completo**

---

## 🔒 PASO 11: Seguridad Post-Deploy

### 11.1 Configurar Políticas de Bucket

```bash
# Solo permitir acceso desde la aplicación
aws s3api put-bucket-policy --bucket invenadro-uploads-dev --policy file://deployment/s3-uploads-policy.json
```

### 11.2 Habilitar CloudWatch Logs

Todas las Lambdas ya tienen permisos de logs, verificar que se estén creando correctamente.

### 11.3 Configurar Alertas

```bash
# Crear alarma para errores en Lambda
aws cloudwatch put-metric-alarm \
  --alarm-name invenadro-lambda-errors \
  --alarm-description "Alerta cuando hay errores en Lambdas" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

---

## 🎯 RESUMEN DE CAMBIOS

### Nombres de Recursos

| Tipo | Anterior | Nuevo |
|------|----------|-------|
| API Gateway | `8zck1369x8` | `<NUEVO_API_ID>` |
| User Pool | `us-east-1_UQ9eT0Tgn` | `<NUEVO_POOL_ID>` |
| Step Function | `FactorRedondeo` | `InvenadroStateMachine` |
| Lambda Prefix | `factor-redondeo-lambda-dev-*` | `invenadro-dev-*` |
| S3 Uploads | `factor-redondeo-lambda-uploads-dev` | `invenadro-uploads-dev` |
| S3 Results | `factor-redondeo-lambda-results-dev` | `invenadro-results-dev` |
| DynamoDB | `factor-redondeo-lambda-jobs-dev` | `invenadro-jobs-dev` |

---

## ⚠️ IMPORTANTE: Git y Deployment

### .gitignore

Agregar al `.gitignore`:

```
# Configuración local
deployment/config-environments.local.json
.env
.env.local

# Archivos de deployment
*.zip

# Build artifacts
FrontEnd-lambdas/build/
```

### Evitar Conflictos con el Otro Proyecto

1. **NO compartir el mismo repositorio Git** si tienen la misma configuración hardcodeada
2. **Usar ramas separadas** si deben estar en el mismo repo
3. **Documentar claramente** qué infraestructura usa cada proyecto
4. **Separar scripts de deployment** por proyecto

---

## 📝 Checklist Final

Antes de considerar la migración completa:

- [ ] Todos los buckets S3 creados con nombres únicos
- [ ] Tabla DynamoDB creada con nombre único
- [ ] User Pool de Cognito nuevo creado
- [ ] 8 funciones Lambda creadas con nombres únicos
- [ ] Step Function creada con nombre único
- [ ] API Gateway nuevo creado y configurado
- [ ] Cognito Authorizer configurado en API Gateway
- [ ] Todas las variables de entorno actualizadas
- [ ] Permisos resource-based configurados
- [ ] Frontend actualizado con nuevas URLs
- [ ] Frontend desplegado en bucket S3 nuevo
- [ ] Testing end-to-end exitoso
- [ ] CloudWatch logs funcionando
- [ ] Documentación actualizada

---

## 🚨 Si Algo Sale Mal

### Rollback Plan

1. **No borrar la infraestructura antigua** hasta confirmar que la nueva funciona
2. **Tener backup de configuraciones anteriores**
3. **Documentar todos los IDs generados** (API Gateway, Cognito, etc.)
4. **Probar primero en ambiente local con sam/localstack** si es posible

### Soporte

Si necesitas ayuda con algún paso específico, consulta:
- CloudWatch Logs para errores de Lambda
- API Gateway execution logs
- Step Functions execution history

---

## 📚 Próximos Pasos Después de la Migración

1. **Automatizar deployment** con scripts o IaC (Terraform/CDK)
2. **Configurar CI/CD** con GitHub Actions o similar
3. **Crear ambiente de staging** antes de producción
4. **Implementar monitoreo** con CloudWatch Dashboards
5. **Documentar runbooks** para operaciones comunes

---

¿Necesitas ayuda ejecutando algún paso específico? ¡Solo pregunta!

