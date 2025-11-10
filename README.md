# 🚀 Invenadro

Sistema serverless completo: Backend (Lambdas + Step Functions) + Frontend (React + CloudFront).

## ⚡ Quick Start

### Prerequisitos
```bash
# Node.js 20+
node --version

# Serverless Framework
npm install -g serverless

# AWS CLI configurado
aws configure
```

### Deploy Completo (Backend + Frontend)

```bash
# 1. Instalar todas las dependencias
npm run install:all

# 2. Configurar ambiente
cp .env.template .env.dev
# Edita .env.dev con tu AWS_ACCOUNT_ID

# 3. Deploy TODO (backend + frontend)
npm run deploy:all:dev
```

### Deploy Individual

```bash
# Solo backend
npm run deploy:simplicidad:dev

# Solo frontend  
npm run deploy:frontend:dev
```

### 🎉 ¡Listo!

Outputs del deploy:
- ✅ **Backend:** API Gateway URL, Cognito User Pool
- ✅ **Frontend:** CloudFront URL (https://d123456789.cloudfront.net)

---

## 🏗️ Arquitectura

```
Frontend (React) → CloudFront (CDN) → S3 (hosting)
                        ↓
            API Gateway + Cognito
                        ↓
              8 Lambda Functions
                        ↓
           Step Functions (Orquestación)
                        ↓
              S3 + DynamoDB
```

**Stack completo:**
- **Frontend:** React app en S3 + CloudFront
- **Backend:** 8 Lambdas + Step Functions
- **API:** API Gateway con Cognito auth
- **Storage:** S3 buckets + DynamoDB

---

## 📁 Estructura

```
invenadro/
├── services/
│   ├── simplicidad/              # Backend
│   │   ├── serverless.yml       # 8 Lambdas + Step Functions
│   │   ├── functions/           # Código de Lambdas
│   │   ├── resources/           # DynamoDB, S3, Cognito, IAM
│   │   └── stepfunctions/       # State machine definition
│   │
│   └── frontend/                 # Frontend Deploy
│       ├── serverless.yml       # S3 + CloudFront
│       └── package.json
│
├── FrontEnd-lambdas/             # Código React
│   ├── src/                     # Fuentes React
│   ├── public/
│   └── build/                   # Build output
│
└── .github/workflows/            # CI/CD
    ├── deploy-dev.yml           # Backend + Frontend automático
    ├── deploy-qa.yml
    └── deploy-prod.yml
```

---

## 🌍 Ambientes

| Ambiente | Rama | Deploy | Recursos |
|----------|------|--------|----------|
| **DEV** | `dev` | Automático | `invenadro-*-dev-*` |
| **QA** | `qa` | Automático | `invenadro-*-qa-*` |
| **PROD** | `main` | Manual | `invenadro-*-prod-*` |

Cada ambiente tiene su propia infraestructura aislada:
- Backend: `invenadro-simplicidad-{stage}-*`
- Frontend: `invenadro-frontend-{stage}`

---

## 🛠️ Comandos

### Deploy
```bash
# Deploy completo (backend + frontend)
npm run deploy:all:dev
npm run deploy:all:qa
npm run deploy:all:prod

# Deploy solo backend
npm run deploy:simplicidad:dev

# Deploy solo frontend
npm run deploy:frontend:dev

# Build frontend sin deploy
npm run build:frontend
```

### Info
```bash
# Ver info backend
npm run info:backend:dev

# Ver info frontend  
npm run info:frontend:dev
```

### Logs
```bash
npm run logs:initiator:dev
npm run logs:processor:dev
```

### Remover
```bash
# Remover backend
npm run remove:simplicidad:dev

# Remover frontend
npm run remove:frontend:dev
```

---

## 📊 CI/CD (GitHub Actions)

### Setup:
1. Crear OIDC role en AWS
2. Agregar secret `AWS_ROLE_ARN` en GitHub

### Flujo automático:
```
Push a dev → Build React → Deploy Backend → Deploy Frontend → ✅
Push a qa → Build React → Deploy Backend → Deploy Frontend → ✅
Push a main → Aprobación → Deploy Backend → Deploy Frontend → ✅
```

---

## 🌐 Frontend Details

### Stack:
- **Hosting:** S3 bucket (private)
- **CDN:** CloudFront distribution
- **SSL:** Gratis con CloudFront
- **Cache:** Assets con max-age 1 año
- **SPA:** Routing con fallback a index.html

### URLs después del deploy:
```
DEV:  https://d123abc.cloudfront.net
QA:   https://d456def.cloudfront.net
PROD: https://d789ghi.cloudfront.net
```

### Custom domain (opcional):
Ver `services/frontend/serverless.yml` para configurar ACM certificate.

---

## 🔐 Seguridad

Backend:
- ✅ Account IDs en `.env.*` (gitignored)
- ✅ Cognito authentication
- ✅ IAM least privilege
- ✅ S3 buckets privados

Frontend:
- ✅ CloudFront HTTPS only
- ✅ CORS configurado
- ✅ S3 bucket privado (acceso vía CloudFront)
- ✅ Cache busting para assets

---

## 💰 Costos Estimados

### Por ambiente (DEV/QA):
- Backend (Lambdas + Step Functions): $2-5/mes
- Frontend (S3 + CloudFront): $1-2/mes
- DynamoDB: $0 (free tier)
- **Total: ~$5-10/mes**

### PROD:
Variable según tráfico. CloudFront free tier:
- 1 TB salida/mes gratis
- 10M requests HTTP/mes gratis

---

## 📚 Docs

- **`docs/DEPLOY.md`** - Guía completa de deployment
- **`docs/ARCHITECTURE.md`** - Arquitectura detallada
- **`PROXIMOS_PASOS.md`** - Siguiente fase
- **`.env.template`** - Variables necesarias

---

## 🔧 Troubleshooting

### Frontend no actualiza después del deploy:
```bash
# CloudFront cachea contenido, espera ~5 minutos
# O fuerza invalidación:
cd services/frontend
serverless cloudfrontInvalidate --stage dev
```

### Error de CORS en frontend:
Verifica que el API Gateway URL en React app coincide con el deployed.

---

**🚀 Powered by Serverless Framework + GitHub Actions + CloudFront**

Propietario: Julian Salinas
# Test deploy
