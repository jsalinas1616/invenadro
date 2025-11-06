# 📦 Guía de Deployment - Invenadro

## 🎯 Prerequisitos

### Software requerido:
```bash
# Node.js 20+
node --version  # Debe ser v20.x.x o superior

# npm 10+
npm --version

# AWS CLI configurado
aws --version
aws sts get-caller-identity  # Verifica que estás autenticado

# Serverless Framework (global)
npm install -g serverless
serverless --version
```

### Permisos AWS requeridos:
- CloudFormation (crear/actualizar/eliminar stacks)
- Lambda (crear/actualizar funciones)
- API Gateway (crear/configurar APIs)
- S3 (crear buckets, subir objetos)
- DynamoDB (crear tablas)
- Cognito (crear user pools)
- Step Functions (crear state machines)
- IAM (crear roles y policies)

---

## 🚀 Primer Deploy (desde cero)

### 1. Clonar repositorio
```bash
git clone git@github.com:jsalinas1616/invenadro.git
cd invenadro
```

### 2. Instalar dependencias
```bash
# Dependencias raíz
npm install

# Dependencias del servicio
cd services/simplicidad
npm install
cd ../..
```

### 3. Configurar variables de ambiente
```bash
# Copiar template
cp .env.template .env.dev

# Editar con tu editor favorito
vim .env.dev  # o code .env.dev
```

**Contenido mínimo de `.env.dev`:**
```bash
AWS_ACCOUNT_ID=123456789012  # Tu Account ID
AWS_REGION=us-east-1
STAGE=dev
```

### 4. Deploy a DEV
```bash
npm run deploy:simplicidad:dev
```

**Esto creará:**
- ✅ 8 funciones Lambda
- ✅ 1 Step Function
- ✅ 1 API Gateway
- ✅ 1 Cognito User Pool
- ✅ 2 S3 Buckets (uploads, results)
- ✅ 1 Tabla DynamoDB
- ✅ Roles y permisos IAM

**Tiempo estimado:** 5-10 minutos

### 5. Verificar deployment
```bash
# Ver información del stack
npm run info:dev

# Output esperado:
# Service: invenadro-simplicidad
# Stage: dev
# Region: us-east-1
# Stack: invenadro-simplicidad-dev
# API Gateway URL: https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
# ...
```

---

## 🔄 Re-deploys y Actualizaciones

### Deploy después de cambios en código:
```bash
# Deploy completo (recomendado)
npm run deploy:simplicidad:dev

# Deploy de una sola función (más rápido)
cd services/simplicidad
serverless deploy function -f initiator --stage dev
```

### Deploy a otros ambientes:
```bash
# QA
cp .env.template .env.qa
# Editar .env.qa
npm run deploy:simplicidad:qa

# PROD
cp .env.template .env.prod
# Editar .env.prod
npm run deploy:simplicidad:prod
```

---

## 🌍 Multi-Ambiente Strategy

### Ambientes recomendados:

#### **DEV** (Desarrollo)
- Rama: `dev`
- Deploy: Manual o automático (GitHub Actions)
- Propósito: Testing de features nuevos
- Costos: Mínimos

#### **QA** (Quality Assurance)
- Rama: `qa`
- Deploy: Automático en push
- Propósito: Testing de integración
- Costos: Bajos

#### **PROD** (Producción)
- Rama: `main`
- Deploy: Manual con aprobación
- Propósito: Usuarios finales
- Costos: Variables según uso

### Naming convention:
```
invenadro-simplicidad-{STAGE}-{RESOURCE}

Ejemplos:
- invenadro-simplicidad-dev-initiator
- invenadro-simplicidad-qa-uploads
- invenadro-simplicidad-prod-jobs
```

---

## 🔧 Troubleshooting

### Error: "AWS credentials not configured"
```bash
aws configure
# Ingresa Access Key ID y Secret Access Key
```

### Error: "Stack already exists"
```bash
# Ver el stack existente
npm run info:dev

# Actualizar (no crear nuevo)
npm run deploy:simplicidad:dev

# O eliminar y recrear
npm run remove:simplicidad:dev
npm run deploy:simplicidad:dev
```

### Error: "Rate exceeded"
```bash
# AWS tiene límites de rate, espera 1-2 minutos y reintenta
npm run deploy:simplicidad:dev
```

### Ver logs de errores:
```bash
# Logs de una función específica
npm run logs:initiator:dev

# O directamente con AWS CLI
aws logs tail /aws/lambda/invenadro-simplicidad-dev-initiator --follow
```

### Validar serverless.yml:
```bash
cd services/simplicidad
serverless print --stage dev
# Esto muestra el CloudFormation generado sin deployar
```

---

## 🗑️ Eliminar Stack Completo

```bash
# CUIDADO: Esto elimina TODA la infraestructura
npm run remove:simplicidad:dev

# También puedes hacerlo por servicio
cd services/simplicidad
serverless remove --stage dev
```

**Nota:** Los buckets S3 con contenido NO se eliminan automáticamente (seguridad de AWS). Debes vaciarlos manualmente primero:
```bash
aws s3 rm s3://invenadro-simplicidad-dev-uploads --recursive
aws s3 rm s3://invenadro-simplicidad-dev-results --recursive
```

---

## 📊 Costos Estimados

### DEV/QA (uso bajo):
- Lambda: ~$1-5/mes
- API Gateway: ~$1/mes
- DynamoDB: $0 (free tier)
- S3: ~$1/mes
- Step Functions: ~$1/mes
- **Total: ~$5-10/mes**

### PROD (depende del tráfico):
- Escala según uso
- Recomendado: Configurar AWS Budgets

---

## ✅ Checklist de Deployment

Antes de deployar a PROD:

- [ ] Código testeado en DEV
- [ ] Código testeado en QA
- [ ] Variables de ambiente configuradas en `.env.prod`
- [ ] Backup de datos importantes
- [ ] Notificaciones configuradas
- [ ] Monitoreo configurado (CloudWatch)
- [ ] Plan de rollback definido

---

## 🔄 Rollback

Si algo sale mal en PROD:

```bash
# Opción 1: Revertir código y re-deployar
git revert HEAD
git push
# GitHub Actions auto-deploya versión anterior

# Opción 2: Deploy de versión anterior manualmente
git checkout <commit-anterior>
npm run deploy:simplicidad:prod
git checkout main
```

---

## 📞 Soporte

- GitHub Issues: https://github.com/jsalinas1616/invenadro/issues
- Owner: Julian Salinas
