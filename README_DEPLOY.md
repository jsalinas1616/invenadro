# 🚀 Guía de Deployment - Invenadro

## Deployment Automático con Git + GitHub Actions

---

## 🎯 TL;DR - Deployment en 1 Comando

```bash
git push origin dev
```

**¡Y listo!** GitHub Actions despliega todo automáticamente. ✨

---

## 📋 Tabla de Contenidos

1. [Cómo Funciona el Deployment Automático](#cómo-funciona-el-deployment-automático)
2. [Ambientes y Branches](#ambientes-y-branches)
3. [Paso a Paso: Qué Pasa Cuando Haces Push](#paso-a-paso-qué-pasa-cuando-haces-push)
4. [Ver el Progreso del Deployment](#ver-el-progreso-del-deployment)
5. [Después del Deployment](#después-del-deployment)
6. [Crear un Ambiente Nuevo](#crear-un-ambiente-nuevo)
7. [Troubleshooting](#troubleshooting)

---

## 🔄 Cómo Funciona el Deployment Automático

### Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│  TU LOCAL                                                   │
│                                                             │
│  git add .                                                  │
│  git commit -m "feat: nueva funcionalidad"                 │
│  git push origin dev                    ← SOLO ESTO HACES  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS (Automático)                                │
│                                                             │
│  1. ✅ Detecta push a branch 'dev'                          │
│  2. ✅ Inicia workflow: deploy-dev.yml                      │
│  3. ✅ Usa credenciales: AWS_ACCESS_KEY_ID_DEV              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS - DEPLOYMENT BACKEND (3-4 min)                         │
│                                                             │
│  ✅ Deploy 8 Lambda Functions                               │
│  ✅ Deploy API Gateway                                      │
│  ✅ Deploy Step Functions                                   │
│  ✅ Deploy DynamoDB Table                                   │
│  ✅ Deploy S3 Buckets (3)                                   │
│  ✅ Deploy Cognito User Pool                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  BUILD FRONTEND (1-2 min)                                   │
│                                                             │
│  ✅ npm install                                             │
│  ✅ REACT_APP_STAGE=jul-dev npm run build                   │
│  ✅ Frontend detecta ambiente automáticamente               │
│  ✅ Carga config de environments.js[jul-dev]                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS - DEPLOYMENT FRONTEND (2-3 min)                        │
│                                                             │
│  ✅ Deploy S3 Bucket (website)                              │
│  ✅ Upload archivos del build                               │
│  ✅ Deploy CloudFront Distribution                          │
│  ✅ Invalidate CloudFront cache                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ✅ DEPLOYMENT COMPLETO                                     │
│                                                             │
│  Frontend:  https://d3qyx007nie7k5.cloudfront.net          │
│  Backend:   https://c9nzcqgz16.../jul-dev                  │
│  Cognito:   mx-central-1_WIAYTqFq7                          │
│                                                             │
│  ¡Aplicación funcionando end-to-end! 🎉                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌍 Ambientes y Branches

| Ambiente | Branch | Stage | Workflow | Tiempo Estimado |
|----------|--------|-------|----------|-----------------|
| **Desarrollo (Julio)** | `dev` | `jul-dev` | `deploy-dev.yml` | ~6-8 min |
| **QA (Julio)** | `qa` | `jul-qa` | `deploy-qa.yml` | ~6-8 min |
| **QA (Nadro)** | `nadro-qa` | `nadro-qa` | `deploy-nadro-qa.yml` | ~6-8 min |
| **Producción (Nadro)** | `main` | `nadro-prod` | `deploy-prod.yml` | ~6-8 min |

### Ejemplo de Uso

```bash
# Deploy a Desarrollo
git push origin dev

# Deploy a QA
git push origin qa

# Deploy a Producción (¡cuidado!)
git push origin main
```

---

## 📝 Paso a Paso: Qué Pasa Cuando Haces Push

### 1️⃣ **Push Local → GitHub**

```bash
git push origin dev
```

**Qué pasa**:
- ✅ Git sube tus commits a GitHub
- ✅ GitHub detecta cambios en branch `dev`
- ✅ Trigger automático del workflow

**Tiempo**: ~5 segundos

---

### 2️⃣ **GitHub Actions Inicia**

**Archivo ejecutado**: `.github/workflows/deploy-dev.yml`

**Variables de ambiente**:
```yaml
AWS_REGION: mx-central-1
STAGE: jul-dev
```

**Credenciales AWS**:
- `AWS_ACCESS_KEY_ID_DEV` (GitHub Secret)
- `AWS_SECRET_ACCESS_KEY_DEV` (GitHub Secret)

**Tiempo**: ~10 segundos (setup)

---

### 3️⃣ **Deploy Backend**

```bash
cd services/backend
npx serverless deploy --stage jul-dev --verbose
```

**Qué despliega**:

| Recurso | Nombre | Descripción |
|---------|--------|-------------|
| **Lambda: Initiator** | `invenadro-backend-jul-dev-initiator` | Punto de entrada del proceso |
| **Lambda: Client Separator** | `invenadro-backend-jul-dev-client-separator` | Separa datos por cliente |
| **Lambda: Processor** | `invenadro-backend-jul-dev-processor` | Motor de optimización |
| **Lambda: Status Checker** | `invenadro-backend-jul-dev-status-checker` | Monitoreo de estado |
| **Lambda: Client Aggregator** | `invenadro-backend-jul-dev-client-aggregator` | Consolida resultados |
| **Lambda: Download Result** | `invenadro-backend-jul-dev-download-result` | Genera respuesta |
| **Lambda: Excel Generator** | `invenadro-backend-jul-dev-excel-generator` | Genera Excel por cliente |
| **Lambda: Get Presigned URL** | `invenadro-backend-jul-dev-get-presigned-url` | URLs firmadas para S3 |
| **API Gateway** | `invenadro-backend-jul-dev` | API REST con Cognito Auth |
| **Step Functions** | `invenadro-backend-jul-dev-StateMachine` | Orquestación del workflow |
| **DynamoDB Table** | `invenadro-backend-jul-dev-jobs` | Tracking de procesos |
| **S3 Uploads Bucket** | `invenadro-backend-jul-dev-uploads` | Archivos subidos |
| **S3 Results Bucket** | `invenadro-backend-jul-dev-results` | Resultados procesados |
| **S3 Logs Bucket** | `invenadro-backend-jul-dev-s3-logs` | Logs de acceso |
| **Cognito User Pool** | `invenadro-backend-jul-dev-users` | Autenticación de usuarios |
| **Cognito Client** | `invenadro-backend-jul-dev-client` | App client |
| **IAM Roles** | Varios roles | Permisos para lambdas |

**Outputs importantes**:
```
API Gateway URL: https://c9nzcqgz16.execute-api.mx-central-1.amazonaws.com/jul-dev
Cognito User Pool: mx-central-1_WIAYTqFq7
Cognito Client ID: jo46f6pkduolu7hdb02geo0tj
```

**Tiempo**: ~3-4 minutos

---

### 4️⃣ **Build Frontend**

```bash
cd FrontEnd-lambdas
REACT_APP_STAGE=jul-dev npm run build
```

**Qué pasa**:

1. **Instala dependencias**:
   ```bash
   npm install
   ```

2. **Build con ambiente**:
   ```bash
   REACT_APP_STAGE=jul-dev npm run build
   ```

3. **Frontend detecta ambiente**:
   ```javascript
   // FrontEnd-lambdas/src/config/environments.js
   const envStage = process.env.REACT_APP_STAGE; // "jul-dev"
   return environments[envStage]; // Config de jul-dev
   ```

4. **Carga configuración correcta**:
   ```javascript
   {
     apiGateway: {
       url: 'https://c9nzcqgz16.../jul-dev' // ✅ Correcto
     },
     cognito: {
       userPoolId: 'mx-central-1_WIAYTqFq7' // ✅ Correcto
     }
   }
   ```

5. **Genera archivos optimizados**:
   - HTML, CSS, JS minificados
   - Source maps
   - Assets optimizados

**Output**: Carpeta `build/` lista para deployment

**Tiempo**: ~1-2 minutos

---

### 5️⃣ **Deploy Frontend**

```bash
cd services/frontend
npx serverless deploy --stage jul-dev --verbose
```

**Qué despliega**:

| Recurso | Nombre | Descripción |
|---------|--------|-------------|
| **S3 Bucket** | `invenadro-frontend-jul-dev` | Hosting del frontend |
| **Bucket Policy** | `FrontendBucketPolicy` | Acceso público |
| **CloudFront Distribution** | `d3qyx007nie7k5` | CDN global |

**Proceso**:

1. **Crear/Actualizar S3 Bucket**:
   - Configurado como website
   - IndexDocument: `index.html`
   - ErrorDocument: `index.html` (para SPA routing)

2. **Subir archivos**:
   ```bash
   # Plugin: serverless-s3-sync
   Uploading: index.html
   Uploading: static/js/*.js
   Uploading: static/css/*.css
   Uploading: assets/*
   ```

3. **Configurar CloudFront**:
   - Origin: S3 Website
   - Custom error responses (403, 404 → index.html)
   - Cache behaviors
   - HTTPS redirect

4. **Invalidar caché**:
   ```bash
   # Plugin: serverless-cloudfront-invalidate
   Creating invalidation for paths: /*
   ```

**Outputs importantes**:
```
CloudFront URL: https://d3qyx007nie7k5.cloudfront.net
S3 Website URL: http://invenadro-frontend-jul-dev.s3-website.mx-central-1.amazonaws.com
```

**Tiempo**: ~2-3 minutos

---

### 6️⃣ **Deployment Info**

```bash
# Backend info
cd services/backend
npx serverless info --stage jul-dev

# Frontend info
cd services/frontend
npx serverless info --stage jul-dev
```

**Muestra**:
- ✅ Endpoints deployados
- ✅ Funciones deployadas
- ✅ URLs públicas
- ✅ CloudFormation stack name

**Tiempo**: ~10 segundos

---

### 7️⃣ **Notificación de Éxito**

```bash
✅ Deployment to jul-dev completed successfully!
🚀 Check your AWS console for the deployed resources
```

**GitHub Actions**:
- ✅ Status: Success (verde)
- ✅ Log completo disponible
- ✅ Artifacts disponibles (si aplica)

---

## 👀 Ver el Progreso del Deployment

### Opción 1: GitHub Actions UI

1. Ve a: https://github.com/jsalinas1616/invenadro/actions
2. Haz clic en el workflow más reciente
3. Ve el progreso en tiempo real

**Ejemplo**:
```
✓ Checkout code (5s)
✓ Setup Node.js (10s)
✓ Configure AWS Credentials (2s)
✓ Install dependencies (20s)
⏳ Deploy Backend (3m 45s) ← En progreso
⏸ Build Frontend (esperando)
⏸ Deploy Frontend (esperando)
```

---

### Opción 2: AWS Console

#### Backend (CloudFormation)

1. Ve a: https://mx-central-1.console.aws.amazon.com/cloudformation
2. Busca stack: `invenadro-backend-jul-dev`
3. Ve eventos en tiempo real

**Estados**:
- `CREATE_IN_PROGRESS` → Creando
- `CREATE_COMPLETE` → ✅ Creado
- `UPDATE_IN_PROGRESS` → Actualizando
- `UPDATE_COMPLETE` → ✅ Actualizado

#### Frontend (S3 + CloudFront)

1. **S3**: https://s3.console.aws.amazon.com/s3/buckets/invenadro-frontend-jul-dev
2. **CloudFront**: https://console.aws.amazon.com/cloudfront

---

### Opción 3: Terminal Local

```bash
# Ver logs de backend deployment
cd services/backend
npx serverless deploy --stage jul-dev --verbose

# Ver logs de una lambda específica
npx serverless logs -f initiator --stage jul-dev --tail

# Ver estado del stack
aws cloudformation describe-stacks \
  --stack-name invenadro-backend-jul-dev \
  --region mx-central-1 \
  --query 'Stacks[0].StackStatus'
```

---

## ✅ Después del Deployment

### 1️⃣ **Obtener URLs**

```bash
# Ver info completa
cd services/backend && npx serverless info --stage jul-dev
cd ../frontend && npx serverless info --stage jul-dev
```

**O en GitHub Actions log**:
```
CloudFront Distribution URL: https://d3qyx007nie7k5.cloudfront.net
API Gateway URL: https://c9nzcqgz16.../jul-dev
```

---

### 2️⃣ **Probar la Aplicación**

1. **Abrir frontend**:
   ```
   https://d3qyx007nie7k5.cloudfront.net
   ```

2. **Verificar en consola del navegador** (F12):
   ```
   🌍 Ambiente detectado por REACT_APP_STAGE: jul-dev
   🌍 Lambda Service configurado para ambiente: jul-dev
   📡 API Gateway: https://c9nzcqgz16.../jul-dev
   🔐 Cognito configurado para ambiente: jul-dev
   👤 User Pool: mx-central-1_WIAYTqFq7
   ```

3. **Login**:
   - Usa credenciales de Cognito
   - Primera vez: crear usuario en AWS Console

---

### 3️⃣ **Crear Usuario de Prueba**

```bash
aws cognito-idp admin-create-user \
  --user-pool-id mx-central-1_WIAYTqFq7 \
  --username test@ejemplo.com \
  --user-attributes Name=email,Value=test@ejemplo.com \
  --temporary-password TempPass123!
```

---

### 4️⃣ **Probar End-to-End**

1. ✅ Login con Cognito
2. ✅ Subir archivo Excel
3. ✅ Ver progreso del procesamiento
4. ✅ Descargar resultados
5. ✅ Descargar Excel por cliente

---

## 🆕 Crear un Ambiente Nuevo

### Ejemplo: Crear `jul-qa`

```bash
# 1. Crear branch
git checkout -b qa

# 2. Push (esto deployará automáticamente si existe deploy-qa.yml)
git push origin qa

# O manualmente:
# Deploy backend
cd services/backend
npx serverless deploy --stage jul-qa

# Actualizar config frontend automáticamente
cd ../..
./scripts/update-frontend-config.sh jul-qa

# Commit cambios
git add FrontEnd-lambdas/src/config/environments.js
git commit -m "chore: Actualizar config jul-qa"

# Build frontend
cd FrontEnd-lambdas
REACT_APP_STAGE=jul-qa npm run build

# Deploy frontend
cd ../services/frontend
npx serverless deploy --stage jul-qa
```

---

## 🐛 Troubleshooting

### Error: "Deployment failed"

**Ver logs**:
```bash
# En GitHub Actions
https://github.com/jsalinas1616/invenadro/actions

# En CloudFormation
aws cloudformation describe-stack-events \
  --stack-name invenadro-backend-jul-dev \
  --region mx-central-1
```

---

### Error: "User not authorized"

**Verificar credenciales**:
```bash
# Verificar identidad
aws sts get-caller-identity

# Verificar que estás usando el perfil correcto
aws configure list
```

**Solución**:
- Verificar que GitHub Secrets están configurados
- Verificar permisos IAM en `permisos/01-github-actions/`

---

### Error: "KMSAccessDeniedException" o "Lambda was unable to decrypt the environment variables"

**Síntoma**:
```
Error: Lambda.KMSAccessDeniedException
Cause: User: ... is not authorized to perform: kms:Decrypt
```

**Problema**:
- AWS Lambda encripta automáticamente las variables de entorno con KMS
- La clave KMS AWS-managed tiene políticas restrictivas
- Cuando Step Functions invoca Lambda, falla el descifrado de env vars

**Solución (⚠️ EJECUTAR UNA SOLA VEZ CON USUARIO ADMIN)**:

```bash
# Desde la raíz del proyecto
# ⚠️ REQUIERE usuario con permisos admin (kms:PutKeyPolicy)
AWS_PROFILE=tu-perfil-admin ./scripts/fix-kms-key-policy.sh
```

**¿Cuándo ejecutarlo?**:
- ✅ **UNA VEZ** al deployar por primera vez en una cuenta AWS
- ✅ Si ves el error `KMSAccessDeniedException` en Step Functions
- ❌ **NO** es necesario ejecutarlo en cada deploy (solo la primera vez)

**¿Por qué requiere admin?**:
- El script modifica la key policy de la clave KMS AWS-managed
- Solo usuarios con `kms:PutKeyPolicy` pueden modificar key policies
- Después de ejecutarlo una vez, GitHub Actions puede deployar sin problemas

**Nota**: 
- Para `jul-dev` y `jul-qa` (misma cuenta): Ejecutar 1 vez
- Para `nadro-qa` y `nadro-prod` (cuentas diferentes): Ejecutar en cada cuenta

**Verificar que funcionó**:
```bash
# Subir un Excel desde el frontend
# Si el Step Function completa sin error → ✅ Funcionó
```

---

### Error: "Stack does not exist"

**Primera vez deployando**:
```bash
# Es normal, CloudFormation creará el stack
# Esperar a que termine el deployment
```

---

### Frontend no carga o muestra errores

**Verificar**:
1. **Consola del navegador** (F12):
   ```
   ¿Aparece "🌍 Ambiente detectado"?
   ¿Las URLs son correctas?
   ```

2. **Network tab**:
   ```
   ¿Las llamadas a API fallan?
   ¿Hay errores CORS?
   ```

3. **CloudFront**:
   ```bash
   # Invalidar caché si no ves cambios
   aws cloudfront create-invalidation \
     --distribution-id d3qyx007nie7k5 \
     --paths "/*"
   ```

---

### CloudFront tarda en actualizar

**Normal**: CloudFront puede tardar 10-15 minutos en propagarse globalmente.

**Soluciones**:
```bash
# Usar URL de S3 directamente (sin CDN)
http://invenadro-frontend-jul-dev.s3-website.mx-central-1.amazonaws.com

# O invalidar caché
aws cloudfront create-invalidation \
  --distribution-id d3qyx007nie7k5 \
  --paths "/*"
```

---

## 📊 Resumen del Proceso

| Paso | Acción | Automático | Tiempo |
|------|--------|------------|--------|
| 1 | Push a GitHub | Manual | 5 seg |
| 2 | GitHub Actions inicia | ✅ Sí | 10 seg |
| 3 | Deploy Backend | ✅ Sí | 3-4 min |
| 4 | Build Frontend | ✅ Sí | 1-2 min |
| 5 | Deploy Frontend | ✅ Sí | 2-3 min |
| 6 | Deployment Info | ✅ Sí | 10 seg |
| **TOTAL** | | **✅ 100% Automático** | **~6-8 min** |

---

## 🎯 Comandos Rápidos

### Ver último deployment
```bash
# GitHub Actions
https://github.com/jsalinas1616/invenadro/actions

# CloudFormation
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `invenadro`)].{Name:StackName,Status:StackStatus,Time:LastUpdatedTime}' \
  --output table
```

### Ver recursos deployados
```bash
# Backend
cd services/backend
npx serverless info --stage jul-dev

# Frontend
cd services/frontend
npx serverless info --stage jul-dev
```

### Ver logs en tiempo real
```bash
# Lambda específica
npx serverless logs -f initiator --stage jul-dev --tail

# Todos los logs
aws logs tail /aws/lambda/invenadro-backend-jul-dev-initiator --follow
```

---

## 📚 Documentación Relacionada

- **README Principal**: [`README.md`](./README.md)
- **Multi-Ambiente**: [`MULTI_ENVIRONMENT.md`](./MULTI_ENVIRONMENT.md)
- **Scripts Automáticos**: [`scripts/README.md`](./scripts/README.md)
- **Permisos IAM**: [`permisos/01-github-actions/README.md`](./permisos/01-github-actions/README.md)

---

## ✨ Conclusión

**¿Cómo hacer deployment?**

```bash
git push origin dev
```

**¿Qué pasa?**
1. ✅ GitHub Actions detecta push
2. ✅ Despliega backend (8 lambdas + infra)
3. ✅ Builds frontend con ambiente correcto
4. ✅ Despliega frontend a CloudFront
5. ✅ Todo conectado automáticamente

**¿Cuánto tarda?**
- ~6-8 minutos total

**¿Qué obtienes?**
- ✅ Aplicación funcionando end-to-end
- ✅ Frontend en CloudFront (CDN global)
- ✅ Backend en AWS (serverless)
- ✅ Todo configurado correctamente

---

**¡Es así de simple!** 🚀🎉

