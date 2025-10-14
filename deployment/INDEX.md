# 📚 Índice de Documentación - Migración de Infraestructura

Este directorio contiene toda la documentación y scripts necesarios para migrar de infraestructura compartida a infraestructura independiente.

---

## 📋 Guías de Usuario

### 1. 🚨 **README_MIGRATION.md** (EN RAÍZ)
**Lee esto PRIMERO**

Advertencia crítica sobre el problema de infraestructura compartida y guía rápida de 5 pasos para migrar.

- ⏱️ Lectura: 5 minutos
- 🎯 Audiencia: Todos
- 📍 Ubicación: `/README_MIGRATION.md`

### 2. ⚡ **QUICK_START.md**
**Guía paso a paso para inicio rápido**

Instrucciones detalladas para crear toda la infraestructura en 30 minutos usando scripts automatizados.

- ⏱️ Ejecución: 30 minutos
- 🎯 Audiencia: Desarrolladores que quieren migrar YA
- 📍 Ubicación: `deployment/QUICK_START.md`

### 3. 📖 **MIGRATION_PLAN.md**
**Plan completo de migración**

Documento exhaustivo con todos los detalles técnicos, orden de creación de recursos, configuraciones necesarias y troubleshooting.

- ⏱️ Lectura: 20 minutos
- 🎯 Audiencia: Arquitectos, DevOps
- 📍 Ubicación: `deployment/MIGRATION_PLAN.md`

### 4. 📊 **INFRASTRUCTURE_COMPARISON.md**
**Comparación detallada: Antes vs Después**

Tabla comparativa de todos los recursos, cambios en archivos de código y checklist completo de migración.

- ⏱️ Lectura: 15 minutos
- 🎯 Audiencia: Todos (para entender el alcance)
- 📍 Ubicación: `deployment/INFRASTRUCTURE_COMPARISON.md`

### 5. 📑 **INDEX.md** (Este archivo)
**Índice de toda la documentación**

Guía para navegar por toda la documentación y scripts disponibles.

---

## 🔧 Configuración

### **config-environments.json**
**Configuración centralizada de ambientes**

Archivo JSON con toda la configuración de ambientes (dev, prod):
- IDs de API Gateway
- IDs de Cognito
- Nombres de recursos S3, DynamoDB, Lambda
- ARNs de Step Functions
- URLs permitidas para CORS

**⚠️ IMPORTANTE:** Actualizar este archivo después de crear cada recurso.

```bash
# Ver configuración
cat deployment/config-environments.json | jq '.environments.dev'
```

---

## 🤖 Scripts de Automatización

Todos los scripts están en: `deployment/scripts/`

### Script 1: **1-create-infrastructure.sh**
**Crear infraestructura base de AWS**

Crea automáticamente:
- 3 buckets S3 (uploads, results, frontend)
- 1 tabla DynamoDB
- 2 IAM Roles (Lambda y Step Function)
- 1 Cognito User Pool con App Client

```bash
./deployment/scripts/1-create-infrastructure.sh
```

⏱️ Tiempo: ~10 minutos  
🎯 Ejecutar: Primera vez, una sola vez

---

### Script 2: **2-create-lambdas.sh**
**Crear/actualizar las 8 funciones Lambda**

Crea o actualiza las funciones Lambda con:
- Empaquetado automático (ZIP)
- Variables de entorno configuradas
- Timeouts y memoria optimizados por función

```bash
./deployment/scripts/2-create-lambdas.sh
```

⏱️ Tiempo: ~5 minutos  
🎯 Ejecutar: Cada vez que hagas cambios en el código Lambda

---

### Script 3: **update-all-configs.sh**
**Actualizar todas las configuraciones hardcodeadas**

Reemplaza en TODOS los archivos:
- IDs de API Gateway
- IDs de Cognito
- Nombres de buckets S3
- Nombres de tablas DynamoDB
- ARNs de Step Functions
- Prefijos de Lambda

```bash
./deployment/scripts/update-all-configs.sh
```

⏱️ Tiempo: ~2 minutos  
🎯 Ejecutar: Después de crear API Gateway y Cognito

---

### Script 4: **verify-infrastructure.sh**
**Verificar qué recursos existen**

