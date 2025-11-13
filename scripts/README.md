# Scripts de Automatización - Invenadro

## 🤖 update-frontend-config.sh

Script automático que actualiza la configuración del frontend (`environments.js`) con los valores reales del backend deployado en AWS.

### 🎯 Problema que Resuelve

Antes: Después de deployar el backend, tenías que **copiar manualmente** las URLs, IDs de Cognito, ARNs, etc. y pegarlos en `environments.js`.

Ahora: **Un solo comando** obtiene todos los valores del backend en AWS y actualiza el frontend automáticamente. ✨

---

## 📋 Prerequisitos

1. **AWS CLI configurado** con el perfil `default`
2. **jq** instalado (para parsear JSON)
   ```bash
   brew install jq  # macOS
   ```
3. **Backend desplegado** en el stage que quieres configurar

---

## 🚀 Uso

### Sintaxis

```bash
./scripts/update-frontend-config.sh <stage>
```

### Ejemplos

```bash
# Actualizar configuración para jul-qa
./scripts/update-frontend-config.sh jul-qa

# Actualizar configuración para nadro-qa
./scripts/update-frontend-config.sh nadro-qa

# Actualizar configuración para nadro-prod
./scripts/update-frontend-config.sh nadro-prod
```

---

## 🔄 Flujo Completo de Deployment

### Para un ambiente NUEVO (ej: jul-qa)

```bash
# 1. Deploy backend
cd services/backend
npx serverless deploy --stage jul-qa

# 2. Actualizar frontend config automáticamente 🤖
cd ../..
./scripts/update-frontend-config.sh jul-qa

# 3. Revisar cambios
git diff FrontEnd-lambdas/src/config/environments.js

# 4. Commit y push
git add FrontEnd-lambdas/src/config/environments.js
git commit -m "chore: Actualizar config jul-qa con URLs del backend"
git push origin qa

# ¡Listo! GitHub Actions deployará el frontend con la config correcta
```

### Para actualizar un ambiente EXISTENTE

Si cambias algo en el backend (ej: recrear Cognito User Pool):

```bash
# 1. Deploy backend
cd services/backend
npx serverless deploy --stage jul-qa

# 2. Actualizar frontend config automáticamente 🤖
cd ../..
./scripts/update-frontend-config.sh jul-qa

# 3. Re-deploy frontend
git add FrontEnd-lambdas/src/config/environments.js
git commit -m "chore: Actualizar config jul-qa"
git push origin qa
```

---

## 📊 ¿Qué Valores Actualiza?

El script obtiene y actualiza automáticamente:

| Campo | Origen | Ejemplo |
|-------|--------|---------|
| **API Gateway URL** | CloudFormation Output | `https://xxxxx.execute-api.mx-central-1.amazonaws.com/jul-qa` |
| **Cognito User Pool ID** | CloudFormation Output | `mx-central-1_XXXXX` |
| **Cognito Client ID** | CloudFormation Output | `xxxxxxxxxxxxxxxxxx` |
| **S3 Uploads Bucket** | CloudFormation Output | `invenadro-backend-jul-qa-uploads` |
| **S3 Results Bucket** | CloudFormation Output | `invenadro-backend-jul-qa-results` |
| **DynamoDB Jobs Table** | CloudFormation Output | `invenadro-backend-jul-qa-jobs` |
| **Step Function ARN** | CloudFormation Output | `arn:aws:states:mx-central-1:...` |
| **AWS Account ID** | Extraído del ARN | `975130647458` |
| **AWS Region** | Fijo | `mx-central-1` |

---

## 🔍 Output del Script

```bash
$ ./scripts/update-frontend-config.sh jul-qa

ℹ️  Stage válido: jul-qa
ℹ️  Obteniendo configuración del backend...
   Stack: invenadro-backend-jul-qa
   Región: mx-central-1

✅ Stack encontrado en AWS
ℹ️  Obteniendo outputs del CloudFormation...
✅ Configuración obtenida correctamente

📊 Valores del backend jul-qa:
   API Gateway: https://xxxxx.execute-api.mx-central-1.amazonaws.com/jul-qa
   User Pool ID: mx-central-1_XXXXX
   Client ID: xxxxxxxxxxxxxxxxxx
   Uploads Bucket: invenadro-backend-jul-qa-uploads
   Results Bucket: invenadro-backend-jul-qa-results
   Jobs Table: invenadro-backend-jul-qa-jobs
   Account ID: 975130647458

ℹ️  Actualizando FrontEnd-lambdas/src/config/environments.js...
📝 Leyendo archivo: .../FrontEnd-lambdas/src/config/environments.js
🔍 Buscando configuración para stage: jul-qa
🔄 Actualizando valores para jul-qa...
  ✓ API Gateway URL: https://xxxxx...
  ✓ User Pool ID: mx-central-1_XXXXX
  ✓ Client ID: xxxxxxxxxxxxxxxxxx
  ✓ Results Bucket: invenadro-backend-jul-qa-results
  ✓ Uploads Bucket: invenadro-backend-jul-qa-uploads
  ✓ Jobs Table: invenadro-backend-jul-qa-jobs
  ✓ Step Function ARN: arn:aws:states:...
  ✓ Account ID: 975130647458
  ✓ Region: mx-central-1

💾 Guardando cambios en .../environments.js
✅ Archivo actualizado correctamente

📊 Resumen de cambios:
   Stage: jul-qa
   API Gateway: https://xxxxx...
   Cognito: mx-central-1_XXXXX
   Region: mx-central-1

✅ Archivo environments.js actualizado correctamente

ℹ️  Próximos pasos:
   1. Revisar los cambios: git diff FrontEnd-lambdas/src/config/environments.js
   2. Hacer commit: git add FrontEnd-lambdas/src/config/environments.js
   3. Commit: git commit -m "chore: Actualizar config jul-qa con URLs del backend"
   4. Push: git push origin <branch>

✅ ¡Proceso completado! 🎉
```

