#!/bin/bash
# Script para ELIMINAR toda la infraestructura de Invenadro
# ⚠️ CUIDADO: Este script es destructivo e irreversible

set -e

echo "⚠️  ADVERTENCIA: Este script eliminará TODA la infraestructura de Invenadro"
echo ""
echo "Esto incluye:"
echo "  - 3 buckets S3 (y todo su contenido)"
echo "  - 1 tabla DynamoDB (y todos los datos)"
echo "  - 8 funciones Lambda"
echo "  - 1 Step Function"
echo "  - 1 Cognito User Pool (y todos los usuarios)"
echo "  - 2 IAM Roles"
echo "  - API Gateway (si existe)"
echo ""
read -p "¿Estás SEGURO que quieres continuar? Escribe 'ELIMINAR' para confirmar: " confirmation

if [ "$confirmation" != "ELIMINAR" ]; then
    echo "Operación cancelada."
    exit 1
fi

# Variables
REGION="us-east-1"
ACCOUNT_ID="975130647458"
PROJECT="invenadro"
ENV="dev"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${RED}🗑️  Iniciando eliminación...${NC}"
echo ""

# ============================================
# 1. ELIMINAR LAMBDAS
# ============================================

echo -e "${BLUE}🗑️  Eliminando funciones Lambda...${NC}"

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
    if aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} >/dev/null 2>&1; then
        aws lambda delete-function --function-name ${FUNCTION_NAME} --region ${REGION}
        echo -e "${GREEN}  ✓${NC} ${FUNCTION_NAME}"
    else
        echo -e "  ⏭️  ${FUNCTION_NAME} (no existe)"
    fi
done

echo ""

# ============================================
# 2. ELIMINAR STEP FUNCTION
# ============================================

echo -e "${BLUE}🗑️  Eliminando Step Function...${NC}"

SF_ARN="arn:aws:states:${REGION}:${ACCOUNT_ID}:stateMachine:InvenadroStateMachine"
if aws stepfunctions describe-state-machine --state-machine-arn ${SF_ARN} --region ${REGION} >/dev/null 2>&1; then
    aws stepfunctions delete-state-machine --state-machine-arn ${SF_ARN} --region ${REGION}
    echo -e "${GREEN}  ✓${NC} InvenadroStateMachine"
else
    echo "  ⏭️  Step Function no existe"
fi

echo ""

# ============================================
# 3. VACIAR Y ELIMINAR BUCKETS S3
# ============================================

echo -e "${BLUE}🗑️  Vaciando y eliminando buckets S3...${NC}"

BUCKETS=(
    "${PROJECT}-uploads-${ENV}"
    "${PROJECT}-results-${ENV}"
    "${PROJECT}-frontend-${ENV}"
)

for BUCKET in "${BUCKETS[@]}"; do
    if aws s3 ls "s3://${BUCKET}" >/dev/null 2>&1; then
        echo "  Vaciando ${BUCKET}..."
        aws s3 rm "s3://${BUCKET}" --recursive
        aws s3 rb "s3://${BUCKET}"
        echo -e "${GREEN}  ✓${NC} ${BUCKET}"
    else
        echo "  ⏭️  ${BUCKET} (no existe)"
    fi
done

echo ""

# ============================================
# 4. ELIMINAR TABLA DYNAMODB
# ============================================

echo -e "${BLUE}🗑️  Eliminando tabla DynamoDB...${NC}"

TABLE_NAME="${PROJECT}-jobs-${ENV}"
if aws dynamodb describe-table --table-name ${TABLE_NAME} --region ${REGION} >/dev/null 2>&1; then
    aws dynamodb delete-table --table-name ${TABLE_NAME} --region ${REGION}
    echo -e "${GREEN}  ✓${NC} ${TABLE_NAME}"
else
    echo "  ⏭️  Tabla no existe"
fi

echo ""

# ============================================
# 5. ELIMINAR COGNITO USER POOL
# ============================================

echo -e "${BLUE}🗑️  Eliminando Cognito User Pool...${NC}"

USER_POOL_NAME="${PROJECT}-users-${ENV}"
POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region ${REGION} | \
    jq -r ".UserPools[] | select(.Name==\"${USER_POOL_NAME}\") | .Id")

if [ ! -z "$POOL_ID" ]; then
    aws cognito-idp delete-user-pool --user-pool-id ${POOL_ID} --region ${REGION}
    echo -e "${GREEN}  ✓${NC} ${USER_POOL_NAME} (${POOL_ID})"
else
    echo "  ⏭️  User Pool no existe"
fi

echo ""

# ============================================
# 6. ELIMINAR IAM ROLES
# ============================================

echo -e "${BLUE}🗑️  Eliminando IAM Roles...${NC}"

# Lambda role
LAMBDA_ROLE="${PROJECT}-lambda-execution-role"
if aws iam get-role --role-name ${LAMBDA_ROLE} >/dev/null 2>&1; then
    # Detach managed policies
    aws iam detach-role-policy \
        --role-name ${LAMBDA_ROLE} \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        2>/dev/null || true
    
    # Delete inline policies
    INLINE_POLICIES=$(aws iam list-role-policies --role-name ${LAMBDA_ROLE} --query 'PolicyNames' --output text)
    for POLICY in ${INLINE_POLICIES}; do
        aws iam delete-role-policy --role-name ${LAMBDA_ROLE} --policy-name ${POLICY}
    done
    
    # Delete role
    aws iam delete-role --role-name ${LAMBDA_ROLE}
    echo -e "${GREEN}  ✓${NC} ${LAMBDA_ROLE}"
else
    echo "  ⏭️  ${LAMBDA_ROLE} (no existe)"
fi

# Step Function role
SF_ROLE="${PROJECT}-stepfunction-execution-role"
if aws iam get-role --role-name ${SF_ROLE} >/dev/null 2>&1; then
    # Delete inline policies
    INLINE_POLICIES=$(aws iam list-role-policies --role-name ${SF_ROLE} --query 'PolicyNames' --output text)
    for POLICY in ${INLINE_POLICIES}; do
        aws iam delete-role-policy --role-name ${SF_ROLE} --policy-name ${POLICY}
    done
    
    # Delete role
    aws iam delete-role --role-name ${SF_ROLE}
    echo -e "${GREEN}  ✓${NC} ${SF_ROLE}"
else
    echo "  ⏭️  ${SF_ROLE} (no existe)"
fi

echo ""

# ============================================
# RESUMEN FINAL
# ============================================

echo -e "${GREEN}✅ Limpieza completada!${NC}"
echo ""
echo "📝 Recursos eliminados:"
echo "  - 8 funciones Lambda"
echo "  - 1 Step Function"
echo "  - 3 buckets S3 (con todo su contenido)"
echo "  - 1 tabla DynamoDB"
echo "  - 1 Cognito User Pool"
echo "  - 2 IAM Roles"
echo ""
echo "⚠️  NOTA: El API Gateway debe eliminarse manualmente desde la consola si lo creaste."
echo ""

