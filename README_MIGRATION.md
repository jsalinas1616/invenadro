# 🚨 ADVERTENCIA: Infraestructura Compartida

## ⚠️ PROBLEMA CRÍTICO

Este proyecto es una **copia exacta** de otro proyecto y actualmente **comparte toda la infraestructura AWS**:

- ❌ **Mismo API Gateway**: `8zck1369x8`
- ❌ **Mismas Lambdas**: `factor-redondeo-lambda-dev-*`
- ❌ **Mismos Buckets S3**
- ❌ **Misma Tabla DynamoDB**
- ❌ **Mismo Cognito User Pool**
- ❌ **Misma Step Function**

### 🔥 ¿Qué Puede Salir Mal?

Si haces deploy o push a git **SIN MIGRAR PRIMERO**, vas a:

1. **Sobrescribir las funciones Lambda del otro proyecto** 💥
2. **Romper el otro proyecto en producción** 💥
3. **Mezclar datos de ambos proyectos en la base de datos** 💥
4. **Causar conflictos imposibles de resolver** 💥

---

## ✅ SOLUCIÓN: Migración a Infraestructura Independiente

Hemos preparado **todo lo necesario** para crear tu propia infraestructura independiente en **30 minutos**.

### 🎯 Resultado Final

```
ANTES (Compartido)          DESPUÉS (Independiente)
─────────────────           ───────────────────────
factor-redondeo-*    →      invenadro-*
API: 8zck1369x8      →      API: <tu_nuevo_id>
Lambdas: 8           →      Lambdas: 8 (nuevas)
S3: 3 buckets        →      S3: 3 buckets (nuevos)
DynamoDB: 1 tabla    →      DynamoDB: 1 tabla (nueva)
Cognito: Compartido  →      Cognito: Pool propio
Step Function: 1     →      Step Function: 1 (nueva)
```

---

## 🚀 INICIO RÁPIDO (5 Pasos, 30 Minutos)

### Prerequisitos

```bash
# Verificar que tienes todo instalado
which aws      # AWS CLI
which node     # Node.js 20.x
which jq       # JSON processor
aws sts get-caller-identity  # Verificar credenciales AWS
```

### Paso 1: Crear Infraestructura Base (10 min)

```bash
./deployment/scripts/1-create-infrastructure.sh
```

**Esto crea:**
- ✅ 3 buckets S3
- ✅ 1 tabla DynamoDB
- ✅ 2 IAM Roles
- ✅ 1 Cognito User Pool

**Guarda los IDs que te dé:**
- User Pool ID: `us-east-1_XXXXXXXXX`
- Client ID: `xxxxxxxxxxxxxxxxxxxx`

### Paso 2: Crear Funciones Lambda (5 min)

```bash
./deployment/scripts/2-create-lambdas.sh
```

**Esto crea:**
- ✅ 8 funciones Lambda con nombres únicos

### Paso 3: Actualizar Configuraciones (2 min)

```bash
./deployment/scripts/update-all-configs.sh
```

Te pedirá los IDs del Paso 1. Por ahora, deja el API Gateway ID vacío.

### Paso 4: Crear API Gateway (15 min - MANUAL)

Por ahora debe hacerse desde la consola AWS. Consulta:

```bash
cat deployment/QUICK_START.md   # Ver sección "Paso 4"
```

**Una vez creado**, vuelve a ejecutar:

```bash
./deployment/scripts/update-all-configs.sh
```

Esta vez proporciona el API Gateway ID.

### Paso 5: Deploy Final (5 min)

```bash
# Crear Step Function
SF_ROLE_ARN=$(aws iam get-role --role-name invenadro-stepfunction-execution-role --query 'Role.Arn' --output text)

aws stepfunctions create-state-machine \
  --name InvenadroStateMachine \
  --definition file://infrastructure/step-function.json \
  --role-arn ${SF_ROLE_ARN} \
  --region us-east-1

# Re-desplegar Lambdas con configuraciones actualizadas
./deployment/scripts/2-create-lambdas.sh

# Deploy del frontend
cd FrontEnd-lambdas
npm install
npm run build
aws s3 sync build/ s3://invenadro-frontend-dev --delete

# Acceder
echo "Frontend: http://invenadro-frontend-dev.s3-website-us-east-1.amazonaws.com"
```

---

## 🔍 VERIFICAR ESTADO ACTUAL

Antes de empezar, puedes verificar qué infraestructura ya existe:

```bash
./deployment/scripts/verify-infrastructure.sh
```

Te mostrará:
- ✅ Recursos que ya existen
- ❌ Recursos que faltan

---

## 📚 DOCUMENTACIÓN COMPLETA

### Para Usuarios Nuevos

1. **`deployment/QUICK_START.md`** - Guía paso a paso (inicio rápido)
2. **`deployment/MIGRATION_PLAN.md`** - Plan completo de migración
3. **`deployment/INFRASTRUCTURE_COMPARISON.md`** - Comparación detallada

### Para Desarrolladores

