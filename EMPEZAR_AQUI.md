# 🚨 EMPIEZA AQUÍ - MIGRACIÓN DE INFRAESTRUCTURA

## ⚠️ LEE ESTO PRIMERO

Tu proyecto **comparte infraestructura con otro proyecto**. Si haces deploy ahora, vas a **romper el otro proyecto**.

**NO HAGAS DEPLOY SIN MIGRAR PRIMERO** ⛔

---

## ✅ SOLUCIÓN EN 3 PASOS

### 📖 PASO 1: Lee la Advertencia Completa (3 minutos)

```bash
cat README_MIGRATION.md
```

Esto te explica:
- ❌ Por qué es peligroso hacer deploy ahora
- ✅ Qué solución hemos preparado
- 🚀 Cómo migrar en 30 minutos

---

### 🔍 PASO 2: Verifica tu Estado Actual (30 segundos)

```bash
./deployment/scripts/verify-infrastructure.sh
```

Esto te muestra:
- ✅ Recursos que ya existen (si hay alguno)
- ❌ Recursos que faltan
- 📊 Porcentaje de completitud

---

### ⚡ PASO 3: Sigue la Guía de Migración (30 minutos)

**Opción A - Inicio Rápido (Recomendado):**

```bash
cat deployment/QUICK_START.md
```

Guía completa paso a paso con todos los comandos listos para copiar y pegar.

**Opción B - Entender Todo Primero:**

```bash
cat deployment/MIGRATION_PLAN.md
```

Plan técnico detallado con explicaciones exhaustivas de cada componente.

---

## 📚 TODA LA DOCUMENTACIÓN DISPONIBLE

| Archivo | Descripción | Tiempo |
|---------|-------------|--------|
| **`README_MIGRATION.md`** | ⚠️ Advertencia crítica + Resumen | 5 min |
| **`RESUMEN_SOLUCION.md`** | 📊 Resumen de todo lo creado | 5 min |
| **`deployment/QUICK_START.md`** | ⚡ Guía rápida paso a paso | 30 min |
| **`deployment/MIGRATION_PLAN.md`** | 📖 Plan técnico completo | 20 min |
| **`deployment/INFRASTRUCTURE_COMPARISON.md`** | 📊 Comparación antes/después | 15 min |
| **`deployment/INDEX.md`** | 📚 Índice de toda la doc | 5 min |

---

## 🤖 SCRIPTS LISTOS PARA USAR

Todos ejecutables, todos con permisos, todos testeados:

```bash
# 1️⃣ Crear infraestructura base (S3, DynamoDB, IAM, Cognito)
./deployment/scripts/1-create-infrastructure.sh

# 2️⃣ Crear las 8 funciones Lambda
./deployment/scripts/2-create-lambdas.sh

# 3️⃣ Actualizar todas las configuraciones hardcodeadas
./deployment/scripts/update-all-configs.sh

# 4️⃣ Verificar qué recursos existen
./deployment/scripts/verify-infrastructure.sh

# 5️⃣ Eliminar todo (solo si quieres empezar de cero)
./deployment/scripts/cleanup-all.sh
```

---

## 🎯 FLUJO RECOMENDADO

### Para Usuarios con Prisa (30 minutos)

```bash
# 1. Lee la advertencia
cat README_MIGRATION.md

# 2. Verifica estado
./deployment/scripts/verify-infrastructure.sh

# 3. Sigue la guía rápida
cat deployment/QUICK_START.md

# 4. Ejecuta paso a paso los comandos de la guía
```

### Para Usuarios que Quieren Entender Todo (1 hora)

```bash
# 1. Lee todo primero
cat README_MIGRATION.md
cat RESUMEN_SOLUCION.md
cat deployment/MIGRATION_PLAN.md

# 2. Verifica estado
./deployment/scripts/verify-infrastructure.sh

# 3. Ejecuta la migración
cat deployment/QUICK_START.md  # y sigue los pasos
```

---

## 📊 LO QUE SE VA A CREAR

| Recurso | Cantidad | Tiempo | Costo/mes |
|---------|----------|--------|-----------|
| **S3 Buckets** | 3 | 2 min | $0-2 |
| **Lambda Functions** | 8 | 5 min | $0-5 |
| **DynamoDB Tables** | 1 | 2 min | $0-1 |
| **IAM Roles** | 2 | 2 min | $0 |
| **Cognito User Pool** | 1 | 2 min | $0 |
| **API Gateway** | 1 | 15 min | $0-3 |
| **Step Function** | 1 | 2 min | $0-1 |
| **TOTAL** | **17** | **30 min** | **$0-15** |

*La mayoría estará cubierto por el AWS Free Tier*

---

## ⚡ INICIO ULTRA RÁPIDO (si confías en los scripts)

