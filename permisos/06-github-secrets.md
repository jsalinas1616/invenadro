# GitHub Secrets

## 🎯 Objetivo

Configurar las Access Keys como secrets en GitHub para que los workflows puedan usarlas.

---

## 📋 Prerrequisitos

**Debes tener las 8 credenciales (4 usuarios × 2 keys cada uno):**

```
Usuario JUL-DEV (Cuenta 1):
1. Access Key ID (AKIA...)
2. Secret Access Key

Usuario JUL-QA (Cuenta 1):
3. Access Key ID (AKIA...)
4. Secret Access Key

Usuario NADRO-QA (Cuenta 2):
5. Access Key ID (AKIA...)
6. Secret Access Key

Usuario NADRO-PROD (Cuenta 3):
7. Access Key ID (AKIA...)
8. Secret Access Key
```

---

## 📝 Pasos

### 1. Acceder a GitHub Secrets

```
1. Ve a: https://github.com/jsalinas1616/invenadro
2. Click: Settings
3. Click: Secrets and variables → Actions
4. Click: New repository secret
```

---

### 2. Agregar Secrets para DEV

**Secret 1:**
```
Name: AWS_ACCESS_KEY_ID_DEV

Value: AKIA...
(Pegar el Access Key ID del usuario github-actions-dev)

Click: Add secret
```

**Secret 2:**
```
Name: AWS_SECRET_ACCESS_KEY_DEV

Value: xxxxxxxxxx
(Pegar el Secret Access Key del usuario github-actions-dev)

Click: Add secret
```

---

### 3. Agregar Secrets para QA

**Secret 3:**
```
Name: AWS_ACCESS_KEY_ID_QA

Value: AKIA...
(Pegar el Access Key ID del usuario github-actions-qa)

Click: Add secret
```

**Secret 4:**
```
Name: AWS_SECRET_ACCESS_KEY_QA

Value: xxxxxxxxxx
(Pegar el Secret Access Key del usuario github-actions-qa)

Click: Add secret
```

---

### 4. Agregar Secrets para NADRO-QA

**Secret 5:**
```
Name: AWS_ACCESS_KEY_ID_NADRO_QA

Value: AKIA...
(Pegar el Access Key ID del usuario github-actions-nadro-qa de Cuenta 2)

Click: Add secret
```

**Secret 6:**
```
Name: AWS_SECRET_ACCESS_KEY_NADRO_QA

Value: xxxxxxxxxx
(Pegar el Secret Access Key del usuario github-actions-nadro-qa de Cuenta 2)

Click: Add secret
```

---

### 5. Agregar Secrets para NADRO-PROD

**Secret 7:**
```
Name: AWS_ACCESS_KEY_ID_NADRO_PROD

Value: AKIA...
(Pegar el Access Key ID del usuario github-actions-nadro-prod de Cuenta 3)

Click: Add secret
```

**Secret 8:**
```
Name: AWS_SECRET_ACCESS_KEY_NADRO_PROD

Value: xxxxxxxxxx
(Pegar el Secret Access Key del usuario github-actions-nadro-prod de Cuenta 3)

Click: Add secret
```

---

## ✅ Verificación

Debes ver 8 secrets en la lista:

```
AWS_ACCESS_KEY_ID_DEV              Updated X seconds ago
AWS_SECRET_ACCESS_KEY_DEV          Updated X seconds ago
AWS_ACCESS_KEY_ID_QA               Updated X seconds ago
AWS_SECRET_ACCESS_KEY_QA           Updated X seconds ago
AWS_ACCESS_KEY_ID_NADRO_QA         Updated X seconds ago
AWS_SECRET_ACCESS_KEY_NADRO_QA     Updated X seconds ago
AWS_ACCESS_KEY_ID_NADRO_PROD       Updated X seconds ago
AWS_SECRET_ACCESS_KEY_NADRO_PROD   Updated X seconds ago
```

---

## 🚀 Siguiente Paso

**¡LISTO PARA DEPLOYAR!**

Prueba haciendo push a branch dev:

```bash
git checkout dev
git add .
git commit -m "test: probar deploy automático"
git push origin dev
```

Luego ve a:
```
https://github.com/jsalinas1616/invenadro/actions
```

Deberías ver el workflow ejecutándose.

---

## 🔍 Troubleshooting

Si el workflow falla con error de autenticación:

1. Verificar que las Access Keys estén correctas
2. Verificar que los nombres de los secrets sean exactos:
   - `AWS_ACCESS_KEY_ID_DEV` (no `AWS_ACCESS_KEY_DEV`)
   - `AWS_SECRET_ACCESS_KEY_DEV`
3. Verificar que el usuario IAM tenga todos los permisos
4. Verificar que las Access Keys estén activas en AWS

---

## 🔐 Seguridad

**⚠️ IMPORTANTE:**
- NUNCA compartas las Secret Access Keys en texto plano
- NUNCA las subas a Git
- NUNCA las pegues en chat/email sin encriptar
- Usa GitHub Secrets (están encriptadas)
- Si se comprometen, desactívalas inmediatamente en AWS y genera nuevas
