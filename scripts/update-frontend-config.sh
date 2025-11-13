#!/bin/bash

###############################################################################
# Script: update-frontend-config.sh
# Descripción: Actualiza automáticamente la configuración del frontend
#              con los valores del backend deployado en AWS
# Uso: ./scripts/update-frontend-config.sh <stage>
# Ejemplo: ./scripts/update-frontend-config.sh jul-qa
###############################################################################

set -e  # Exit on error

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validar parámetros
STAGE=$1

if [ -z "$STAGE" ]; then
    log_error "Falta el parámetro STAGE"
    echo ""
    echo "Uso: $0 <stage>"
    echo ""
    echo "Stages disponibles:"
    echo "  - jul-dev"
    echo "  - jul-qa"
    echo "  - nadro-qa"
    echo "  - nadro-prod"
    echo ""
    echo "Ejemplo:"
    echo "  $0 jul-qa"
    exit 1
fi

# Validar que el stage es válido
case $STAGE in
    jul-dev|jul-qa|nadro-qa|nadro-prod)
        log_info "Stage válido: $STAGE"
        ;;
    *)
        log_error "Stage inválido: $STAGE"
        log_warning "Stages válidos: jul-dev, jul-qa, nadro-qa, nadro-prod"
        exit 1
        ;;
esac

# Configuración
STACK_NAME="invenadro-backend-$STAGE"
REGION="mx-central-1"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
ENVIRONMENTS_FILE="$PROJECT_ROOT/FrontEnd-lambdas/src/config/environments.js"

log_info "Obteniendo configuración del backend..."
echo "   Stack: $STACK_NAME"
echo "   Región: $REGION"
echo ""

# Verificar que el stack existe
if ! aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --profile default \
    > /dev/null 2>&1; then
    log_error "El stack $STACK_NAME no existe en AWS"
    log_warning "Primero debes deployar el backend:"
    echo "   cd services/backend"
    echo "   npx serverless deploy --stage $STAGE"
    exit 1
fi

log_success "Stack encontrado en AWS"

# Obtener outputs del stack
log_info "Obteniendo outputs del CloudFormation..."

OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --profile default \
    --query 'Stacks[0].Outputs' \
    --output json)

# Extraer valores específicos
API_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiGatewayUrl") | .OutputValue')
USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
UPLOADS_BUCKET=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UploadsBucketName") | .OutputValue')
RESULTS_BUCKET=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ResultsBucketName") | .OutputValue')
JOBS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="JobsTableName") | .OutputValue')
STATE_MACHINE_ARN=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="StateMachineArn") | .OutputValue')

# Obtener Account ID del ARN de la State Machine
ACCOUNT_ID=$(echo "$STATE_MACHINE_ARN" | cut -d':' -f5)

# Validar que obtuvimos todos los valores
if [ -z "$API_URL" ] || [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ]; then
    log_error "No se pudieron obtener todos los valores necesarios del stack"
    echo ""
    echo "Valores obtenidos:"
    echo "  API URL: ${API_URL:-MISSING}"
    echo "  User Pool ID: ${USER_POOL_ID:-MISSING}"
    echo "  Client ID: ${CLIENT_ID:-MISSING}"
    exit 1
fi

log_success "Configuración obtenida correctamente"
echo ""
echo "📊 Valores del backend $STAGE:"
echo "   API Gateway: $API_URL"
echo "   User Pool ID: $USER_POOL_ID"
echo "   Client ID: $CLIENT_ID"
echo "   Uploads Bucket: $UPLOADS_BUCKET"
echo "   Results Bucket: $RESULTS_BUCKET"
echo "   Jobs Table: $JOBS_TABLE"
echo "   Account ID: $ACCOUNT_ID"
echo ""

# Actualizar el archivo environments.js usando Node.js
log_info "Actualizando $ENVIRONMENTS_FILE..."

node "$SCRIPT_DIR/update-environments-js.js" \
    "$STAGE" \
    "$API_URL" \
    "$USER_POOL_ID" \
    "$CLIENT_ID" \
    "$UPLOADS_BUCKET" \
    "$RESULTS_BUCKET" \
    "$JOBS_TABLE" \
    "$STATE_MACHINE_ARN" \
    "$ACCOUNT_ID" \
    "$REGION"

if [ $? -eq 0 ]; then
    log_success "Archivo environments.js actualizado correctamente"
    echo ""
    log_info "Próximos pasos:"
    echo "   1. Revisar los cambios: git diff FrontEnd-lambdas/src/config/environments.js"
    echo "   2. Hacer commit: git add FrontEnd-lambdas/src/config/environments.js"
    echo "   3. Commit: git commit -m \"chore: Actualizar config $STAGE con URLs del backend\""
    echo "   4. Push: git push origin <branch>"
else
    log_error "Error al actualizar environments.js"
    exit 1
fi

echo ""
log_success "¡Proceso completado! 🎉"