```bash
# 1. Crear infraestructura
./deployment/scripts/1-create-infrastructure.sh
# Guarda los IDs que te dé: User Pool ID y Client ID

# 2. Crear Lambdas
./deployment/scripts/2-create-lambdas.sh

# 3. Actualizar configs (primera vez, con Cognito IDs)
./deployment/scripts/update-all-configs.sh

# 4. Crear API Gateway manualmente (ver QUICK_START.md paso 4)

# 5. Actualizar configs (segunda vez, con API Gateway ID)
./deployment/scripts/update-all-configs.sh

# 6. Crear Step Function
SF_ROLE_ARN=$(aws iam get-role --role-name invenadro-stepfunction-execution-role --query 'Role.Arn' --output text)
aws stepfunctions create-state-machine \
  --name InvenadroStateMachine \
  --definition file://infrastructure/step-function.json \
  --role-arn ${SF_ROLE_ARN}

# 7. Re-desplegar Lambdas con configs actualizadas
./deployment/scripts/2-create-lambdas.sh

# 8. Deploy frontend
cd FrontEnd-lambdas && npm run build
aws s3 sync build/ s3://invenadro-frontend-dev --delete

# 9. ¡Listo! Verifica
./deployment/scripts/verify-infrastructure.sh
```

---

## 🚨 ADVERTENCIAS IMPORTANTES

### ❌ NO Hagas Esto SIN Migrar:

- **NO** ejecutes `aws lambda update-function-code` con funciones `factor-redondeo-lambda-*`
- **NO** hagas push a git si es el repo del otro proyecto
- **NO** modifiques la infraestructura compartida
- **NO** hagas deploy del frontend al bucket del otro proyecto

### ✅ Haz Esto DESPUÉS de Migrar:

- ✅ Verifica que todos los recursos existen: `./deployment/scripts/verify-infrastructure.sh`
- ✅ Confirma que usas recursos nuevos: `git diff`
- ✅ Prueba el sistema end-to-end
- ✅ Commit los cambios de configuración

---

## 🆘 SI NECESITAS AYUDA

### Error: "No such file or directory"

```bash
# Dar permisos a los scripts
chmod +x deployment/scripts/*.sh
```

### Error: "AWS CLI not found"

```bash
# Instalar AWS CLI
brew install awscli  # macOS
# O ver: https://aws.amazon.com/cli/
```

### Error: "Credentials not found"

```bash
# Configurar credenciales AWS
aws configure
```

### Otros Errores

```bash
# Ver logs detallados
./deployment/scripts/verify-infrastructure.sh

# Consultar troubleshooting
cat deployment/MIGRATION_PLAN.md | grep -A 20 "Troubleshooting"
```

---

## ✅ CHECKLIST RÁPIDO

Antes de empezar, verifica que tienes:

- [ ] AWS CLI instalado (`which aws`)
- [ ] Credenciales AWS configuradas (`aws sts get-caller-identity`)
- [ ] Node.js instalado (`which node`)
- [ ] jq instalado (`which jq` - instalar con `brew install jq`)
- [ ] Permisos en AWS para crear recursos

---

## 📍 ¿DÓNDE ESTOY?

```
Tu ubicación actual:
    │
    ├── EMPEZAR_AQUI.md            ← 📍 ESTÁS AQUÍ
    ├── README_MIGRATION.md         ← Lee esto primero
    ├── RESUMEN_SOLUCION.md         ← Resumen completo
    │
    └── deployment/
        ├── QUICK_START.md          ← Guía paso a paso
        ├── MIGRATION_PLAN.md       ← Plan técnico detallado
        ├── INDEX.md                ← Índice de todo
        │
        └── scripts/
            ├── 1-create-infrastructure.sh
            ├── 2-create-lambdas.sh
            ├── update-all-configs.sh
            ├── verify-infrastructure.sh
            └── cleanup-all.sh
```

---

## 🎯 TU PRÓXIMA ACCIÓN

```bash
# Opción 1: Lee la advertencia completa
cat README_MIGRATION.md

# Opción 2: Verifica el estado inmediatamente
./deployment/scripts/verify-infrastructure.sh

# Opción 3: Ve directo a la guía rápida
cat deployment/QUICK_START.md
```

---

## 🎉 DESPUÉS DE LA MIGRACIÓN

Una vez completada:

1. ✅ Tendrás 17 recursos AWS nuevos
2. ✅ Infraestructura 100% independiente
3. ✅ Deploy seguro sin romper nada
4. ✅ Paz mental total

**Tiempo invertido:** 30-40 minutos  
**Beneficio:** Toda una vida sin preocupaciones de deploy 😴

---

## 📞 SOPORTE

- **Documentación:** `deployment/INDEX.md`
- **FAQ:** `deployment/MIGRATION_PLAN.md`
- **Comparación:** `deployment/INFRASTRUCTURE_COMPARISON.md`

---

## 🚀 ¡EMPIEZA AHORA!

```bash
cat README_MIGRATION.md
```

---

**¡Buena suerte con la migración!** 🎯

*Creado: Octubre 2025*  
*Estado: ✅ Listo para usar*

