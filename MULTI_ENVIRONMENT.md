# Configuración Multi-Ambiente - Invenadro

## Ambientes Disponibles

Este proyecto soporta **4 ambientes**:

| Ambiente | Branch | Cuenta AWS | Stage | Propósito |
|----------|--------|------------|-------|-----------|
| **jul-dev** | `dev` | 975130647458 (Cuenta 1) | `jul-dev` | Desarrollo (Julio) |
| **jul-qa** | `qa` | 975130647458 (Cuenta 1) | `jul-qa` | QA (Julio) |
| **nadro-qa** | `nadro-qa` | TBD (Cuenta Nadro) | `nadro-qa` | QA (Nadro) |
| **nadro-prod** | `main` | TBD (Cuenta Nadro) | `nadro-prod` | Producción (Nadro) |

---

## ️ Arquitectura Multi-Ambiente

### Backend
El backend usa **Serverless Framework** con stages:
- Cada ambiente tiene su propia configuración en `services/backend/serverless.yml`
- Los recursos se nombran con el pattern: `invenadro-backend-{STAGE}-*`
- Ejemplo: `invenadro-backend-jul-dev-initiator`

### Frontend
El frontend usa **configuración dinámica** por ambiente:
- Archivo central: `FrontEnd-lambdas/src/config/environments.js`
- Detección automática del ambiente en 3 formas:
 1. **Build-time**: Variable `REACT_APP_STAGE` (recomendado)
 2. **Runtime**: Análisis del hostname/URL
 3. **Fallback**: `jul-dev` por defecto

---

## Configuración de Ambientes

### Archivo: `FrontEnd-lambdas/src/config/environments.js`

```javascript
const environments = {
 'jul-dev': {
 apiGateway: { url: 'https://xxx.execute-api.mx-central-1.amazonaws.com/jul-dev' },
 cognito: { 
 userPoolId: 'mx-central-1_XXXXX',
 clientId: 'xxxxx'
 },
 s3: {
 resultsBucket: 'invenadro-backend-jul-dev-results',
 uploadsBucket: 'invenadro-backend-jul-dev-uploads'
 },
 // ...
 },
 'jul-qa': { /* ... */ },
 'nadro-qa': { /* ... */ },
 'nadro-prod': { /* ... */ }
}
```

### Detección Automática

El sistema detecta el ambiente en este orden:

1. **Variable de entorno** (build-time):
 ```bash
 REACT_APP_STAGE=jul-qa npm run build
 ```

2. **Hostname** (runtime):
 - `xxx.cloudfront.net` → detecta por path/subdomain
 - `localhost` → siempre `jul-dev`

3. **Fallback**: Si no detecta nada, usa `jul-dev`

---

## Deployment

### Opción 1: GitHub Actions (Recomendado)

Simplemente haz push a la branch correspondiente:

```bash
# Deploy a DEV
git push origin dev

# Deploy a QA
git push origin qa

# Deploy a Nadro QA
git push origin nadro-qa

# Deploy a Producción
git push origin main
```

El workflow automáticamente:
1. Detecta el ambiente por la branch
2. Usa las credenciales AWS correctas (GitHub Secrets)
3. Despliega backend y frontend con la configuración correcta

### Opción 2: Manual

```bash
# 1. Exportar el ambiente
export STAGE=jul-dev

# 2. Deploy Backend
cd services/backend
npx serverless deploy --stage $STAGE

# 3. Build Frontend
cd ../../FrontEnd-lambdas
REACT_APP_STAGE=$STAGE npm run build

# 4. Deploy Frontend
cd ../services/frontend
npx serverless deploy --stage $STAGE
```

---

## Credenciales AWS

### GitHub Secrets por Ambiente

Cada ambiente necesita sus propias credenciales:

| Ambiente | Secret Key ID | Secret Access Key |
|----------|--------------|-------------------|
| jul-dev | `AWS_ACCESS_KEY_ID_DEV` | `AWS_SECRET_ACCESS_KEY_DEV` |
| jul-qa | `AWS_ACCESS_KEY_ID_QA` | `AWS_SECRET_ACCESS_KEY_QA` |
| nadro-qa | `AWS_ACCESS_KEY_ID_NADRO_QA` | `AWS_SECRET_ACCESS_KEY_NADRO_QA` |
| nadro-prod | `AWS_ACCESS_KEY_ID_PROD` | `AWS_SECRET_ACCESS_KEY_PROD` |

### Crear Usuario IAM

Para cada ambiente, necesitas:

```bash
# 1. Crear usuario
aws iam create-user --user-name github-actions-jul-dev

# 2. Aplicar políticas (2 por ambiente)
aws iam put-user-policy \
 --user-name github-actions-jul-dev \
 --policy-name InvenadroJulDevCompute \
 --policy-document file://permisos/01-github-actions/invenadro-jul-dev-policy-part1-compute.json

aws iam put-user-policy \
 --user-name github-actions-jul-dev \
 --policy-name InvenadroJulDevInfra \
 --policy-document file://permisos/01-github-actions/invenadro-jul-dev-policy-part2-infrastructure.json

# 3. Crear Access Keys
aws iam create-access-key --user-name github-actions-jul-dev
```

