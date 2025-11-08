# Usuario IAM - QA (github-actions-qa)

## 🎯 Objetivo

Crear un usuario IAM con Access Keys para que GitHub Actions pueda deployar a jul-qa.

---

## 📋 Pasos

**Seguir EXACTAMENTE los mismos pasos que en [`01-iam-user-dev.md`](./01-iam-user-dev.md)**

**PERO cambiar:**
```
User name: github-actions-qa
Description: GitHub Actions user for deploying to jul-qa environment
Policy JSON: policies/github-actions-qa-policy.json
Policy name: InvenadroQaMinimumPrivileges
Description tag: GitHub Actions QA deployment
```

---

## 📝 Resumen

1. Crear usuario: `github-actions-qa`
2. Agregar inline policy con el JSON de `policies/github-actions-qa-policy.json`
3. Crear Access Keys
4. Copiar credenciales:
   ```
   Access Key ID: AKIA...
   Secret Access Key: xxxxxxxxxx
   ```

---

## ✅ Verificación

```
User name: github-actions-qa
Permissions: 1 inline policy (InvenadroQaMinimumPrivileges)
Access keys: 1 active
```

---

## 📝 Información a Enviar

```
Access Key ID: AKIA...
Secret Access Key: (de forma segura)
```

---

## ⏭️ Siguiente Paso

[`03-iam-user-prod.md`](./03-iam-user-prod.md)
