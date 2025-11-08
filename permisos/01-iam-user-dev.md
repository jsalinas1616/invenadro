# Usuario IAM - DEV (github-actions-dev)

## 🎯 Objetivo

Crear un usuario IAM con Access Keys para que GitHub Actions pueda deployar a jul-dev.

---

## 📋 Pasos

### 1. Crear Usuario IAM

```
AWS Console → IAM → Users → Create user
```

### 2. Configurar Usuario

```
User name: github-actions-dev

Description: GitHub Actions user for deploying to jul-dev environment

Click: Next
```

### 3. Attach Permissions (Mínimos Privilegios)

**⚠️ IMPORTANTE: Usar política personalizada, NO policies de AWS**

En lugar de usar las políticas managed de AWS (demasiado permisos), usar la política JSON de mínimos privilegios:

```
Click: Add permissions → Create inline policy
Click: JSON tab
```

Copiar y pegar el contenido de:
**`policies/github-actions-dev-policy.json`**

```
Click: Review policy
Policy name: InvenadroDevMinimumPrivileges
Click: Create policy
```

```
Click: Create user
```

---

## 🔑 Crear Access Keys

### 1. Acceder al Usuario

```
IAM → Users → github-actions-dev
```

### 2. Crear Access Key

```
Tab: Security credentials
Click: Create access key
```

### 3. Tipo de Access Key

```
Use case: Application running outside AWS

Check: I understand the above recommendation...

Click: Next
```

### 4. Description (opcional)

```
Description tag: GitHub Actions DEV deployment

Click: Create access key
```

### 5. **⚠️ IMPORTANTE: Copiar Credenciales**

```
Access key ID: AKIA...
Secret access key: xxxxxxxxxx

⚠️ COPIAR AHORA - NO SE VOLVERÁ A MOSTRAR

Click: Download .csv file (recomendado)
```

**Guardar estas credenciales de forma segura - se necesitan para GitHub Secrets.**

```
Click: Done
```

---

## ✅ Verificación

```
User name: github-actions-dev
Permissions: 1 inline policy (InvenadroDevMinimumPrivileges)
Access keys: 1 active
```

---

## 📝 Información a Enviar

```
Access Key ID: AKIA...
Secret Access Key: (de forma segura)
```

**Enviar estas credenciales de forma segura al equipo de desarrollo.**

---

## ⏭️ Siguiente Paso

[`02-iam-user-qa.md`](./02-iam-user-qa.md)
