#!/bin/bash
# Script para actualizar todas las configuraciones hardcodeadas
# Este script debe ejecutarse DESPUÉS de crear la infraestructura

set -e

echo "🔄 Actualizando configuraciones en todos los archivos..."
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================
# CONFIGURACIÓN
# ============================================

# Valores ANTIGUOS (del otro proyecto)
OLD_ACCOUNT_ID="975130647458"
OLD_API_GATEWAY_ID="8zck1369x8"
OLD_LAMBDA_PREFIX="factor-redondeo-lambda-dev"
OLD_BUCKET_PREFIX="factor-redondeo-lambda"
OLD_DYNAMODB_TABLE="factor-redondeo-lambda-jobs-dev"
OLD_STEP_FUNCTION="FactorRedondeo"
OLD_USER_POOL_ID="us-east-1_UQ9eT0Tgn"
OLD_CLIENT_ID="47s3l4n3u40a9g48abp0jr3adq"
OLD_FRONTEND_BUCKET="factor-redondeo-v3-frontend-dev"

# Valores NUEVOS (este proyecto)
NEW_ACCOUNT_ID="975130647458"  # Mismo account
NEW_API_GATEWAY_ID="NUEVO_API_GATEWAY_ID"  # ⚠️ CAMBIAR después de crear API Gateway
NEW_LAMBDA_PREFIX="invenadro-dev"
NEW_BUCKET_PREFIX="invenadro"
NEW_DYNAMODB_TABLE="invenadro-jobs-dev"
NEW_STEP_FUNCTION="InvenadroStateMachine"
NEW_USER_POOL_ID="NUEVO_USER_POOL_ID"  # ⚠️ CAMBIAR después de crear Cognito
NEW_CLIENT_ID="NUEVO_CLIENT_ID"  # ⚠️ CAMBIAR después de crear Cognito
NEW_FRONTEND_BUCKET="invenadro-frontend-dev"

# ============================================
# SOLICITAR VALORES AL USUARIO
# ============================================

echo -e "${YELLOW}⚠️  Este script reemplazará valores hardcodeados.${NC}"
echo ""
echo "Por favor, proporciona los siguientes valores (o presiona Enter para usar valores por defecto):"
echo ""

# Solicitar API Gateway ID
read -p "🔹 API Gateway ID [default: ${NEW_API_GATEWAY_ID}]: " input_api_gateway
NEW_API_GATEWAY_ID=${input_api_gateway:-$NEW_API_GATEWAY_ID}

# Solicitar Cognito User Pool ID
read -p "🔹 Cognito User Pool ID [default: ${NEW_USER_POOL_ID}]: " input_pool_id
NEW_USER_POOL_ID=${input_pool_id:-$NEW_USER_POOL_ID}

# Solicitar Cognito Client ID
read -p "🔹 Cognito Client ID [default: ${NEW_CLIENT_ID}]: " input_client_id
NEW_CLIENT_ID=${input_client_id:-$NEW_CLIENT_ID}

echo ""
echo -e "${BLUE}📝 Resumen de cambios:${NC}"
echo "  Account ID: ${OLD_ACCOUNT_ID} → ${NEW_ACCOUNT_ID}"
echo "  API Gateway: ${OLD_API_GATEWAY_ID} → ${NEW_API_GATEWAY_ID}"
echo "  Lambda Prefix: ${OLD_LAMBDA_PREFIX} → ${NEW_LAMBDA_PREFIX}"
echo "  Bucket Prefix: ${OLD_BUCKET_PREFIX} → ${NEW_BUCKET_PREFIX}"
echo "  DynamoDB Table: ${OLD_DYNAMODB_TABLE} → ${NEW_DYNAMODB_TABLE}"
echo "  Step Function: ${OLD_STEP_FUNCTION} → ${NEW_STEP_FUNCTION}"
echo "  Cognito Pool: ${OLD_USER_POOL_ID} → ${NEW_USER_POOL_ID}"
echo "  Cognito Client: ${OLD_CLIENT_ID} → ${NEW_CLIENT_ID}"
echo ""

read -p "¿Continuar con estos cambios? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operación cancelada."
    exit 1
fi

echo ""

# ============================================
# FUNCIÓN PARA REEMPLAZAR EN ARCHIVOS
# ============================================

replace_in_file() {
    local file=$1
    local old_value=$2
    local new_value=$3
    
    if [ -f "$file" ]; then
        # Usar sed diferente según el OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|${old_value}|${new_value}|g" "$file"
        else
            # Linux
            sed -i "s|${old_value}|${new_value}|g" "$file"
        fi
        echo -e "  ${GREEN}✓${NC} ${file}"
    else
        echo -e "  ${YELLOW}⚠${NC} ${file} (no encontrado)"
    fi
}

# ============================================
# ACTUALIZAR STEP FUNCTION
# ============================================

echo -e "${BLUE}📝 Actualizando Step Function...${NC}"

