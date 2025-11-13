#!/bin/bash
# scripts/sync-cloudfront-urls.sh
# 
# Obtiene la URL de CloudFront del frontend desplegado y actualiza
# automáticamente el serverless.yml del backend con la URL correcta.
#
# Uso:
#   ./scripts/sync-cloudfront-urls.sh <stage>
#   Ejemplo: ./scripts/sync-cloudfront-urls.sh jul-dev

set -e

# Colores
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_NC='\033[0m'

print_error() {
    echo -e "${COLOR_RED}❌ ERROR: $1${COLOR_NC}"
}

print_success() {
    echo -e "${COLOR_GREEN}✅ $1${COLOR_NC}"
}

print_info() {
    echo -e "${COLOR_BLUE}ℹ️  $1${COLOR_NC}"
}

print_warning() {
    echo -e "${COLOR_YELLOW}⚠️  $1${COLOR_NC}"
}

# Validar argumentos
STAGE=$1
if [ -z "$STAGE" ]; then
    print_error "Uso: ./scripts/sync-cloudfront-urls.sh <stage>"
    print_error "Ejemplo: ./scripts/sync-cloudfront-urls.sh jul-dev"
    exit 1
fi

# Validar stage
VALID_STAGES=("jul-dev" "jul-qa" "nadro-qa" "nadro-prod")
if [[ ! " ${VALID_STAGES[@]} " =~ " ${STAGE} " ]]; then
    print_error "Stage '$STAGE' no es válido. Los stages permitidos son: ${VALID_STAGES[*]}"
    exit 1
fi

print_info "Stage: $STAGE"
echo ""

# Configuración
AWS_REGION="mx-central-1"
FRONTEND_STACK_NAME="invenadro-frontend-${STAGE}"
BACKEND_SERVERLESS_YML="../services/backend/serverless.yml"

# Verificar que el stack del frontend existe
print_info "Verificando stack del frontend..."
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$FRONTEND_STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" == "NOT_FOUND" ]; then
    print_error "El stack '$FRONTEND_STACK_NAME' no existe."
    print_error "Primero despliega el frontend:"
    print_error "  cd services/frontend && npx serverless deploy --stage $STAGE"
    exit 1
fi

if [[ "$STACK_STATUS" == DELETE* ]]; then
    print_error "El stack '$FRONTEND_STACK_NAME' ha sido eliminado o está en proceso de eliminación."
    exit 1
fi

print_success "Stack encontrado: $FRONTEND_STACK_NAME (Estado: $STACK_STATUS)"

# Obtener CloudFront URL del stack
print_info "Obteniendo CloudFront URL..."
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name "$FRONTEND_STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$CLOUDFRONT_URL" ]; then
    print_error "No se pudo obtener la CloudFront URL del stack."
    print_error "Verifica que el output 'CloudFrontURL' existe en el stack."
    exit 1
fi

print_success "CloudFront URL: $CLOUDFRONT_URL"

# Obtener S3 Website URL
S3_WEBSITE_URL="http://invenadro-frontend-${STAGE}.s3-website.${AWS_REGION}.amazonaws.com"

# Construir la lista de orígenes permitidos
if [[ "$STAGE" == *"prod"* ]]; then
    # Producción: sin localhost
    NEW_ORIGINS="${CLOUDFRONT_URL},${S3_WEBSITE_URL}"
else
    # Dev/QA: incluir localhost
    NEW_ORIGINS="${CLOUDFRONT_URL},${S3_WEBSITE_URL},http://localhost:3000,http://127.0.0.1:3000"
fi

print_info "Orígenes permitidos:"
echo "   $NEW_ORIGINS"
echo ""

# Actualizar serverless.yml usando sed
print_info "Actualizando $BACKEND_SERVERLESS_YML..."

# Backup del archivo original
cp "$BACKEND_SERVERLESS_YML" "${BACKEND_SERVERLESS_YML}.backup"

# Escapar caracteres especiales para sed
ESCAPED_NEW_ORIGINS=$(echo "$NEW_ORIGINS" | sed 's/[\/&]/\\&/g')

# Actualizar la línea del stage correspondiente
# Busca: stage: 'cualquier-cosa'
# Reemplaza por: stage: 'nueva-url'
if grep -q "^\s*${STAGE}:" "$BACKEND_SERVERLESS_YML"; then
    # El stage existe, actualizarlo
    sed -i.tmp "s|^\(\s*${STAGE}:\s*\)'[^']*'|\1'${ESCAPED_NEW_ORIGINS}'|" "$BACKEND_SERVERLESS_YML"
    rm -f "${BACKEND_SERVERLESS_YML}.tmp"
    print_success "Línea de $STAGE actualizada"
else
    print_error "No se encontró la configuración para el stage '$STAGE' en serverless.yml"
    print_error "Verifica que existe la línea: ${STAGE}: '...'"
    # Restaurar backup
    mv "${BACKEND_SERVERLESS_YML}.backup" "$BACKEND_SERVERLESS_YML"
    exit 1
fi

# Mostrar el cambio
echo ""
print_info "Cambio realizado:"
grep "^\s*${STAGE}:" "$BACKEND_SERVERLESS_YML" | head -1

echo ""
print_success "¡Configuración actualizada!"
echo ""
print_info "Próximos pasos:"
echo "   1. Revisar cambios: git diff $BACKEND_SERVERLESS_YML"
echo "   2. Re-deploy backend:"
echo "      cd services/backend"
echo "      npx serverless deploy --stage $STAGE"
echo "   3. Commit los cambios:"
echo "      git add $BACKEND_SERVERLESS_YML"
echo "      git commit -m \"chore: Actualizar CloudFront URL para $STAGE\""
echo ""
print_warning "Archivo backup guardado en: ${BACKEND_SERVERLESS_YML}.backup"
print_warning "Si algo salió mal, puedes restaurarlo con:"
print_warning "  mv ${BACKEND_SERVERLESS_YML}.backup $BACKEND_SERVERLESS_YML"
echo ""

