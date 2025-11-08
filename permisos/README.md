# Permisos Necesarios para GitHub Actions + Serverless Framework

## 📋 Índice

1. [Verificación de Runtime Lambda](#1-verificación-de-runtime-lambda)
2. [Usuarios IAM - Cuenta AWS 1](#2-usuarios-iam---cuenta-aws-1)
3. [Usuario IAM - Cuenta AWS 2](#3-usuario-iam---cuenta-aws-2)
4. [Usuario IAM - Cuenta AWS 3](#4-usuario-iam---cuenta-aws-3)
5. [GitHub Secrets](#5-github-secrets)
6. [Checklist de Validación](#6-checklist-de-validación)

---

## 1. Verificación de Runtime Lambda

**ANTES DE CONFIGURAR TODO:**

Verificar si `nodejs22.x` está disponible como runtime de Lambda:

```bash
aws lambda list-runtimes | grep nodejs
```

O en AWS Console:
```
Lambda → Create function → Runtime dropdown
```

**Runtimes esperados:**
- ✅ `nodejs20.x` (seguro disponible)
- 🤔 `nodejs22.x` (verificar si está disponible)

**Si nodejs22.x NO está disponible:**
- Notificar al equipo de desarrollo
- Se cambiará la configuración a `nodejs20.x`

---

## 2. Usuarios IAM - Cuenta AWS 1

**Cuenta:** jul-dev / jul-qa (Cuenta AWS 1: 975130647458)

### A. Crear Usuario IAM para JUL-DEV

Ver: [`01-iam-user-dev.md`](./01-iam-user-dev.md)

### B. Crear Usuario IAM para JUL-QA

Ver: [`02-iam-user-qa.md`](./02-iam-user-qa.md)

---

## 3. Usuario IAM - Cuenta AWS 2

**Cuenta:** nadro-qa (Cuenta AWS 2)

### A. Crear Usuario IAM para NADRO-QA

Ver: [`04-iam-user-nadro-qa.md`](./04-iam-user-nadro-qa.md)

---

## 4. Usuario IAM - Cuenta AWS 3

**Cuenta:** nadro-prod (Cuenta AWS 3)

### A. Crear Usuario IAM for NADRO-PROD

Ver: [`05-iam-user-nadro-prod.md`](./05-iam-user-nadro-prod.md)

---

## 5. GitHub Secrets

**Después de crear los usuarios IAM en AWS:**

Ver: [`06-github-secrets.md`](./06-github-secrets.md)

---

## 6. Checklist de Validación

```
CUENTA AWS 1 (975130647458 - jul-dev / jul-qa):
□ Usuario IAM github-actions-jul-dev creado
□ Usuario IAM github-actions-jul-qa creado
□ Access Keys generadas para JUL-DEV
□ Access Keys generadas para JUL-QA
□ Access Keys copiadas (4 keys total)

CUENTA AWS 2 (nadro-qa):
□ Usuario IAM github-actions-nadro-qa creado
□ Access Keys generadas para NADRO-QA
□ Access Keys copiadas (2 keys)

CUENTA AWS 3 (nadro-prod):
□ Usuario IAM github-actions-nadro-prod creado
□ Access Keys generadas para NADRO-PROD
□ Access Keys copiadas (2 keys)

GITHUB:
□ Secret AWS_ACCESS_KEY_ID_DEV agregado
□ Secret AWS_SECRET_ACCESS_KEY_DEV agregado
□ Secret AWS_ACCESS_KEY_ID_QA agregado
□ Secret AWS_SECRET_ACCESS_KEY_QA agregado
□ Secret AWS_ACCESS_KEY_ID_NADRO_QA agregado
□ Secret AWS_SECRET_ACCESS_KEY_NADRO_QA agregado
□ Secret AWS_ACCESS_KEY_ID_NADRO_PROD agregado
□ Secret AWS_SECRET_ACCESS_KEY_NADRO_PROD agregado

VERIFICACIÓN:
□ Runtime nodejs22.x o nodejs20.x verificado
□ Deploy test a jul-dev exitoso
□ Deploy test a jul-qa exitoso
□ Deploy test a nadro-qa exitoso
□ Deploy test a nadro-prod exitoso
```

---

## 📞 Contacto

**Proyecto:** invenadro
**Repositorio:** https://github.com/jsalinas1616/invenadro
**Responsable desarrollo:** Julian Salinas

---

## 📚 Referencias

- [AWS IAM Users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html)
- [AWS Access Keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Serverless Framework](https://www.serverless.com/framework/docs)
