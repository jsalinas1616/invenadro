# Invenadro - Sistema de Optimización de Factor de Redondeo

Sistema serverless en AWS para optimización de inventarios.

---

## 🚀 Deployment Rápido

### Prerequisitos

```bash
# 1. Node.js 22+
node --version

# 2. AWS CLI configurado
aws --version

# 3. Serverless Framework
npm install -g serverless

# 4. jq (para scripts automáticos)
brew install jq  # macOS
```

---

## 📦 Deploy Completo (Backend + Frontend)

### Opción 1: Automático con GitHub Actions (Recomendado)

```bash
# Push a la rama correspondiente
git push origin dev       # → jul-dev
git push origin qa        # → jul-qa
git push origin nadro-qa  # → nadro-qa
git push origin main      # → nadro-prod

# GitHub Actions se encarga de todo automáticamente
```

---

### Opción 2: Manual

#### **Paso 1: Deploy Backend**

```bash
# Ir a carpeta backend
cd services/backend

# Instalar dependencias
npm install

# Deploy
npx serverless deploy --stage jul-dev --verbose

# Ver información del deployment
npx serverless info --stage jul-dev
```

#### **Paso 2: Actualizar Configuración del Frontend (Automático) 🤖**

```bash
# Volver a raíz
cd ../..

# Script automático que obtiene las URLs del backend
./scripts/update-frontend-config.sh jul-dev

# Ver los cambios
git diff FrontEnd-lambdas/src/config/environments.js
```

#### **Paso 3: Build Frontend**

```bash
# Ir a carpeta frontend React
cd FrontEnd-lambdas

# Instalar dependencias
npm install

# Build con el ambiente correcto
REACT_APP_STAGE=jul-dev npm run build
```

#### **Paso 4: Deploy Frontend**

```bash
# Volver a raíz e ir a carpeta de deployment
cd ../services/frontend

# Instalar dependencias
npm install

# Deploy
npx serverless deploy --stage jul-dev --verbose

# Ver información del deployment
npx serverless info --stage jul-dev
```

#### **Paso 5: Obtener URL del Frontend**

```bash
# La URL de CloudFront aparece en el output
# Ejemplo: https://d3qyx007nie7k5.cloudfront.net
```

---

## 🌍 Ambientes Disponibles

| Ambiente | Stage | Branch | Cuenta AWS |
|----------|-------|--------|------------|
| **Desarrollo (Julio)** | `jul-dev` | `dev` | 975130647458 |
| **QA (Julio)** | `jul-qa` | `qa` | 975130647458 |
| **QA (Nadro)** | `nadro-qa` | `nadro-qa` | TBD |
| **Producción (Nadro)** | `nadro-prod` | `main` | TBD |

---

## 🔄 Deploy de un Ambiente Nuevo

### Ejemplo: Crear ambiente `jul-qa`

```bash
# 1. Deploy backend
cd services/backend
npx serverless deploy --stage jul-qa

# 2. Actualizar config del frontend automáticamente
cd ../..
./scripts/update-frontend-config.sh jul-qa

# 3. Commit cambios
git add FrontEnd-lambdas/src/config/environments.js
git commit -m "chore: Actualizar config jul-qa"

# 4. Build frontend
cd FrontEnd-lambdas
REACT_APP_STAGE=jul-qa npm run build

# 5. Deploy frontend
cd ../services/frontend
npx serverless deploy --stage jul-qa

# ¡Listo! 🎉
```

---

## 📊 Ver Info de Deployment

```bash
# Backend
cd services/backend
npx serverless info --stage jul-dev

# Frontend
cd services/frontend
npx serverless info --stage jul-dev
```

---

## 🗑️ Eliminar un Ambiente

```bash
# Frontend (primero)
cd services/frontend
npx serverless remove --stage jul-dev

# Backend (después)
cd ../backend
npx serverless remove --stage jul-dev
```

---

## 🛠️ Comandos Útiles

### Backend

```bash
# Logs de una función específica
npx serverless logs -f initiator --stage jul-dev --tail

# Invocar función manualmente
npx serverless invoke -f initiator --stage jul-dev --data '{"test":true}'

# Ver métricas
npx serverless metrics --stage jul-dev
```

### Frontend

