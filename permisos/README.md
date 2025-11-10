# 🔐 Políticas IAM - Invenadro

**Políticas necesarias para desplegar Invenadro en AWS con GitHub Actions**

---

## 📋 ÍNDICE

1. [¿Qué necesito?](#qué-necesito)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Guías de Implementación](#guías-de-implementación)
4. [Checklist de Validación](#checklist-de-validación)

---

## ⚡ ¿QUÉ NECESITO?

### **SOLO necesitas las políticas de GitHub Actions**

Las políticas de `01-github-actions/` son suficientes para:
- ✅ Crear toda la infraestructura (Lambdas, S3, DynamoDB, etc.)
- ✅ Desplegar con `serverless deploy`
- ✅ Gestionar los 4 ambientes (jul-dev, jul-qa, nadro-qa, nadro-prod)

**Serverless Framework automáticamente:**
- Crea los roles IAM para las Lambdas
- Crea los roles IAM para Step Functions
- Asigna los permisos correctos a cada recurso

**No necesitas crear roles manualmente.**

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
permisos/
├── README.md                              ← Este documento
│
└── 01-github-actions/                     ← ⭐ POLÍTICAS PRINCIPALES
    ├── README.md
    ├── invenadro-jul-dev-policy-part1-compute.json
    ├── invenadro-jul-dev-policy-part2-infrastructure.json
    ├── invenadro-jul-qa-policy-part1-compute.json
    ├── invenadro-jul-qa-policy-part2-infrastructure.json
    ├── invenadro-nadro-qa-policy-part1-compute.json
    ├── invenadro-nadro-qa-policy-part2-infrastructure.json
    ├── invenadro-nadro-prod-policy-part1-compute.json
    └── invenadro-nadro-prod-policy-part2-infrastructure.json
```

---

---

## 🔑 POLÍTICAS DE GITHUB ACTIONS

**Carpeta:** [`01-github-actions/`](./01-github-actions/)

### **Propósito**
Permitir que GitHub Actions **despliegue toda la infraestructura** de Invenadro.

### **Cada ambiente necesita 2 políticas**

Debido al límite de 6,144 caracteres de AWS IAM, cada ambiente requiere 2 políticas inline:

| Ambiente | Parte 1 (Compute) | Parte 2 (Infrastructure) |
|----------|-------------------|-------------------------|
| jul-dev | `invenadro-jul-dev-policy-part1-compute.json` | `invenadro-jul-dev-policy-part2-infrastructure.json` |
| jul-qa | `invenadro-jul-qa-policy-part1-compute.json` | `invenadro-jul-qa-policy-part2-infrastructure.json` |
| nadro-qa | `invenadro-nadro-qa-policy-part1-compute.json` | `invenadro-nadro-qa-policy-part2-infrastructure.json` |
| nadro-prod | `invenadro-nadro-prod-policy-part1-compute.json` | `invenadro-nadro-prod-policy-part2-infrastructure.json` |

### **Permisos incluidos**

**Part 1 - Compute & Storage:**
- Lambda (crear, actualizar, borrar)
- S3 (buckets y objetos)
- DynamoDB (tablas)

**Part 2 - Infrastructure & Services:**
- CloudFormation (stacks)
- API Gateway
- Step Functions
- CloudWatch Logs
- CloudFront
- IAM Roles (para lambdas)
- Cognito User Pools

---

## ✅ CHECKLIST DE VALIDACIÓN

```
CUENTA AWS 1 (975130647458 - jul-dev / jul-qa):
□ Usuario IAM github-actions-jul-dev creado
□ Política Part 1 (Compute) aplicada
□ Política Part 2 (Infrastructure) aplicada
□ Usuario IAM github-actions-jul-qa creado
□ Política Part 1 (Compute) aplicada
□ Política Part 2 (Infrastructure) aplicada
□ Access Keys generadas (4 keys total)

CUENTA AWS 2 (nadro-qa):
□ Usuario IAM github-actions-nadro-qa creado
□ Política Part 1 (Compute) aplicada
□ Política Part 2 (Infrastructure) aplicada
□ Access Keys generadas (2 keys)

CUENTA AWS 3 (nadro-prod):
□ Usuario IAM github-actions-nadro-prod creado
□ Política Part 1 (Compute) aplicada
□ Política Part 2 (Infrastructure) aplicada
□ Access Keys generadas (2 keys)

GITHUB:
□ Secret AWS_ACCESS_KEY_ID_DEV agregado
□ Secret AWS_SECRET_ACCESS_KEY_DEV agregado
□ Secret AWS_ACCESS_KEY_ID_QA agregado
□ Secret AWS_SECRET_ACCESS_KEY_QA agregado
□ Secret AWS_ACCESS_KEY_ID_NADRO_QA agregado
□ Secret AWS_SECRET_ACCESS_KEY_NADRO_QA agregado
□ Secret AWS_ACCESS_KEY_ID_NADRO_PROD agregado
□ Secret AWS_SECRET_ACCESS_KEY_NADRO_PROD agregado

DEPLOY:
□ Deploy test a jul-dev exitoso
□ Deploy test a jul-qa exitoso
□ Deploy test a nadro-qa exitoso (manual approval)
□ Deploy test a nadro-prod exitoso (manual approval)
```

---

## 🌍 AMBIENTES

| Ambiente | Cuenta AWS | Región | Uso |
|----------|-----------|--------|-----|
| **jul-dev** | 975130647458 | mx-central-1 | Desarrollo |
| **jul-qa** | 975130647458 | mx-central-1 | QA |
| **nadro-qa** | CUENTA_NADRO_QA | mx-central-1 | QA Cliente |
| **nadro-prod** | CUENTA_NADRO_PROD | mx-central-1 | Producción |

---

## 🚀 PASOS PARA IMPLEMENTAR

### 1. Solicitar políticas a Arquitectura/Infraestructura

**Para jul-dev:**
```
Necesito estas 2 políticas agregadas a mi grupo IAM:

1. invenadro-jul-dev-policy-part1-compute.json
   (Lambda, S3, DynamoDB)

2. invenadro-jul-dev-policy-part2-infrastructure.json
   (CloudFormation, API Gateway, Step Functions, etc.)
```

**Repetir para cada ambiente:** jul-qa, nadro-qa, nadro-prod

---

### 2. Verificar permisos

```bash
# Ver qué políticas tienes
aws iam list-attached-user-policies --user-name TU_USUARIO

# O si estás en un grupo
aws iam list-attached-group-policies --group-name TU_GRUPO
```

---

### 3. Hacer el primer deploy

```bash
# Desarrollo
npm run deploy:backend:dev

# QA
npm run deploy:backend:qa

# Nadro QA
npm run deploy:backend:nadro-qa

# Producción
npm run deploy:backend:prod
```

**Nota:** Usa tus credenciales existentes (Access Keys que ya tienes configuradas)

---

## 🔒 SEGURIDAD

### Principios Aplicados

✅ **Mínimo Privilegio**
- Políticas limitadas a recursos específicos del proyecto
- Sin wildcards globales (`Resource: "*"`) salvo excepciones justificadas

✅ **Segregación por Ambiente**
- jul-dev y jul-qa en cuenta 975130647458
- nadro-qa en su propia cuenta
- nadro-prod en su propia cuenta

✅ **Naming Convention**
- Todos los recursos incluyen el ambiente en el nombre
- Ejemplo: `invenadro-backend-jul-dev-*`

✅ **Políticas Divididas**
- 2 políticas por ambiente (bajo límite de 6,144 caracteres)
- Permite granularidad sin exceder límites de AWS

---

## 📞 CONTACTO

**Proyecto:** Invenadro  
**Repositorio:** https://github.com/jsalinas1616/invenadro  
**Responsable:** Julián Salinas  
**Email:** jsalinas1616@gmail.com

---

## 📚 REFERENCIAS

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Lambda Security](https://docs.aws.amazon.com/lambda/latest/dg/lambda-security.html)
- [Step Functions IAM](https://docs.aws.amazon.com/step-functions/latest/dg/procedure-create-iam-role.html)
- [Serverless Framework](https://www.serverless.com/framework/docs)