Ver documentación completa en: `permisos/01-github-actions/README.md`

---

## Flujo de Trabajo

### Desarrollo (jul-dev)
```
Desarrollador → git push origin dev
 ↓
 GitHub Actions
 ↓
 Backend Deploy (jul-dev)
 ↓
 Frontend Build (REACT_APP_STAGE=jul-dev)
 ↓
 Frontend Deploy (jul-dev)
 ↓
 CloudFront Distribution
 ↓
 URL Pública
```

### QA (jul-qa)
```
QA Team → git push origin qa
 ↓
 GitHub Actions
 ↓
 Backend Deploy (jul-qa)
 ↓
 Frontend Build (REACT_APP_STAGE=jul-qa)
 ↓
 Frontend Deploy (jul-qa)
 ↓
 CloudFront Distribution
 ↓
 URL Pública
```

---

## Recursos por Ambiente

Cada ambiente crea su propio conjunto de recursos AWS:

### Backend Resources
- **Lambda Functions**: `invenadro-backend-{STAGE}-*`
 - initiator
 - client-separator
 - processor
 - status-checker
 - client-aggregator
 - download-result
 - excel-generator
 - get-presigned-url

- **S3 Buckets**:
 - `invenadro-backend-{STAGE}-uploads`
 - `invenadro-backend-{STAGE}-results`
 - `invenadro-backend-{STAGE}-s3-logs`

- **DynamoDB Tables**:
 - `invenadro-backend-{STAGE}-jobs`

- **Step Functions**:
 - `invenadro-backend-{STAGE}`

- **API Gateway**:
 - `invenadro-backend-{STAGE}`

- **Cognito User Pool**:
 - `invenadro-backend-{STAGE}-users`

### Frontend Resources
- **S3 Bucket**: `invenadro-frontend-{STAGE}`
- **CloudFront Distribution**: Único por ambiente
- **CloudFront OAI**: Para acceso privado S3

---

## Debugging

### Ver configuración detectada

Abre la consola del navegador (F12) y verás logs como:

```
 Ambiente detectado por REACT_APP_STAGE: jul-dev
 Lambda Service configurado para ambiente: jul-dev (Desarrollo (Julio))
 API Gateway: https://c9nzcqgz16.execute-api.mx-central-1.amazonaws.com/jul-dev
 Cognito configurado para ambiente: jul-dev (Desarrollo (Julio))
 User Pool: mx-central-1_WIAYTqFq7
```

### Verificar ambiente en runtime

```javascript
import { getCurrentEnvironment } from './config/environments';

const env = getCurrentEnvironment();
console.log('Ambiente actual:', env.name);
console.log('API Gateway:', env.apiGateway.url);
```

### Ver info de deployment

```bash
# Backend
cd services/backend
npx serverless info --stage jul-dev

# Frontend
cd services/frontend
npx serverless info --stage jul-dev
```

---

## ️ Notas Importantes

### 1. Placeholders en Configuración

Los ambientes `jul-qa`, `nadro-qa` y `nadro-prod` tienen **PLACEHOLDERS** en:
- URLs de API Gateway
- IDs de Cognito User Pool
- ARNs de Step Functions
- Account IDs

**Estos deben actualizarse después del primer deployment**.

### 2. Actualizar Configuración Post-Deploy

Después de deployar un ambiente nuevo:

```bash
# 1. Obtener las URLs del backend
cd services/backend
npx serverless info --stage jul-qa

# 2. Actualizar FrontEnd-lambdas/src/config/environments.js
# con las URLs reales

# 3. Re-build y re-deploy el frontend
cd ../../FrontEnd-lambdas
REACT_APP_STAGE=jul-qa npm run build
cd ../services/frontend
npx serverless deploy --stage jul-qa
```

### 3. Rollback

Para hacer rollback de un ambiente:

```bash
# Backend
cd services/backend
npx serverless rollback --stage jul-dev --timestamp TIMESTAMP

# Frontend (re-deploy versión anterior)
git checkout PREVIOUS_COMMIT
REACT_APP_STAGE=jul-dev npm run build
cd services/frontend
npx serverless deploy --stage jul-dev
```

---

## Referencias

- **Permisos IAM**: `permisos/01-github-actions/README.md`
- **Backend Config**: `services/backend/serverless.yml`
- **Frontend Config**: `FrontEnd-lambdas/src/config/environments.js`
- **Workflows**: `.github/workflows/`

---

## Checklist para Nuevo Ambiente

- [ ] Crear branch en Git (ej: `nadro-qa`)
- [ ] Crear usuario IAM con permisos
- [ ] Agregar credenciales a GitHub Secrets
- [ ] Crear workflow en `.github/workflows/deploy-{env}.yml`
- [ ] Deploy inicial del backend
- [ ] Obtener URLs y IDs del backend
- [ ] Actualizar `FrontEnd-lambdas/src/config/environments.js`
- [ ] Re-deploy del frontend
- [ ] Crear usuarios en Cognito User Pool
- [ ] Probar aplicación end-to-end
- [ ] Documentar URLs públicas del ambiente