```bash
# Invalidar caché de CloudFront
aws cloudfront create-invalidation \
  --distribution-id D3QYX007NIE7K5 \
  --paths "/*"

# Ver logs de CloudFront
aws cloudfront get-distribution \
  --id D3QYX007NIE7K5
```

---

## 🐛 Troubleshooting

### Error: "Stack does not exist"
```bash
# El stack no existe, hacer deployment inicial
npx serverless deploy --stage jul-dev
```

### Error: "Bucket does not allow ACLs"
```bash
# Ya está solucionado en la última versión
# Si ves este error, haz git pull
```

### Error: "User not authorized"
```bash
# Verificar credenciales AWS
aws sts get-caller-identity

# Verificar permisos (ver permisos/01-github-actions/README.md)
```

### Frontend no carga o tiene errores
```bash
# 1. Verificar que usaste REACT_APP_STAGE
echo $REACT_APP_STAGE

# 2. Verificar configuración en consola del navegador
# Abre DevTools (F12) y busca:
# "🌍 Ambiente detectado por REACT_APP_STAGE: jul-dev"

# 3. Actualizar configuración
./scripts/update-frontend-config.sh jul-dev
```

---

## 📚 Documentación Adicional

- **Multi-Ambiente**: [`MULTI_ENVIRONMENT.md`](./MULTI_ENVIRONMENT.md)
- **Scripts Automáticos**: [`scripts/README.md`](./scripts/README.md)
- **Permisos IAM**: [`permisos/01-github-actions/README.md`](./permisos/01-github-actions/README.md)
- **Backend Config**: [`services/backend/serverless.yml`](./services/backend/serverless.yml)
- **Frontend Config**: [`FrontEnd-lambdas/src/config/environments.js`](./FrontEnd-lambdas/src/config/environments.js)

---

## 🎯 Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIO FINAL                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CloudFront (CDN)                           │
│              Frontend React (S3 Website)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              API Gateway                                │
│              (Cognito Auth)                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Lambda Functions (8 funciones)                  │
│         - initiator                                     │
│         - client-separator                              │
│         - processor (motor principal)                   │
│         - status-checker                                │
│         - client-aggregator                             │
│         - download-result                               │
│         - excel-generator                               │
│         - get-presigned-url                             │
└────────┬─────────────┬──────────────┬───────────────────┘
         │             │              │
         ▼             ▼              ▼
    ┌────────┐   ┌─────────┐   ┌──────────┐
    │   S3   │   │ DynamoDB│   │Step      │
    │Uploads │   │  Jobs   │   │Functions │
    │Results │   │  Table  │   │          │
    └────────┘   └─────────┘   └──────────┘
```

---

## 🔐 Cognito (Autenticación)

```bash
# Crear usuario de prueba
aws cognito-idp admin-create-user \
  --user-pool-id mx-central-1_WIAYTqFq7 \
  --username test@ejemplo.com \
  --user-attributes Name=email,Value=test@ejemplo.com \
  --temporary-password TempPass123!

# Listar usuarios
aws cognito-idp list-users \
  --user-pool-id mx-central-1_WIAYTqFq7
```

---

## 💰 Costos Estimados

| Servicio | Costo Mensual (estimado) |
|----------|--------------------------|
| Lambda (8 funciones) | ~$5-20 |
| S3 (uploads + results) | ~$1-5 |
| DynamoDB | ~$1-5 |
| API Gateway | ~$3-10 |
| CloudFront | ~$1-5 |
| Step Functions | ~$0.50-2 |
| Cognito | Gratis (< 50K usuarios) |
| **Total** | **~$11-47/mes** |

*Nota: Costos basados en uso moderado. Pueden variar según volumen.*

---

## 🤝 Soporte

- **Issues**: [GitHub Issues](https://github.com/jsalinas1616/invenadro/issues)
- **Documentación**: Ver carpeta `permisos/` y archivos `.md`

---

## 📝 License

Propietario - Uso interno

---

**¿Listo para deployar?** 🚀

```bash
# Rápido y simple:
cd services/backend && npx serverless deploy --stage jul-dev
cd ../.. && ./scripts/update-frontend-config.sh jul-dev
cd FrontEnd-lambdas && REACT_APP_STAGE=jul-dev npm run build
cd ../services/frontend && npx serverless deploy --stage jul-dev
```

**¡Y ya está funcionando!** 🎉
