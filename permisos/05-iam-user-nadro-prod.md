# Usuario IAM - NADRO-PROD (github-actions-nadro-prod)

## 🎯 Objetivo

Crear un usuario IAM con Access Keys para que GitHub Actions pueda deployar a nadro-prod.

---

## 📋 Pasos

**Seguir EXACTAMENTE los mismos pasos que en [`01-iam-user-dev.md`](./01-iam-user-dev.md)**

**PERO cambiar:**
```
Cuenta AWS: Cuenta 3 (nadro-prod)
User name: github-actions-nadro-prod
Description: GitHub Actions user for deploying to nadro-prod environment
Policy JSON: policies/github-actions-prod-policy.json
Policy name: InvenadroNadroProdMinimumPrivileges
Description tag: GitHub Actions NADRO-PROD deployment
```

**⚠️ IMPORTANTE:** 
- Este usuario se crea en la CUENTA AWS 3 (nadro-prod), NO en la Cuenta 1 ni 2.
- Antes de usar el JSON, **REEMPLAZAR** `CUENTA_NADRO_PROD` con el número de cuenta real de nadro-prod en el archivo `policies/github-actions-prod-policy.json`

---

## 📝 Resumen

1. Acceder a AWS Console de la Cuenta 3 (nadro-prod)
2. **Editar** `policies/github-actions-prod-policy.json` y reemplazar `CUENTA_NADRO_PROD` con el número de cuenta real
3. Crear usuario: `github-actions-nadro-prod`
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
Cuenta: Cuenta AWS 3 (nadro-prod)
User name: github-actions-nadro-prod
Permissions: 1 inline policy (InvenadroNadroProdMinimumPrivileges)
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

[`06-github-secrets.md`](./06-github-secrets.md)
