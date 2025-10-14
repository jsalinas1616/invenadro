# 🚀 Quick Start - Infraestructura Independiente de Invenadro

## ⚡ Inicio Rápido (5 Pasos)

### Prerequisitos
- AWS CLI configurado con credenciales
- Node.js 20.x instalado
- jq instalado (`brew install jq` en macOS)
- Permisos de administrador en cuenta AWS

### 📋 Paso 1: Crear Infraestructura Base (10 min)

```bash
# Dar permisos de ejecución a los scripts
chmod +x deployment/scripts/*.sh

# Ejecutar script de infraestructura base
./deployment/scripts/1-create-infrastructure.sh
```

**Esto crea:**
- ✅ 3 buckets S3 (uploads, results, frontend)
- ✅ 1 tabla DynamoDB
- ✅ 2 IAM Roles (Lambda y Step Function)
- ✅ 1 Cognito User Pool con App Client

**Resultado esperado:**
```
✅ Infraestructura base creada exitosamente!
User Pool ID: us-east-1_XXXXXXXXX
Client ID: xxxxxxxxxxxxxxxxxxxx
```

⚠️ **IMPORTANTE**: Guarda estos IDs, los necesitarás en el Paso 3.

---

### 📋 Paso 2: Crear Funciones Lambda (5 min)

```bash
# Ejecutar script de creación de Lambdas
./deployment/scripts/2-create-lambdas.sh
```

**Esto crea/actualiza:**
- ✅ 8 funciones Lambda con configuración optimizada
- ✅ Variables de entorno configuradas
- ✅ Timeouts y memoria ajustados por función

---

### 📋 Paso 3: Actualizar Configuraciones (2 min)

```bash
# Ejecutar script de actualización de configs
./deployment/scripts/update-all-configs.sh
```

**El script te pedirá:**
1. API Gateway ID (déjalo por ahora, lo crearás en Paso 4)
2. Cognito User Pool ID (del Paso 1)
3. Cognito Client ID (del Paso 1)

**Esto actualiza:**
- ✅ Frontend con nuevos IDs de Cognito
- ✅ Lambdas con nuevos nombres de recursos
- ✅ Step Function con nuevos ARNs

---

### 📋 Paso 4: Crear API Gateway (MANUAL - 15 min)

Por ahora, crear manualmente desde consola AWS:

1. **Ir a API Gateway Console**
   - https://console.aws.amazon.com/apigateway

2. **Crear REST API**
   - Nombre: `Invenadro API`
   - Tipo: `REST API` (no HTTP API)

3. **Crear Resources y Methods:**

   | Resource | Method | Lambda Target | Auth |
   |----------|--------|---------------|------|
   | `/calcular-redondeo` | POST | `invenadro-dev-initiator` | Cognito |
   | `/calcular-redondeo/status/{processId}` | GET | `invenadro-dev-status-checker` | Cognito |
   | `/calcular-redondeo/download/{processId}` | GET | `invenadro-dev-download-result` | Cognito |
   | `/excel/{processId}/{clienteId}` | GET | `invenadro-dev-excel-generator` | Cognito |
   | `/get-presigned-url` | POST | `invenadro-dev-get-presigned-url` | Cognito |

4. **Crear Cognito Authorizer**
   - Name: `InvenadroAuth`
   - Type: `Cognito`
   - Cognito User Pool: Seleccionar el creado en Paso 1
   - Token Source: `Authorization`

5. **Configurar CORS en cada método**
   - Access-Control-Allow-Origin: `*` (o tu dominio específico)
   - Access-Control-Allow-Headers: `Content-Type,Authorization,X-Api-Key`
   - Access-Control-Allow-Methods: `GET,POST,OPTIONS`