---

## ⚠️ Troubleshooting

### Error: "El stack no existe en AWS"

```bash
❌ El stack invenadro-backend-jul-qa no existe en AWS
⚠️  Primero debes deployar el backend:
   cd services/backend
   npx serverless deploy --stage jul-qa
```

**Solución**: Deployar el backend primero.

---

### Error: "jq: command not found"

```bash
./update-frontend-config.sh: line 87: jq: command not found
```

**Solución**: Instalar jq
```bash
brew install jq  # macOS
```

---

### Error: "No se pudieron obtener todos los valores"

```bash
❌ No se pudieron obtener todos los valores necesarios del stack

Valores obtenidos:
  API URL: MISSING
  User Pool ID: MISSING
  Client ID: MISSING
```

**Causas posibles**:
1. El backend no terminó de deployar correctamente
2. Los Outputs no están definidos en `serverless.yml`
3. Problema de permisos AWS

**Solución**: 
```bash
# Verificar que el stack existe y tiene outputs
aws cloudformation describe-stacks \
  --stack-name invenadro-backend-jul-qa \
  --region mx-central-1 \
  --query 'Stacks[0].Outputs'
```

---

## 📁 Archivos del Sistema

```
scripts/
├── update-frontend-config.sh    # Script principal (bash)
├── update-environments-js.js    # Script de actualización (Node.js)
└── README.md                     # Esta documentación
```

---

## 🔧 Cómo Funciona (Internamente)

1. **Validar parámetros**: Verifica que el stage es válido (jul-dev, jul-qa, nadro-qa, nadro-prod)

2. **Verificar stack**: Confirma que el backend está deployado en AWS
   ```bash
   aws cloudformation describe-stacks --stack-name invenadro-backend-<stage>
   ```

3. **Obtener outputs**: Extrae todos los outputs de CloudFormation
   ```bash
   aws cloudformation describe-stacks ... --query 'Stacks[0].Outputs'
   ```

4. **Parsear valores**: Usa `jq` para extraer cada valor específico

5. **Actualizar environments.js**: Ejecuta el script Node.js que:
   - Lee el archivo `environments.js`
   - Busca el objeto del stage específico
   - Reemplaza cada campo con el nuevo valor usando regex
   - Guarda el archivo actualizado

6. **Confirmar**: Muestra resumen y próximos pasos

---

## 💡 Ventajas del Sistema Automático

| Antes (Manual) | Ahora (Automático) |
|----------------|-------------------|
| ❌ Copiar/pegar 9 valores diferentes | ✅ Un solo comando |
| ❌ Propenso a errores de tipeo | ✅ Sin errores humanos |
| ❌ ~5-10 minutos por ambiente | ✅ ~30 segundos por ambiente |
| ❌ Aburrido y repetitivo | ✅ Eficiente y confiable |

---

## 🚀 Integración con CI/CD (Futuro)

Este script se puede integrar en GitHub Actions para automatizar completamente:

```yaml
# .github/workflows/deploy-qa.yml
- name: Update Frontend Config
  run: |
    ./scripts/update-frontend-config.sh jul-qa
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add FrontEnd-lambdas/src/config/environments.js
    git commit -m "chore: Auto-update frontend config for jul-qa [skip ci]"
    git push
```

---

## 📚 Referencias

- **Documentación Principal**: `MULTI_ENVIRONMENT.md`
- **Backend Serverless**: `services/backend/serverless.yml`
- **Frontend Config**: `FrontEnd-lambdas/src/config/environments.js`

---

## ✅ Checklist de Uso

- [ ] Backend deployado en el stage deseado
- [ ] AWS CLI configurado con perfil `default`
- [ ] jq instalado (`brew install jq`)
- [ ] Ejecutar: `./scripts/update-frontend-config.sh <stage>`
- [ ] Revisar cambios: `git diff FrontEnd-lambdas/src/config/environments.js`
- [ ] Commit y push
- [ ] Deploy frontend con GitHub Actions

---

**¡Ahora actualizar la configuración del frontend es tan fácil como ejecutar un comando!** 🎉

