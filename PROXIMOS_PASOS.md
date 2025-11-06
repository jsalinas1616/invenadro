# 🎯 Próximos Pasos - Invenadro

## ✅ ¡Migración Completada!

La estructura del proyecto ha sido completamente migrada a **Serverless Framework + GitHub Actions**.

---

## 📋 Lo que se ha hecho

### ✅ Estructura creada
- `services/simplicidad/` - Servicio backend completo
- `serverless.yml` - Configuración principal con 8 Lambdas
- `resources/` - DynamoDB, S3, Cognito, IAM (CloudFormation)
- `stepfunctions/` - Step Function definition (YAML)
- `.github/workflows/` - CI/CD automático para dev, qa, prod

### ✅ Funciones migradas
Las 8 funciones Lambda han sido movidas a `services/simplicidad/functions/`:
- `initiator/`
- `client-separator/`
- `processor/`
- `status-checker/`
- `client-aggregator/`
- `download-result/`
- `excel-generator/`
- `get-presigned-url/`

### ✅ Documentación actualizada
- `README.md` - Guía rápida
- `docs/DEPLOY.md` - Guía completa de deployment
- `docs/ARCHITECTURE.md` - Arquitectura detallada

### ✅ Archivos obsoletos eliminados
- `deployment/` - Scripts bash viejos
- `lambda-*/` movidas a nueva estructura
- Documentación vieja

---

## 🚀 Siguiente: Primer Deploy

### 1. Instalar TODAS las dependencias
```bash
# Comando mágico que instala todo
npm run install:all

# Esto instala:
# - Root dependencies
# - Backend (services/simplicidad)
# - Frontend service (services/frontend)
# - React app (FrontEnd-lambdas)
```

### 2. Configurar variables de ambiente
```bash
# Copiar template
cp .env.template .env.dev

# Editar con tus valores
# Mínimo necesario:
# AWS_ACCOUNT_ID=tu-account-id-aqui
# AWS_REGION=us-east-1
```

### 3. Hacer primer deploy COMPLETO (Backend + Frontend)
```bash
# Opción A: Deploy TODO de una vez (recomendado)
npm run deploy:all:dev

# Opción B: Deploy paso a paso
npm run deploy:simplicidad:dev    # Backend primero
npm run deploy:frontend:dev       # Frontend después
```

**Tiempo estimado:** 
- Backend: 5-10 minutos
- Frontend: 3-5 minutos
- **Total: ~10-15 minutos**

### 4. Verificar deployment

#### Backend:
```bash
npm run info:backend:dev
```

Deberías ver:
- ✅ API Gateway URL
- ✅ Cognito User Pool ID
- ✅ S3 Buckets (uploads, results)
- ✅ DynamoDB Table
- ✅ Step Function ARN

#### Frontend:
```bash
npm run info:frontend:dev
```

