# 🏥 Invenadro - Sistema de Optimización de Factor de Redondeo

Sistema de optimización de inventarios farmacéuticos mediante cálculo de Factor de Redondeo, implementado con arquitectura serverless en AWS.

---

## 🚨 IMPORTANTE: ANTES DE HACER DEPLOY

**Este proyecto requiere infraestructura AWS independiente.** 

Si eres nuevo en este proyecto:

```bash
# Lee esto primero (5 minutos)
cat EMPEZAR_AQUI.md
```

Si vas a hacer deploy:

```bash
# Verifica que la infraestructura existe
./deployment/scripts/verify-infrastructure.sh
```

---

## 📋 Resumen Ejecutivo

Este sistema procesa archivos Excel de inventario farmacéutico para calcular el factor de redondeo óptimo mediante optimización algorítmica. 

**Características principales:**
- ✅ Procesamiento asíncrono (el usuario no espera)
- ✅ Soporte para múltiples clientes simultáneos
- ✅ Arquitectura serverless 100% en AWS
- ✅ Interfaz web moderna con React
- ✅ Autenticación con AWS Cognito

---

## 🏗️ Arquitectura General

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend  │───▶│API Gateway + │───▶│  Step Function  │
│   (React)   │    │   Cognito    │    │  (Orquestador)  │
└─────────────┘    └──────────────┘    └─────────────────┘
                           │                       │
                           ▼                       ▼
                   ┌──────────────┐      ┌─────────────────┐
                   │     S3       │      │   DynamoDB      │
                   │ (Archivos)   │      │  (Estados)      │
                   └──────────────┘      └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │  8 Funciones    │
                                    │    Lambda       │
                                    └─────────────────┘
```

---

## 🚀 Inicio Rápido

### Para Desarrolladores Nuevos

1. **Lee la advertencia sobre infraestructura:**
   ```bash
   cat EMPEZAR_AQUI.md
   ```

2. **Verifica prerequisitos:**
   ```bash
   which aws      # AWS CLI instalado
   which node     # Node.js 20.x
   which jq       # JSON processor
   aws sts get-caller-identity  # Credenciales configuradas
   ```

3. **Verifica el estado de la infraestructura:**
   ```bash
   ./deployment/scripts/verify-infrastructure.sh
   ```

4. **Si falta infraestructura, sigue la guía:**
   ```bash
   cat deployment/QUICK_START.md
   ```

### Para Deploy de Código (Infraestructura Ya Existe)

```bash
# Re-desplegar todas las Lambdas
./deployment/scripts/2-create-lambdas.sh

# Re-desplegar frontend
cd FrontEnd-lambdas
npm run build
aws s3 sync build/ s3://invenadro-frontend-dev --delete
```

---

## 📁 Estructura del Proyecto

```
invenadro/
├── FrontEnd-lambdas/          # Frontend React
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── services/          # API clients
│   │   └── aws-config.js      # Config de Cognito
│   └── package.json
│
├── lambda-initiator/          # Punto de entrada del proceso
├── lambda-client-separator/   # Separa datos por cliente
├── lambda-processor/          # Motor de optimización
├── lambda-status-checker/     # Monitorea estado de procesos
├── lambda-client-aggregator/  # Consolida resultados
├── lambda-download-result/    # Genera respuesta final
├── lambda-excel-generator/    # Genera Excel por cliente
├── lambda-get-presigned-url/  # Genera URLs de subida
│
├── infrastructure/
│   └── step-function.json     # Definición de Step Function
│
└── deployment/                # 🎯 Scripts y documentación
    ├── QUICK_START.md         # Guía de inicio rápido
    ├── scripts/               # Scripts de automatización
    └── aws-permissions/       # Políticas IAM
