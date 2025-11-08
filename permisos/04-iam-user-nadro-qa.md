# Usuario IAM - NADRO-QA (github-actions-nadro-qa)

## 🎯 Objetivo

Crear un usuario IAM con Access Keys para que GitHub Actions pueda deployar a nadro-qa.

---

## 📋 Pasos

**Seguir EXACTAMENTE los mismos pasos que en [`01-iam-user-dev.md`](./01-iam-user-dev.md)**

**PERO cambiar:**
```
Cuenta AWS: Cuenta 2 (nadro-qa)
User name: github-actions-nadro-qa
Description: GitHub Actions user for deploying to nadro-qa environment
Policy JSON: policies/github-actions-nadro-qa-policy.json
Policy name: InvenadroNadroQaMinimumPrivileges
Description tag: GitHub Actions NADRO-QA deployment
```

**⚠️ IMPORTANTE:** 
- Este usuario se crea en la CUENTA AWS 2 (nadro-qa), NO en la Cuenta 1.
- Antes de usar el JSON, **REEMPLAZAR** `CUENTA_NADRO_QA` con el número de cuenta real de nadro-qa en el archivo `policies/github-actions-nadro-qa-policy.json`

---

## 📝 Resumen

1. Acceder a AWS Console de la Cuenta 2 (nadro-qa)
2. **Editar** `policies/github-actions-nadro-qa-policy.json` y reemplazar `CUENTA_NADRO_QA` con el número de cuenta real
3. Crear usuario: `github-actions-nadro-qa`
4. Agregar inline policy con el JSON editado
5. Crear Access Keys
6. Copiar credenciales:
   ```
   Access Key ID: AKIA...
   Secret Access Key: xxxxxxxxxx
   ```

---

## ✅ Verificación

```
Cuenta: Cuenta AWS 2 (nadro-qa)
User name: github-actions-nadro-qa
Permissions: 1 inline policy (InvenadroNadroQaMinimumPrivileges)
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

[`05-iam-user-nadro-prod.md`](./05-iam-user-nadro-prod.md)
