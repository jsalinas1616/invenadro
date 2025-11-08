# Resumen Rápido - Permisos con Access Keys

## 🚀 Para Infra: Pasos en orden

### CUENTA AWS 1 (975130647458 - jul-dev / jul-qa)

1. **Crear Usuario IAM JUL-DEV** → [`01-iam-user-dev.md`](./01-iam-user-dev.md)
   - Name: `github-actions-jul-dev`
   - Policy: `policies/github-actions-dev-policy.json` (inline, mínimos privilegios)
   - Crear Access Keys

2. **Crear Usuario IAM JUL-QA** → [`02-iam-user-qa.md`](./02-iam-user-qa.md)
   - Name: `github-actions-jul-qa`
   - Policy: `policies/github-actions-qa-policy.json` (inline, mínimos privilegios)
   - Crear Access Keys

3. **Copiar Access Keys**
   - JUL-DEV: Access Key ID + Secret Access Key
   - JUL-QA: Access Key ID + Secret Access Key

---

### CUENTA AWS 2 (nadro-qa)

4. **Crear Usuario IAM NADRO-QA** → [`04-iam-user-nadro-qa.md`](./04-iam-user-nadro-qa.md)
   - Name: `github-actions-nadro-qa`
   - Policy: `policies/github-actions-nadro-qa-policy.json` (inline, mínimos privilegios)
   - ⚠️ **Reemplazar** `CUENTA_NADRO_QA` en el JSON con el número de cuenta real
   - Crear Access Keys

5. **Copiar Access Keys**
   - NADRO-QA: Access Key ID + Secret Access Key

---

### CUENTA AWS 3 (nadro-prod)

6. **Crear Usuario IAM NADRO-PROD** → [`05-iam-user-nadro-prod.md`](./05-iam-user-nadro-prod.md)
   - Name: `github-actions-nadro-prod`
   - Policy: `policies/github-actions-prod-policy.json` (inline, mínimos privilegios)
   - ⚠️ **Reemplazar** `CUENTA_NADRO_PROD` en el JSON con el número de cuenta real
   - Crear Access Keys

7. **Copiar Access Keys**
   - NADRO-PROD: Access Key ID + Secret Access Key

---

### GITHUB

8. **Configurar Secrets** → [`06-github-secrets.md`](./06-github-secrets.md)
   - `AWS_ACCESS_KEY_ID_DEV`
   - `AWS_SECRET_ACCESS_KEY_DEV`
   - `AWS_ACCESS_KEY_ID_QA`
   - `AWS_SECRET_ACCESS_KEY_QA`
   - `AWS_ACCESS_KEY_ID_NADRO_QA`
   - `AWS_SECRET_ACCESS_KEY_NADRO_QA`
   - `AWS_ACCESS_KEY_ID_NADRO_PROD`
   - `AWS_SECRET_ACCESS_KEY_NADRO_PROD`

---

## 📋 Políticas de Mínimos Privilegios

**✅ En lugar de usar 9 políticas managed de AWS (demasiado permisos), usamos 1 inline policy personalizada por usuario:**

```
JUL-DEV:     policies/github-actions-dev-policy.json
JUL-QA:      policies/github-actions-qa-policy.json
NADRO-QA:    policies/github-actions-nadro-qa-policy.json
NADRO-PROD:  policies/github-actions-prod-policy.json
```

**Servicios AWS cubiertos con mínimos privilegios:**
```
✅ Lambda (create, update, delete funciones específicas)
✅ S3 (buckets y objetos específicos del proyecto)
✅ DynamoDB (tablas específicas del proyecto)
✅ CloudFormation (stacks específicos del proyecto)
✅ API Gateway (REST APIs)
✅ Step Functions (state machines específicas)
✅ CloudWatch Logs (log groups específicos)
✅ CloudFront (distribuciones)
✅ IAM (roles específicos para Lambda)
✅ Cognito (user pools)
```

**✅ Basadas en ejemplos aprobados por seguridad**
**✅ Solo recursos del proyecto invenadro**
**✅ Región: mx-central-1 (AWS México)**

---

## ✅ Checklist Final

```
CUENTA AWS 1 (975130647458):
□ Usuario github-actions-jul-dev creado
□ Inline policy InvenadroJulDevMinimumPrivileges aplicada
□ Access Keys creadas para JUL-DEV
□ Usuario github-actions-jul-qa creado
□ Inline policy InvenadroJulQaMinimumPrivileges aplicada
□ Access Keys creadas para JUL-QA
□ Credenciales copiadas (4 keys total)

CUENTA AWS 2 (CUENTA_NADRO_QA):
□ Archivo policies/github-actions-nadro-qa-policy.json editado (CUENTA_NADRO_QA reemplazado)
□ Usuario github-actions-nadro-qa creado
□ Inline policy InvenadroNadroQaMinimumPrivileges aplicada
□ Access Keys creadas para NADRO-QA
□ Credenciales copiadas (2 keys)

CUENTA AWS 3 (CUENTA_NADRO_PROD):
□ Archivo policies/github-actions-prod-policy.json editado (CUENTA_NADRO_PROD reemplazado)
□ Usuario github-actions-nadro-prod creado
□ Inline policy InvenadroNadroProdMinimumPrivileges aplicada
□ Access Keys creadas para NADRO-PROD
□ Credenciales copiadas (2 keys)

GITHUB:
□ 8 secrets configurados
□ Nombres exactos verificados (AWS_ACCESS_KEY_ID_*, AWS_SECRET_ACCESS_KEY_*)

VERIFICACIÓN:
□ Runtime nodejs22.x o nodejs20.x confirmado
□ Deploy test a jul-dev exitoso
□ Deploy test a jul-qa exitoso
□ Deploy test a nadro-qa exitoso
□ Deploy test a nadro-prod exitoso
```

---

## 📞 Contacto

**Proyecto:** invenadro
**Repo:** https://github.com/jsalinas1616/invenadro
**Dev:** Julian Salinas