1. **`deployment/config-environments.json`** - Configuración centralizada
2. **`deployment/aws-permissions/`** - Políticas IAM
3. **`deployment/scripts/`** - Scripts de automatización

### Comandos Útiles

```bash
# Verificar estado
./deployment/scripts/verify-infrastructure.sh

# Ver logs de Lambda
aws logs tail /aws/lambda/invenadro-dev-processor --follow

# Listar recursos
aws lambda list-functions | grep invenadro
aws s3 ls | grep invenadro

# Re-desplegar una Lambda
cd lambda-processor
zip -r lambda-processor-deploy.zip . -x "*.zip"
aws lambda update-function-code \
  --function-name invenadro-dev-processor \
  --zip-file fileb://lambda-processor-deploy.zip
```

---

## ⚠️ IMPORTANTE: NO HAGAS DEPLOY SIN MIGRAR

### ❌ NO Hagas Esto Sin Migrar Primero:

```bash
# ❌ NO ejecutar deployment al proyecto original
aws lambda update-function-code --function-name factor-redondeo-lambda-dev-*

# ❌ NO hacer push a git del otro proyecto
git push origin main   # (si es el repo del otro proyecto)

# ❌ NO subir cambios a la infraestructura compartida
```

### ✅ Haz Esto DESPUÉS de Migrar:

```bash
# ✅ Verificar que la migración está completa
./deployment/scripts/verify-infrastructure.sh

# ✅ Confirmar que usas recursos nuevos
git diff infrastructure/step-function.json
git diff FrontEnd-lambdas/src/services/lambdaService.js

# ✅ Deploy a TU infraestructura
./deployment/scripts/2-create-lambdas.sh
```

---

## 🆘 TROUBLESHOOTING

### Error: "Function not found"

```bash
# Verificar que creaste las Lambdas
aws lambda list-functions | grep invenadro

# Si no existen, créalas
./deployment/scripts/2-create-lambdas.sh
```

### Error: "User Pool not found"

```bash
# Listar User Pools
aws cognito-idp list-user-pools --max-results 60

# Si no existe el de invenadro, créalo
./deployment/scripts/1-create-infrastructure.sh
```

### Error: "Bucket does not exist"

```bash
# Verificar buckets
aws s3 ls | grep invenadro

# Si faltan, créalos
./deployment/scripts/1-create-infrastructure.sh
```

### Error: "CORS policy"

Verifica que cada Lambda tenga configurado:

```javascript
const ALLOWED_ORIGINS = [
    'http://invenadro-frontend-dev.s3-website-us-east-1.amazonaws.com',
    'http://localhost:3000'
];
```

---

## 📊 PROGRESO DE MIGRACIÓN

Marca lo que ya completaste:

- [ ] **Paso 1**: Crear infraestructura base (S3, DynamoDB, IAM, Cognito)
- [ ] **Paso 2**: Crear 8 funciones Lambda
- [ ] **Paso 3**: Actualizar configuraciones en código
- [ ] **Paso 4**: Crear API Gateway
- [ ] **Paso 5**: Crear Step Function
- [ ] **Paso 6**: Deploy frontend
- [ ] **Paso 7**: Testing end-to-end
- [ ] **Paso 8**: Commit de cambios
- [ ] **Paso 9**: Documentar infraestructura final

---

## 🎉 DESPUÉS DE LA MIGRACIÓN

Una vez completada la migración:

1. **Documenta los IDs generados** en un archivo seguro
2. **Haz commit** de los cambios de configuración
3. **Prueba el sistema** end-to-end
4. **Actualiza el README principal** con las nuevas URLs
5. **Configura CI/CD** para deployments automáticos
6. **¡Felicidades!** Ya tienes infraestructura independiente

---

## 🔒 SEGURIDAD

### No Commitees Estos Archivos:

```bash
# Ya están en .gitignore
deployment/cognito-ids.txt
deployment/config-environments.local.json
.env
.env.local
```

### Sí Commitea Estos:

```bash
deployment/config-environments.json  # Configuración sin secretos
deployment/scripts/*.sh              # Scripts de automatización
infrastructure/step-function.json    # Definición actualizada
```

---

## 📞 SOPORTE

Si tienes dudas:

1. **Lee** `deployment/QUICK_START.md`
2. **Ejecuta** `./deployment/scripts/verify-infrastructure.sh`
3. **Revisa** logs en CloudWatch
4. **Consulta** `deployment/MIGRATION_PLAN.md`

---

## ⏱️ TIEMPO ESTIMADO TOTAL

- ⚡ **Rápido** (con scripts): 30 minutos
- 🐢 **Manual** (sin scripts): 2-3 horas
- 🎯 **Recomendado**: Usar los scripts automatizados

---

## 🎯 CONCLUSIÓN

**NO uses este proyecto sin migrar primero.** La migración es rápida, segura y automatizada.

```bash
# Empieza ahora:
./deployment/scripts/verify-infrastructure.sh  # Ver estado actual
./deployment/scripts/1-create-infrastructure.sh  # Crear infraestructura
```

¡Buena suerte con la migración! 🚀