Verifica en AWS:
- ✅ Recursos que ya existen
- ❌ Recursos que faltan
- 📊 Porcentaje de completitud

```bash
./deployment/scripts/verify-infrastructure.sh
```

⏱️ Tiempo: ~30 segundos  
🎯 Ejecutar: En cualquier momento para ver el estado

---

### Script 5: **cleanup-all.sh**
**⚠️ ELIMINAR toda la infraestructura**

**CUIDADO:** Script destructivo e irreversible.

Elimina TODO:
- 8 funciones Lambda
- 3 buckets S3 (vaciándolos primero)
- 1 tabla DynamoDB
- 1 Cognito User Pool
- 2 IAM Roles
- 1 Step Function

```bash
./deployment/scripts/cleanup-all.sh
# Te pedirá confirmación escribiendo "ELIMINAR"
```

⏱️ Tiempo: ~5 minutos  
🎯 Ejecutar: Solo si quieres empezar de cero

---

## 🔐 Políticas IAM

Ubicación: `deployment/aws-permissions/`

### **invenadro-lambda-policy.json**
Permisos para las funciones Lambda:
- CloudWatch Logs
- DynamoDB (tabla invenadro-jobs-dev)
- S3 (buckets invenadro-*)
- Step Functions (InvenadroStateMachine)
- Lambda Invoke (entre sí)

### **stepfunction-role-policy.json**
Permisos para la Step Function:
- Invocar funciones Lambda (invenadro-dev-*)
- CloudWatch Logs

### **stepfunction-trust-policy.json**
Trust policy para que AWS Step Functions asuma el role.

---

## 📁 Estructura del Directorio

```
deployment/
├── INDEX.md                           # 📑 Este archivo
├── QUICK_START.md                     # ⚡ Guía rápida (30 min)
├── MIGRATION_PLAN.md                  # 📖 Plan completo
├── INFRASTRUCTURE_COMPARISON.md       # 📊 Comparación detallada
├── config-environments.json           # ⚙️ Configuración centralizada
│
├── aws-permissions/
│   ├── invenadro-lambda-policy.json          # 🔐 Políticas Lambda
│   ├── stepfunction-role-policy.json         # 🔐 Políticas Step Function
│   ├── stepfunction-trust-policy.json        # 🔐 Trust policy
│   ├── aws-permissions.json                  # 📋 Configuración original
│   ├── lambda-policy.json                    # 📋 Política original
│   ├── stepfunction-lambda-policy.json       # 📋 Política original
│   └── README.md                             # 📄 Doc de permisos
│
└── scripts/
    ├── 1-create-infrastructure.sh     # 🚀 Crear infra base
    ├── 2-create-lambdas.sh            # ⚡ Crear Lambdas
    ├── update-all-configs.sh          # 🔄 Actualizar configs
    ├── verify-infrastructure.sh       # 🔍 Verificar estado
    └── cleanup-all.sh                 # 🗑️ Eliminar todo
```

---

## 🎯 Flujo Recomendado

### Para Migración Completa (Primera Vez)

```bash
# 1. Verificar estado actual
./deployment/scripts/verify-infrastructure.sh

# 2. Crear infraestructura base
./deployment/scripts/1-create-infrastructure.sh
# Guardar User Pool ID y Client ID

# 3. Crear Lambdas
./deployment/scripts/2-create-lambdas.sh

# 4. Actualizar configuraciones
./deployment/scripts/update-all-configs.sh
# Proporcionar IDs de Cognito

# 5. Crear API Gateway (MANUAL desde consola AWS)
# Ver QUICK_START.md Paso 4

# 6. Actualizar configuraciones de nuevo
./deployment/scripts/update-all-configs.sh
# Proporcionar API Gateway ID

# 7. Crear Step Function
SF_ROLE_ARN=$(aws iam get-role --role-name invenadro-stepfunction-execution-role --query 'Role.Arn' --output text)
aws stepfunctions create-state-machine \
  --name InvenadroStateMachine \
  --definition file://infrastructure/step-function.json \
  --role-arn ${SF_ROLE_ARN}

# 8. Re-desplegar Lambdas con configs actualizadas
./deployment/scripts/2-create-lambdas.sh

# 9. Deploy frontend
cd FrontEnd-lambdas
npm run build
aws s3 sync build/ s3://invenadro-frontend-dev --delete

# 10. Verificar que todo está listo
./deployment/scripts/verify-infrastructure.sh
```

