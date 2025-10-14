#!/bin/bash
# Script para crear las funciones Lambda de Invenadro
# Ejecutar después de 1-create-infrastructure.sh

set -e

echo "🚀 Creando funciones Lambda de Invenadro..."
echo ""

# Variables
REGION="us-east-1"
ACCOUNT_ID="975130647458"
PROJECT="invenadro"
ENV="dev"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${PROJECT}-lambda-execution-role"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que el role existe
if ! aws iam get-role --role-name "${PROJECT}-lambda-execution-role" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  El role ${PROJECT}-lambda-execution-role no existe.${NC}"
    echo "Ejecuta primero: ./deployment/scripts/1-create-infrastructure.sh"
    exit 1
fi

# Lista de funciones Lambda a crear
declare -A LAMBDAS
LAMBDAS=(
    ["lambda-initiator"]="initiator"
    ["lambda-client-separator"]="client-separator"
    ["lambda-processor"]="processor"
    ["lambda-status-checker"]="status-checker"
    ["lambda-client-aggregator"]="client-aggregator"
    ["lambda-download-result"]="download-result"
    ["lambda-excel-generator"]="excel-generator"
    ["lambda-get-presigned-url"]="get-presigned-url"
)

# Función para crear o actualizar Lambda
create_or_update_lambda() {
    local DIR_NAME=$1
    local FUNCTION_SUFFIX=$2
    local FUNCTION_NAME="${PROJECT}-${ENV}-${FUNCTION_SUFFIX}"
    
    echo -e "${BLUE}📦 Procesando ${FUNCTION_NAME}...${NC}"
    
    # Verificar que el directorio existe
    if [ ! -d "${DIR_NAME}" ]; then
        echo -e "${YELLOW}⚠️  Directorio ${DIR_NAME} no encontrado. Saltando...${NC}"
        return
    fi
    
    cd "${DIR_NAME}"
    
    # Crear zip
    ZIP_NAME="${DIR_NAME}-deploy.zip"
    echo "  📦 Creando paquete ${ZIP_NAME}..."
    
    # Limpiar zip anterior si existe
    rm -f "${ZIP_NAME}"
    
    # Crear zip excluyendo archivos innecesarios
    zip -r "${ZIP_NAME}" . \
        -x "*.git*" \
        -x "*.zip" \
        -x "node_modules/.cache/*" \
        -x "*.DS_Store" \
        -x "*.md" \
        -x "package-lock.json" \
        >/dev/null 2>&1
    
    echo "  📦 Paquete creado ($(du -h ${ZIP_NAME} | cut -f1))"
    
    # Verificar si la función ya existe
    if aws lambda get-function --function-name "${FUNCTION_NAME}" --region ${REGION} >/dev/null 2>&1; then
        echo "  🔄 Actualizando función existente..."
        aws lambda update-function-code \
            --function-name "${FUNCTION_NAME}" \
            --zip-file "fileb://${ZIP_NAME}" \
            --region ${REGION} >/dev/null
        
        echo -e "${GREEN}  ✅ Función actualizada: ${FUNCTION_NAME}${NC}"
    else
        echo "  🆕 Creando nueva función..."
        
        # Variables de entorno específicas por función
        ENV_VARS="AWS_REGION=${REGION}"
        ENV_VARS="${ENV_VARS},JOBS_TABLE=${PROJECT}-jobs-${ENV}"
        ENV_VARS="${ENV_VARS},RESULTS_BUCKET=${PROJECT}-results-${ENV}"
        ENV_VARS="${ENV_VARS},UPLOADS_BUCKET=${PROJECT}-uploads-${ENV}"
        ENV_VARS="${ENV_VARS},STEP_FUNCTION_ARN=arn:aws:states:${REGION}:${ACCOUNT_ID}:stateMachine:InvenadroStateMachine"
        ENV_VARS="${ENV_VARS},PROCESSOR_STEP_FUNCTION_ARN=arn:aws:states:${REGION}:${ACCOUNT_ID}:stateMachine:InvenadroStateMachine"
        
        # Configuración de timeout y memoria según la función
        TIMEOUT=900
        MEMORY=1024
        
        case ${FUNCTION_SUFFIX} in
            "processor"|"client-separator")
                TIMEOUT=900
                MEMORY=3008
                ;;
            "client-aggregator")
                TIMEOUT=600
                MEMORY=2048
                ;;
            "excel-generator")
                TIMEOUT=300
                MEMORY=1024
                ;;
            *)
                TIMEOUT=300
                MEMORY=512
                ;;
        esac
        
        aws lambda create-function \
            --function-name "${FUNCTION_NAME}" \
            --runtime nodejs20.x \
            --role "${ROLE_ARN}" \
            --handler index.handler \
            --zip-file "fileb://${ZIP_NAME}" \
            --timeout ${TIMEOUT} \
            --memory-size ${MEMORY} \
            --environment "Variables={${ENV_VARS}}" \
            --region ${REGION} >/dev/null
        
        echo -e "${GREEN}  ✅ Función creada: ${FUNCTION_NAME} (timeout: ${TIMEOUT}s, memory: ${MEMORY}MB)${NC}"
    fi
    
    cd ..
}

# Crear/actualizar cada función
for DIR_NAME in "${!LAMBDAS[@]}"; do
    FUNCTION_SUFFIX="${LAMBDAS[$DIR_NAME]}"
    create_or_update_lambda "${DIR_NAME}" "${FUNCTION_SUFFIX}"
    echo ""
done

echo ""
echo -e "${GREEN}✅ Todas las funciones Lambda han sido procesadas!${NC}"
echo ""
echo "📋 Funciones creadas/actualizadas:"
for DIR_NAME in "${!LAMBDAS[@]}"; do
    FUNCTION_SUFFIX="${LAMBDAS[$DIR_NAME]}"
    echo "  - ${PROJECT}-${ENV}-${FUNCTION_SUFFIX}"
done
echo ""
echo "📋 Próximos pasos:"
echo "  1. Ejecutar ./deployment/scripts/3-create-api-gateway.sh para crear API Gateway"
echo "  2. Ejecutar ./deployment/scripts/4-create-step-function.sh para crear Step Function"
echo ""