6. **Deploy API**
   - Stage: `dev`
   - Guardar el **Invoke URL** (ej: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev`)

7. **Re-ejecutar script de actualización**
   ```bash
   ./deployment/scripts/update-all-configs.sh
   ```
   Esta vez proporciona el API Gateway ID que obtuviste.

---

### 📋 Paso 5: Crear Step Function y Desplegar (5 min)

```bash
# Obtener el ARN del role de Step Function
SF_ROLE_ARN=$(aws iam get-role --role-name invenadro-stepfunction-execution-role --query 'Role.Arn' --output text)

# Crear Step Function
aws stepfunctions create-state-machine \
  --name InvenadroStateMachine \
  --definition file://infrastructure/step-function.json \
  --role-arn ${SF_ROLE_ARN} \
  --region us-east-1

echo "✅ Step Function creada!"

# Re-desplegar Lambdas con configuraciones actualizadas
./deployment/scripts/2-create-lambdas.sh

# Build y deploy del frontend
cd FrontEnd-lambdas
npm install
npm run build

# Subir a S3
aws s3 sync build/ s3://invenadro-frontend-dev --delete

# Configurar bucket como website público
aws s3api put-bucket-policy --bucket invenadro-frontend-dev --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::invenadro-frontend-dev/*"
  }]
}'

echo "✅ Frontend desplegado!"
echo "🌐 URL: http://invenadro-frontend-dev.s3-website-us-east-1.amazonaws.com"
```

---

## 🎉 ¡Listo!

Tu infraestructura independiente está lista. Ahora puedes:

1. **Acceder al frontend:**
   ```
   http://invenadro-frontend-dev.s3-website-us-east-1.amazonaws.com
   ```

2. **Crear un usuario:**
   - Registrarse con email
   - Verificar código que llega por email
   - Login

3. **Probar el sistema:**
   - Subir archivo Excel
   - Monitorear el proceso
   - Descargar resultados

---

## 🔧 Troubleshooting

### Error: "User Pool not found"
```bash
# Listar User Pools
aws cognito-idp list-user-pools --max-results 60 --region us-east-1
```

### Error: "Lambda execution failed"
```bash
# Ver logs de Lambda
aws logs tail /aws/lambda/invenadro-dev-initiator --follow
```

### Error: "CORS issues"
Verificar en cada Lambda que `ALLOWED_ORIGINS` incluye tu frontend URL.

### Error: "Cognito Authorizer failed"
1. Verificar que el token JWT está en el header `Authorization: Bearer <token>`
2. Verificar que el Authorizer en API Gateway está configurado correctamente
3. Verificar que el User Pool ID es el correcto

---

## 📊 Verificación Post-Deployment

```bash
# Verificar que todos los recursos existen
echo "Verificando S3 buckets..."
aws s3 ls | grep invenadro

echo "Verificando DynamoDB..."
aws dynamodb describe-table --table-name invenadro-jobs-dev --query 'Table.TableStatus'

echo "Verificando Lambdas..."
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `invenadro-dev`)].FunctionName' --output table

echo "Verificando Step Function..."
aws stepfunctions list-state-machines --query 'stateMachines[?name==`InvenadroStateMachine`].name'

echo "✅ Verificación completa!"
```

---

## 📝 Comandos Útiles

### Re-desplegar una Lambda específica
```bash
cd lambda-initiator
zip -r lambda-initiator-deploy.zip . -x "*.git*" "*.zip"
aws lambda update-function-code \
  --function-name invenadro-dev-initiator \
  --zip-file fileb://lambda-initiator-deploy.zip
```

### Ver logs en tiempo real
```bash
aws logs tail /aws/lambda/invenadro-dev-processor --follow
```

### Verificar ejecución de Step Function
```bash
# Listar últimas ejecuciones
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:975130647458:stateMachine:InvenadroStateMachine \
  --max-results 5
```

### Limpiar todo (CUIDADO!)
```bash
# ⚠️ Esto BORRA toda la infraestructura
./deployment/scripts/cleanup-all.sh
```

---

## 🔒 Seguridad Post-Deployment

1. **Restringir CORS:**
   Cambiar en todas las Lambdas de:
   ```javascript
   const ALLOWED_ORIGINS = ['*'];
   ```
   a:
   ```javascript
   const ALLOWED_ORIGINS = [
     'http://invenadro-frontend-dev.s3-website-us-east-1.amazonaws.com',
     'https://tu-dominio.com'
   ];
   ```

2. **Configurar MFA en Cognito:**
   ```bash
   aws cognito-idp set-user-pool-mfa-config \
     --user-pool-id <USER_POOL_ID> \
     --mfa-configuration OPTIONAL \
     --software-token-mfa-configuration Enabled=true
   ```

3. **Habilitar CloudTrail:**
   Para auditoría de todas las acciones en AWS.

---

## 🎯 Diferencias vs Proyecto Original

| Aspecto | Proyecto Original | Invenadro (Este) |
|---------|-------------------|------------------|
| API Gateway | `8zck1369x8` | `<nuevo_id>` |
| Lambda Prefix | `factor-redondeo-lambda-dev-*` | `invenadro-dev-*` |
| S3 Buckets | `factor-redondeo-lambda-*` | `invenadro-*` |
| DynamoDB | `factor-redondeo-lambda-jobs-dev` | `invenadro-jobs-dev` |
| Step Function | `FactorRedondeo` | `InvenadroStateMachine` |
| Cognito | Pool compartido | Pool independiente |

**Resultado:** ✅ Infraestructura 100% independiente, sin riesgo de conflictos.

---

¿Problemas? Consulta `deployment/MIGRATION_PLAN.md` para más detalles.