FILE="infrastructure/step-function.json"
if [ -f "$FILE" ]; then
    replace_in_file "$FILE" "$OLD_LAMBDA_PREFIX" "$NEW_LAMBDA_PREFIX"
    replace_in_file "$FILE" "$OLD_ACCOUNT_ID" "$NEW_ACCOUNT_ID"
    replace_in_file "$FILE" "$OLD_STEP_FUNCTION" "$NEW_STEP_FUNCTION"
fi

echo ""

# ============================================
# ACTUALIZAR LAMBDAS
# ============================================

echo -e "${BLUE}📝 Actualizando Lambdas...${NC}"

LAMBDA_DIRS=(
    "lambda-initiator"
    "lambda-client-separator"
    "lambda-processor"
    "lambda-status-checker"
    "lambda-client-aggregator"
    "lambda-download-result"
    "lambda-excel-generator"
    "lambda-get-presigned-url"
)

for DIR in "${LAMBDA_DIRS[@]}"; do
    FILE="${DIR}/index.js"
    if [ -f "$FILE" ]; then
        replace_in_file "$FILE" "$OLD_BUCKET_PREFIX" "$NEW_BUCKET_PREFIX"
        replace_in_file "$FILE" "$OLD_DYNAMODB_TABLE" "$NEW_DYNAMODB_TABLE"
        replace_in_file "$FILE" "$OLD_LAMBDA_PREFIX" "$NEW_LAMBDA_PREFIX"
        replace_in_file "$FILE" "$OLD_STEP_FUNCTION" "$NEW_STEP_FUNCTION"
        replace_in_file "$FILE" "$OLD_FRONTEND_BUCKET" "$NEW_FRONTEND_BUCKET"
    fi
done

echo ""

# ============================================
# ACTUALIZAR FRONTEND
# ============================================

echo -e "${BLUE}📝 Actualizando Frontend...${NC}"

# lambdaService.js
FILE="FrontEnd-lambdas/src/services/lambdaService.js"
if [ -f "$FILE" ]; then
    replace_in_file "$FILE" "$OLD_API_GATEWAY_ID" "$NEW_API_GATEWAY_ID"
    replace_in_file "$FILE" "$OLD_BUCKET_PREFIX" "$NEW_BUCKET_PREFIX"
    replace_in_file "$FILE" "$OLD_DYNAMODB_TABLE" "$NEW_DYNAMODB_TABLE"
    replace_in_file "$FILE" "$OLD_STEP_FUNCTION" "$NEW_STEP_FUNCTION"
fi

# aws-config.js
FILE="FrontEnd-lambdas/src/aws-config.js"
if [ -f "$FILE" ]; then
    replace_in_file "$FILE" "$OLD_USER_POOL_ID" "$NEW_USER_POOL_ID"
    replace_in_file "$FILE" "$OLD_CLIENT_ID" "$NEW_CLIENT_ID"
fi

echo ""

# ============================================
# ACTUALIZAR DEPLOYMENT CONFIG
# ============================================

echo -e "${BLUE}📝 Actualizando configuración de deployment...${NC}"

FILE="deployment/aws-permissions/aws-permissions.json"
if [ -f "$FILE" ]; then
    replace_in_file "$FILE" "$OLD_API_GATEWAY_ID" "$NEW_API_GATEWAY_ID"
    replace_in_file "$FILE" "$OLD_LAMBDA_PREFIX" "$NEW_LAMBDA_PREFIX"
    replace_in_file "$FILE" "$OLD_BUCKET_PREFIX" "$NEW_BUCKET_PREFIX"
    replace_in_file "$FILE" "$OLD_DYNAMODB_TABLE" "$NEW_DYNAMODB_TABLE"
    replace_in_file "$FILE" "$OLD_STEP_FUNCTION" "$NEW_STEP_FUNCTION"
fi

echo ""

# ============================================
# ACTUALIZAR TEST FILES
# ============================================

echo -e "${BLUE}📝 Actualizando archivos de test...${NC}"

FILE="test_curl.sh"
if [ -f "$FILE" ]; then
    replace_in_file "$FILE" "$OLD_API_GATEWAY_ID" "$NEW_API_GATEWAY_ID"
fi

FILE="postman_import_curl.txt"
if [ -f "$FILE" ]; then
    replace_in_file "$FILE" "$OLD_API_GATEWAY_ID" "$NEW_API_GATEWAY_ID"
fi

echo ""

# ============================================
# RESUMEN FINAL
# ============================================

echo -e "${GREEN}✅ Actualización completada!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "  1. Revisa los cambios con: git diff"
echo "  2. Verifica que todos los valores son correctos"
echo "  3. Si usaste valores 'PENDIENTE_CREAR', actualízalos manualmente después"
echo "  4. Reconstruye el frontend: cd FrontEnd-lambdas && npm run build"
echo "  5. Re-despliega las Lambdas con los nuevos valores"
echo ""
echo "📋 Archivos actualizados:"
echo "  - infrastructure/step-function.json"
echo "  - Todos los archivos index.js de las Lambdas"
echo "  - FrontEnd-lambdas/src/services/lambdaService.js"
echo "  - FrontEnd-lambdas/src/aws-config.js"
echo "  - deployment/aws-permissions/*.json"
echo ""