### Para Re-Deploy de Código (Después de Migración)

```bash
# Re-desplegar todas las Lambdas
./deployment/scripts/2-create-lambdas.sh

# O una Lambda específica
cd lambda-processor
zip -r lambda-processor-deploy.zip . -x "*.zip"
aws lambda update-function-code \
  --function-name invenadro-dev-processor \
  --zip-file fileb://lambda-processor-deploy.zip
```

---

## 📊 Checklist de Migración

### Fase 1: Preparación
- [x] Documentación creada
- [x] Scripts de automatización listos
- [x] Configuración centralizada preparada
- [ ] Prerequisitos verificados (AWS CLI, jq, Node.js)

### Fase 2: Infraestructura Base
- [ ] Buckets S3 creados
- [ ] Tabla DynamoDB creada
- [ ] IAM Roles creados
- [ ] Cognito User Pool creado
- [ ] IDs guardados en archivo seguro

### Fase 3: Funciones Lambda
- [ ] 8 funciones Lambda creadas
- [ ] Variables de entorno configuradas
- [ ] Permisos configurados

### Fase 4: API Gateway
- [ ] API REST creada
- [ ] 5 endpoints configurados
- [ ] Cognito Authorizer configurado
- [ ] CORS configurado
- [ ] API desplegada en stage dev

### Fase 5: Step Function
- [ ] Definición actualizada con nuevos ARNs
- [ ] State Machine creada
- [ ] Permisos configurados

### Fase 6: Actualizaciones
- [ ] Configuraciones actualizadas en código
- [ ] Frontend actualizado con nuevos IDs
- [ ] Lambdas re-desplegadas

### Fase 7: Frontend
- [ ] Build generado
- [ ] Desplegado en S3
- [ ] Bucket policy configurada
- [ ] Acceso verificado

### Fase 8: Testing
- [ ] Usuario creado en Cognito
- [ ] Login exitoso
- [ ] Upload de archivo de prueba
- [ ] Proceso completo verificado
- [ ] Logs revisados en CloudWatch

### Fase 9: Finalización
- [ ] Cambios commiteados a git
- [ ] Documentación actualizada
- [ ] README principal actualizado
- [ ] Tag de versión creado

---

## 🆘 Troubleshooting Común

### "Permission denied" al ejecutar scripts

```bash
chmod +x deployment/scripts/*.sh
```

### "Resource not found"

```bash
# Verificar qué falta
./deployment/scripts/verify-infrastructure.sh
```

### "CORS policy error" en frontend

Verificar en cada Lambda:
```javascript
const ALLOWED_ORIGINS = [
    'http://invenadro-frontend-dev.s3-website-us-east-1.amazonaws.com',
    'http://localhost:3000'
];
```

### "Cognito Authorizer failed"

1. Verificar User Pool ID en API Gateway Authorizer
2. Verificar que el token JWT está en header `Authorization: Bearer <token>`
3. Verificar que el usuario está confirmado en Cognito

---

## 📞 Comandos Útiles

```bash
# Ver logs en tiempo real
aws logs tail /aws/lambda/invenadro-dev-processor --follow

# Listar recursos
aws lambda list-functions | grep invenadro
aws s3 ls | grep invenadro
aws dynamodb list-tables | grep invenadro

# Verificar estado de Step Function
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:975130647458:stateMachine:InvenadroStateMachine \
  --max-results 5

# Ver estructura del proyecto
tree -L 2 -I 'node_modules|build|*.zip'
```

---

## 🎓 Referencias

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS Step Functions Documentation](https://docs.aws.amazon.com/step-functions/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)

---

## ✅ Estado del Proyecto

**Fecha:** Octubre 2025  
**Estado:** 🟡 Documentación completa, infraestructura pendiente de crear  
**Próximo paso:** Ejecutar `./deployment/scripts/verify-infrastructure.sh`

---

**¿Dudas?** Lee primero `QUICK_START.md` para inicio rápido o `MIGRATION_PLAN.md` para detalles completos.