Deberías ver:
- ✅ S3 Bucket (frontend)
- ✅ CloudFront Distribution ID
- ✅ CloudFront URL (https://d123456.cloudfront.net)

### 5. Probar la aplicación

```bash
# Obtener la URL del frontend
cd services/frontend
serverless info --stage dev | grep "CloudFront URL"

# Abrir en navegador:
# https://d123456789.cloudfront.net
```

**Primera carga puede tardar:** CloudFront toma ~5-10 min en propagarse globalmente.

---

## 🔧 Configuración de GitHub Actions (CI/CD)

### Paso 1: Crear OIDC Role en AWS

```bash
# 1. Crear trust policy para GitHub
cat > github-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:jsalinas1616/invenadro:*"
        }
      }
    }
  ]
}
EOF

# 2. Crear el OIDC provider (solo primera vez)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# 3. Crear el role
aws iam create-role \
  --role-name GitHubActionsInvenadroRole \
  --assume-role-policy-document file://github-trust-policy.json

# 4. Attach policies necesarias
aws iam attach-role-policy \
  --role-name GitHubActionsInvenadroRole \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# 5. Obtener ARN del role
aws iam get-role --role-name GitHubActionsInvenadroRole --query 'Role.Arn'
```

### Paso 2: Configurar Secret en GitHub

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. New repository secret:
   - Name: `AWS_ROLE_ARN`
   - Value: `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsInvenadroRole`

### Paso 3: Crear ramas

```bash
# Crear rama dev
git checkout -b dev
git push -u origin dev

# Crear rama qa
git checkout -b qa
git push -u origin qa

# Volver a main
git checkout main
```

### Paso 4: Probar CI/CD

```bash
# Hacer un cambio en dev
git checkout dev
echo "# Test" >> README.md
git add .
git commit -m "test: CI/CD"
git push

# Esto debería trigger el workflow de GitHub Actions
# Ve a: https://github.com/jsalinas1616/invenadro/actions
```

---

## 🎨 Configurar React App con Backend URLs

Después del primer deploy, necesitas actualizar el frontend React con las URLs correctas:

### 1. Obtener URLs del backend:
```bash
npm run info:backend:dev

# Anota:
# - API Gateway URL: https://xxx.execute-api.us-east-1.amazonaws.com/dev
# - Cognito User Pool ID: us-east-1_XXXXX
# - Cognito Client ID: xxxxxxxxxxxxx
```

### 2. Actualizar configuración del React:
```bash
cd FrontEnd-lambdas
```

Busca el archivo de configuración (probablemente `src/config.js` o similar) y actualiza:
```javascript
export const config = {
  apiGatewayUrl: 'https://xxx.execute-api.us-east-1.amazonaws.com/dev',
  cognitoUserPoolId: 'us-east-1_XXXXX',
  cognitoClientId: 'xxxxxxxxxxxxx',
  region: 'us-east-1'
};
```

### 3. Re-build y re-deploy frontend:
```bash
# Desde la raíz
npm run deploy:frontend:dev
```

### 4. Esperar propagación de CloudFront (~5 min)

### 5. Probar la app:
- Abre la CloudFront URL
- Regístrate con un email
- Verifica el código de Cognito
- Sube un archivo y procesa

---

## 📝 Checklist Inicial

Antes de considerar el proyecto listo:

- [ ] Primer deploy a DEV exitoso (backend)
- [ ] Primer deploy a DEV exitoso (frontend)
- [ ] API Gateway URL funcional
- [ ] Cognito User Pool creado
- [ ] Buckets S3 accesibles (uploads, results, frontend)
- [ ] Step Function ejecutable
- [ ] CloudFront distribution activa
- [ ] Frontend accesible vía CloudFront URL
- [ ] React app conectado con backend correcto
- [ ] GitHub Actions configurado
- [ ] Secrets de GitHub agregados
- [ ] Deploy automático funciona en rama dev
- [ ] Frontend se actualiza automáticamente en push
- [ ] Documentación revisada

---

## 🎓 Comandos Útiles

```bash
# ========================================
# DEPLOY
# ========================================

# Deploy COMPLETO (backend + frontend)
npm run deploy:all:dev
npm run deploy:all:qa
npm run deploy:all:prod

# Deploy solo backend
npm run deploy:simplicidad:dev

# Deploy solo frontend
npm run deploy:frontend:dev

# Build frontend sin deploy
npm run build:frontend

# ========================================
# INFO
# ========================================

# Ver info backend
npm run info:backend:dev

# Ver info frontend
npm run info:frontend:dev

# ========================================
# LOGS (solo backend tiene logs)
# ========================================

npm run logs:initiator:dev
npm run logs:processor:dev

# ========================================
# REMOVER STACKS (CUIDADO!)
# ========================================

# Remover backend
npm run remove:simplicidad:dev

# Remover frontend
npm run remove:frontend:dev

# ========================================
# DEBUGGING
# ========================================

# Ver serverless.yml compilado (sin deployar)
cd services/simplicidad
serverless print --stage dev

# Ver CloudFormation template del frontend
cd services/frontend
serverless print --stage dev

# Forzar invalidación de CloudFront
cd services/frontend
serverless cloudfrontInvalidate --stage dev
```

---

## 🆘 Si algo falla

### Deploy falla:
```bash
# Ver logs detallados
npm run deploy:simplicidad:dev 2>&1 | tee deploy.log

# Verificar credenciales AWS
aws sts get-caller-identity

# Validar serverless.yml
cd services/simplicidad
serverless print --stage dev
```

### GitHub Actions falla:
- Verifica que el secret `AWS_ROLE_ARN` esté configurado
- Verifica que el OIDC provider existe en AWS
- Revisa los logs en GitHub Actions

### Errores de permisos:
- Tu usuario AWS necesita permisos de Admin (o al menos CloudFormation, Lambda, S3, DynamoDB, IAM)
- El rol de GitHub Actions también necesita permisos suficientes

---

## 📚 Documentación

- **[README.md](README.md)** - Guía rápida
- **[docs/DEPLOY.md](docs/DEPLOY.md)** - Guía completa de deployment
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitectura detallada
- **[.env.template](.env.template)** - Variables de ambiente

---

## 🎉 ¡Éxito!

Una vez que hayas completado el primer deploy:

```bash
# Commit y push de todo
git add .
git commit -m "feat: migración completa a Serverless Framework"
git push

# Crear tag de versión
git tag -a v2.0.0 -m "Versión 2.0 - Serverless Framework"
git push --tags
```

---

**🚀 ¡A deployar!**

Si tienes problemas, revisa:
- CloudWatch Logs en AWS Console
- GitHub Actions logs
- `docs/DEPLOY.md` para troubleshooting
