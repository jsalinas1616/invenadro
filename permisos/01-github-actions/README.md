# GitHub Actions IAM Policies

## Propósito

Estas políticas otorgan permisos a **GitHub Actions** para desplegar (crear, actualizar, borrar) la infraestructura de Invenadro en AWS.

---

## ️ **IMPORTANTE: Políticas Divididas**

Debido al **límite de 6,144 caracteres** de AWS IAM para políticas inline, cada ambiente requiere **2 políticas**:

### **Estructura de Archivos**

| Ambiente | Parte 1 (Compute) | Parte 2 (Infrastructure) |
|----------|-------------------|-------------------------|
| **jul-dev** | `invenadro-jul-dev-policy-part1-compute.json` | `invenadro-jul-dev-policy-part2-infrastructure.json` |
| **jul-qa** | `invenadro-jul-qa-policy-part1-compute.json` | `invenadro-jul-qa-policy-part2-infrastructure.json` |
| **nadro-qa** | `invenadro-nadro-qa-policy-part1-compute.json` | `invenadro-nadro-qa-policy-part2-infrastructure.json` |
| **nadro-prod** | `invenadro-nadro-prod-policy-part1-compute.json` | `invenadro-nadro-prod-policy-part2-infrastructure.json` |

### **Qué incluye cada parte:**

#### **Part 1: Compute & Storage** (~3,800 caracteres)
- Lambda (Create, Update, List)
- S3 (Buckets y Objects)
- DynamoDB (Tables)

#### **Part 2: Infrastructure & Services** (~5,300 caracteres)
- CloudFormation
- API Gateway
- Step Functions
- CloudWatch (Logs & Metrics)
- CloudFront
- IAM Roles
- Cognito
- STS

---

## Archivos Originales (Para Referencia)

** NO USAR - Exceden el límite de AWS**

| Archivo | Tamaño | Estado |
|---------|--------|--------|
| `invenadro-jul-dev-policy.json` | 9,073 chars | Demasiado grande |
| `invenadro-jul-qa-policy.json` | 9,055 chars | Demasiado grande |
| `invenadro-nadro-qa-policy.json` | 9,148 chars | Demasiado grande |
| `invenadro-nadro-prod-policy.json` | 9,196 chars | Demasiado grande |

**Mantener solo como referencia documental.**

---

## Permisos Otorgados

### Servicios Principales

#### Lambda
- Crear, actualizar, borrar funciones
- Gestionar configuración
- Publicar versiones
- **Etiquetar funciones** (TagResource)
- **Invocar funciones** (para Custom Resources de CloudFormation)

#### S3
- Crear, borrar buckets
- Subir, leer, borrar objetos
- Configurar políticas y encriptación
- **Configurar OwnershipControls** (requerido desde 2024)

#### DynamoDB
- Crear, actualizar, borrar tablas
- Configurar TTL y streams
- **Configurar ContinuousBackups** (Point-in-time recovery)

#### CloudFormation
- Crear, actualizar, borrar stacks
- Describir recursos

#### IAM
- Crear, actualizar, borrar roles para lambdas
- Gestionar políticas inline
- **Crear rol global** `serverlessApiGatewayCloudWatchRole` (necesario para API Gateway)

#### Step Functions
- Crear, actualizar, borrar máquinas de estado

#### API Gateway
- Crear, actualizar, borrar APIs
- Configurar autorizadores Cognito

#### Cognito
- Crear, actualizar User Pools

#### CloudWatch Logs
- Crear log groups
- Configurar retención

---

## Restricciones de Seguridad

### 1. Naming Convention

Solo puede gestionar recursos con estos prefijos:

```
invenadro-backend-{STAGE}-*
invenadro-frontend-{STAGE}-*
```

### 2. Región Fija

```
mx-central-1 (México Central)
```

### 3. Cuenta Específica

Cada política está limitada a una cuenta AWS específica.

### 4. Sin Permisos de Runtime

Estas políticas **NO** permiten:
- Invocar lambdas
- Leer/escribir datos de DynamoDB en runtime
- Ejecutar Step Functions

---

## Ejemplo de Uso

### Crear Usuario IAM con 2 Políticas Inline

```bash
# 1. Crear usuario
aws iam create-user \
 --user-name github-actions-jul-dev

# 2. Agregar PRIMERA política inline (Compute & Storage)
aws iam put-user-policy \
 --user-name github-actions-jul-dev \
 --policy-name InvenadroJulDevComputeStorage \
 --policy-document file://invenadro-jul-dev-policy-part1-compute.json

# 3. Agregar SEGUNDA política inline (Infrastructure & Services)
aws iam put-user-policy \
 --user-name github-actions-jul-dev \
 --policy-name InvenadroJulDevInfrastructure \
 --policy-document file://invenadro-jul-dev-policy-part2-infrastructure.json

# 4. Verificar que ambas se aplicaron
aws iam list-user-policies \
 --user-name github-actions-jul-dev

# Output esperado:
# {
# "PolicyNames": [
# "InvenadroJulDevComputeStorage",
# "InvenadroJulDevInfrastructure"
# ]
# }

# 5. Crear Access Keys
aws iam create-access-key \
 --user-name github-actions-jul-dev
```

### Configurar en GitHub

```yaml
# .github/workflows/deploy-dev.yml
- name: Configure AWS Credentials
 uses: aws-actions/configure-aws-credentials@v4
 with:
 aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID_DEV }}
 aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY_DEV }}
 aws-region: mx-central-1
```

---

## ️ Notas Importantes

### Placeholders

Los archivos contienen placeholders que serán reemplazados durante el deploy:
- `ACCOUNT_ID`: Se reemplaza por el número de cuenta AWS real
- `STAGE`: Se reemplaza por jul-dev, jul-qa, nadro-qa, o nadro-prod

### CloudFormation ARNs

Algunos ARNs en CloudFormation usan el formato viejo sin `jul-` o `nadro-`:
```
invenadro-backend-dev/* → Para jul-dev
invenadro-backend-qa/* → Para jul-qa
```

Esto es por compatibilidad con el stack name de CloudFormation.

---

## Auditoría

Para verificar qué puede hacer un usuario:

```bash
# Simular una acción
aws iam simulate-principal-policy \
 --policy-source-arn arn:aws:iam::975130647458:user/github-actions-jul-dev \
 --action-names lambda:CreateFunction \
 --resource-arns arn:aws:lambda:mx-central-1:975130647458:function:invenadro-backend-jul-dev-test
```

---

## Referencias

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [GitHub Actions AWS Integration](https://github.com/aws-actions/configure-aws-credentials)
- [Serverless Framework IAM](https://www.serverless.com/framework/docs/providers/aws/guide/iam)