```

---

## 🔧 Componentes Principales

### Backend (8 Funciones Lambda)

1. **lambda-initiator** - Recibe archivo, inicia Step Function
2. **lambda-client-separator** - Analiza y separa clientes
3. **lambda-processor** - Motor principal de optimización
4. **lambda-status-checker** - Monitorea estado de ejecuciones
5. **lambda-client-aggregator** - Consolida resultados
6. **lambda-download-result** - Genera respuesta para API
7. **lambda-excel-generator** - Genera Excel individual por cliente
8. **lambda-get-presigned-url** - Genera URLs para subir archivos a S3

### Frontend (React)

- **App.js** - Componente principal
- **services/lambdaService.js** - Cliente API
- **components/** - Componentes reutilizables
- **aws-config.js** - Configuración de Cognito

### Infraestructura AWS

- **API Gateway** - Endpoints REST con autenticación Cognito
- **Step Functions** - Orquestación de workflows
- **S3 Buckets** - Almacenamiento de archivos y resultados
- **DynamoDB** - Base de datos para tracking de procesos
- **Cognito User Pool** - Autenticación de usuarios

---

## 📊 Flujo de Procesamiento

### 1. Usuario Sube Archivo

Usuario selecciona archivo Excel y configuración → Frontend llama a API Gateway → Lambda Initiator recibe y sube a S3 → Inicia Step Function

### 2. Análisis y Separación

Step Function invoca Client Separator → Analiza cuántos clientes hay → Si es un cliente: procesamiento directo → Si son múltiples: crea ejecuciones paralelas

### 3. Procesamiento (Motor de Optimización)

Lambda Processor ejecuta por cada cliente → Aplica algoritmo de optimización → Calcula factor óptimo → Genera historial de convergencia → Guarda resultados en S3

### 4. Consolidación

Si múltiples clientes: Client Aggregator consolida → Genera vista general → Status Checker verifica estado

### 5. Resultado Final

Download Result prepara respuesta → Usuario puede descargar Excel consolidado → O Excel individual por cliente

---

## 🔐 Autenticación

El sistema usa **AWS Cognito** para autenticación:

- Login con email y contraseña
- JWT tokens con expiración de 60 minutos
- Refresh tokens para sesiones extendidas
- Todos los endpoints protegidos con Cognito Authorizer

---

## 📊 Estados del Proceso

| Estado | Descripción |
|--------|-------------|
| `RUNNING` | Proceso iniciado |
| `SEPARATING_CLIENTS` | Analizando archivo |
| `PROCESSING_SINGLE` | Procesando cliente único |
| `PROCESSING_MULTI` | Procesando múltiples clientes |
| `COMPLETED` | Proceso completado exitosamente |
| `FAILED` | Error en el proceso |

---

## 🛠️ Comandos Útiles

### Verificación

```bash
# Estado de infraestructura
./deployment/scripts/verify-infrastructure.sh

# Ver logs de una Lambda
aws logs tail /aws/lambda/invenadro-dev-processor --follow

# Listar recursos
aws lambda list-functions | grep invenadro
aws s3 ls | grep invenadro
```

### Deployment

```bash
# Re-desplegar una Lambda específica
cd lambda-processor
zip -r lambda-processor-deploy.zip . -x "*.zip"
aws lambda update-function-code \
  --function-name invenadro-dev-processor \
  --zip-file fileb://lambda-processor-deploy.zip

# Re-desplegar frontend
cd FrontEnd-lambdas
npm run build
aws s3 sync build/ s3://invenadro-frontend-dev --delete
```

### Testing

```bash
# Test de API (actualiza el script primero)
./test_curl.sh

# Ver ejecuciones de Step Function
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:975130647458:stateMachine:InvenadroStateMachine
```

---

## 📚 Documentación Completa

- **`EMPEZAR_AQUI.md`** - ⚠️ Lee esto PRIMERO
- **`README_MIGRATION.md`** - Guía de migración de infraestructura
- **`deployment/QUICK_START.md`** - Tutorial paso a paso
- **`deployment/MIGRATION_PLAN.md`** - Plan técnico completo
- **`deployment/INDEX.md`** - Índice de toda la documentación

---

## 🆘 Troubleshooting

### Error: "Function not found"

```bash
# Verificar que existen las Lambdas
aws lambda list-functions | grep invenadro

# Si no existen, crearlas
./deployment/scripts/2-create-lambdas.sh
```

### Error: "Bucket does not exist"

```bash
# Verificar buckets
aws s3 ls | grep invenadro

# Si no existen, crear infraestructura
./deployment/scripts/1-create-infrastructure.sh
```

### Error: "CORS policy"

Verificar CORS en API Gateway y en las Lambdas que los `ALLOWED_ORIGINS` incluyen tu frontend URL.

---

## 📞 Soporte

**Antes de preguntar:**

1. Lee `EMPEZAR_AQUI.md`
2. Ejecuta `./deployment/scripts/verify-infrastructure.sh`
3. Revisa logs en CloudWatch
4. Consulta `deployment/INDEX.md` para más documentación

---

## 🎯 Próximos Pasos

1. **Si eres nuevo:** Lee `EMPEZAR_AQUI.md`
2. **Si vas a migrar:** Lee `README_MIGRATION.md`
3. **Si vas a hacer deploy:** Ejecuta `./deployment/scripts/verify-infrastructure.sh`
4. **Si necesitas ayuda:** Consulta `deployment/INDEX.md`

---

## 📄 Licencia

Proyecto interno - Todos los derechos reservados

**Última actualización:** Octubre 2025  
**Estado:** ✅ Documentación completa, infraestructura pendiente de crear
