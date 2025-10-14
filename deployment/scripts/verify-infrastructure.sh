#!/bin/bash
# Script para verificar qué recursos de infraestructura ya existen
# Útil para saber qué falta crear

set -e

echo "🔍 Verificando infraestructura existente de Invenadro..."
echo ""

# Variables
REGION="us-east-1"
ACCOUNT_ID="975130647458"
PROJECT="invenadro"
ENV="dev"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Contadores
EXISTING=0
MISSING=0

# ============================================
# FUNCIÓN DE VERIFICACIÓN
# ============================================

check_resource() {
    local type=$1
    local name=$2
    local check_command=$3
    
    echo -n "  Verificando ${type}: ${name}... "
    
    if eval "${check_command}" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Existe${NC}"
        ((EXISTING++))
        return 0
    else
        echo -e "${RED}✗ No existe${NC}"
        ((MISSING++))
        return 1
    fi
}

# ============================================
# 1. VERIFICAR S3 BUCKETS
# ============================================

echo -e "${BLUE}📦 S3 Buckets:${NC}"

check_resource "S3 Bucket" "${PROJECT}-uploads-${ENV}" \
    "aws s3 ls s3://${PROJECT}-uploads-${ENV} --region ${REGION}"

check_resource "S3 Bucket" "${PROJECT}-results-${ENV}" \
    "aws s3 ls s3://${PROJECT}-results-${ENV} --region ${REGION}"

check_resource "S3 Bucket" "${PROJECT}-frontend-${ENV}" \
    "aws s3 ls s3://${PROJECT}-frontend-${ENV} --region ${REGION}"

echo ""

# ============================================
# 2. VERIFICAR DYNAMODB
# ============================================

echo -e "${BLUE}📊 DynamoDB:${NC}"

check_resource "Table" "${PROJECT}-jobs-${ENV}" \
    "aws dynamodb describe-table --table-name ${PROJECT}-jobs-${ENV} --region ${REGION}"

echo ""

# ============================================
# 3. VERIFICAR IAM ROLES
# ============================================

echo -e "${BLUE}🔐 IAM Roles:${NC}"

check_resource "Lambda Role" "${PROJECT}-lambda-execution-role" \
    "aws iam get-role --role-name ${PROJECT}-lambda-execution-role"

check_resource "Step Function Role" "${PROJECT}-stepfunction-execution-role" \
    "aws iam get-role --role-name ${PROJECT}-stepfunction-execution-role"

echo ""

# ============================================
# 4. VERIFICAR COGNITO
# ============================================

echo -e "${BLUE}👤 Cognito:${NC}"

USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region ${REGION} 2>/dev/null | \
    jq -r ".UserPools[] | select(.Name==\"${PROJECT}-users-${ENV}\") | .Id" || echo "")

if [ ! -z "$USER_POOL_ID" ]; then
    echo -e "  Verificando User Pool: ${PROJECT}-users-${ENV}... ${GREEN}✓ Existe${NC} (ID: ${USER_POOL_ID})"
    ((EXISTING++))
else
    echo -e "  Verificando User Pool: ${PROJECT}-users-${ENV}... ${RED}✗ No existe${NC}"
    ((MISSING++))
fi

echo ""

# ============================================
# 5. VERIFICAR LAMBDAS
# ============================================

echo -e "${BLUE}⚡ Lambda Functions:${NC}"

LAMBDA_SUFFIXES=(
    "initiator"
    "client-separator"
    "processor"
    "status-checker"
    "client-aggregator"
    "download-result"
    "excel-generator"
    "get-presigned-url"
)

for SUFFIX in "${LAMBDA_SUFFIXES[@]}"; do
    FUNCTION_NAME="${PROJECT}-${ENV}-${SUFFIX}"
    check_resource "Lambda" "${FUNCTION_NAME}" \
        "aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION}"
done

echo ""

# ============================================
# 6. VERIFICAR STEP FUNCTION
# ============================================

echo -e "${BLUE}🔄 Step Functions:${NC}"

SF_ARN="arn:aws:states:${REGION}:${ACCOUNT_ID}:stateMachine:InvenadroStateMachine"
check_resource "State Machine" "InvenadroStateMachine" \
    "aws stepfunctions describe-state-machine --state-machine-arn ${SF_ARN} --region ${REGION}"

echo ""

# ============================================
# 7. VERIFICAR API GATEWAY
# ============================================

echo -e "${BLUE}🌐 API Gateway:${NC}"

API_ID=$(aws apigateway get-rest-apis --region ${REGION} 2>/dev/null | \
    jq -r ".items[] | select(.name==\"Invenadro API\") | .id" || echo "")

if [ ! -z "$API_ID" ]; then
    echo -e "  Verificando API Gateway: Invenadro API... ${GREEN}✓ Existe${NC} (ID: ${API_ID})"
    echo -e "  URL: https://${API_ID}.execute-api.${REGION}.amazonaws.com/dev"
    ((EXISTING++))
else
    echo -e "  Verificando API Gateway: Invenadro API... ${RED}✗ No existe${NC}"
    ((MISSING++))
fi

echo ""

# ============================================
# RESUMEN
# ============================================

TOTAL=$((EXISTING + MISSING))
PERCENT=$((EXISTING * 100 / TOTAL))

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 RESUMEN:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${GREEN}Recursos existentes:${NC} ${EXISTING}/${TOTAL} (${PERCENT}%)"
echo -e "  ${RED}Recursos faltantes:${NC} ${MISSING}/${TOTAL}"
echo ""

if [ ${MISSING} -eq 0 ]; then
    echo -e "${GREEN}✅ ¡Toda la infraestructura está lista!${NC}"
    echo ""
    echo "📋 Próximos pasos:"
    echo "  1. Verificar configuraciones con: git diff"
    echo "  2. Desplegar frontend: cd FrontEnd-lambdas && npm run build"
    echo "  3. Probar el sistema end-to-end"
elif [ ${EXISTING} -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No hay infraestructura creada aún.${NC}"
    echo ""
    echo "📋 Para empezar:"
    echo "  1. ./deployment/scripts/1-create-infrastructure.sh"
    echo "  2. ./deployment/scripts/2-create-lambdas.sh"
    echo "  3. Crear API Gateway manualmente (ver QUICK_START.md)"
    echo "  4. ./deployment/scripts/update-all-configs.sh"
else
    echo -e "${YELLOW}⚠️  Migración parcialmente completada.${NC}"
    echo ""
    echo "📋 Recursos faltantes:"
    
    # Mostrar qué falta específicamente
    if [ ${MISSING} -gt 0 ]; then
        echo ""
        echo "Ejecuta los scripts pendientes o crea recursos manualmente."
        echo "Consulta: deployment/QUICK_START.md"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Exit con código según estado
if [ ${MISSING} -eq 0 ]; then
    exit 0
else
    exit 1
fi

