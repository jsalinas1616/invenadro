#!/bin/bash
# Script para crear la infraestructura base de Invenadro
# Ejecutar este script primero antes de crear las Lambdas

set -e  # Salir si hay algún error

echo "🚀 Creando infraestructura base para Invenadro..."
echo ""

# Variables
REGION="us-east-1"
PROJECT="invenadro"
ENV="dev"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================
# 1. CREAR BUCKETS S3
# ============================================
echo -e "${BLUE}📦 Paso 1: Creando buckets S3...${NC}"

# Bucket de uploads
if aws s3 ls "s3://${PROJECT}-uploads-${ENV}" 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3 mb "s3://${PROJECT}-uploads-${ENV}" --region ${REGION}
    echo -e "${GREEN}✅ Bucket creado: ${PROJECT}-uploads-${ENV}${NC}"
else
    echo "⏭️  Bucket ya existe: ${PROJECT}-uploads-${ENV}"
fi

# Bucket de results
if aws s3 ls "s3://${PROJECT}-results-${ENV}" 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3 mb "s3://${PROJECT}-results-${ENV}" --region ${REGION}
    echo -e "${GREEN}✅ Bucket creado: ${PROJECT}-results-${ENV}${NC}"
else
    echo "⏭️  Bucket ya existe: ${PROJECT}-results-${ENV}"
fi

# Bucket de frontend
if aws s3 ls "s3://${PROJECT}-frontend-${ENV}" 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3 mb "s3://${PROJECT}-frontend-${ENV}" --region ${REGION}
    aws s3 website "s3://${PROJECT}-frontend-${ENV}" \
        --index-document index.html \
        --error-document index.html
    echo -e "${GREEN}✅ Bucket de frontend creado y configurado: ${PROJECT}-frontend-${ENV}${NC}"
else
    echo "⏭️  Bucket de frontend ya existe: ${PROJECT}-frontend-${ENV}"
fi

echo ""

# ============================================
# 2. CREAR TABLA DYNAMODB
# ============================================
echo -e "${BLUE}📊 Paso 2: Creando tabla DynamoDB...${NC}"

if aws dynamodb describe-table --table-name "${PROJECT}-jobs-${ENV}" --region ${REGION} 2>&1 | grep -q 'ResourceNotFoundException'; then
    aws dynamodb create-table \
      --table-name "${PROJECT}-jobs-${ENV}" \
      --attribute-definitions \
          AttributeName=processId,AttributeType=S \
      --key-schema \
          AttributeName=processId,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --region ${REGION}
    
    echo -e "${GREEN}✅ Tabla DynamoDB creada: ${PROJECT}-jobs-${ENV}${NC}"
    echo "⏳ Esperando a que la tabla esté activa..."
    aws dynamodb wait table-exists --table-name "${PROJECT}-jobs-${ENV}" --region ${REGION}
    echo -e "${GREEN}✅ Tabla activa${NC}"
else
    echo "⏭️  Tabla ya existe: ${PROJECT}-jobs-${ENV}"
fi

echo ""

# ============================================
# 3. CREAR IAM ROLE PARA LAMBDA
# ============================================
echo -e "${BLUE}🔐 Paso 3: Creando IAM Role para Lambda...${NC}"

ROLE_NAME="${PROJECT}-lambda-execution-role"

if aws iam get-role --role-name ${ROLE_NAME} 2>&1 | grep -q 'NoSuchEntity'; then
    # Crear trust policy temporal
    cat > /tmp/lambda-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Crear role
    aws iam create-role \
      --role-name ${ROLE_NAME} \
      --assume-role-policy-document file:///tmp/lambda-trust-policy.json

    echo -e "${GREEN}✅ Role creado: ${ROLE_NAME}${NC}"
    
    # Esperar un poco para que el role se propague
    sleep 5
    
    # Adjuntar política básica de Lambda
    aws iam attach-role-policy \
      --role-name ${ROLE_NAME} \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    echo -e "${GREEN}✅ Política básica adjuntada${NC}"
    
    # Adjuntar política personalizada
    if [ -f "deployment/aws-permissions/invenadro-lambda-policy.json" ]; then
        aws iam put-role-policy \
          --role-name ${ROLE_NAME} \
          --policy-name InvenadroLambdaPolicy \
          --policy-document file://deployment/aws-permissions/invenadro-lambda-policy.json
        echo -e "${GREEN}✅ Política personalizada adjuntada${NC}"
    else
        echo -e "${RED}⚠️  No se encontró el archivo de política personalizada${NC}"
    fi
else
    echo "⏭️  Role ya existe: ${ROLE_NAME}"
fi

echo ""

# ============================================
# 4. CREAR IAM ROLE PARA STEP FUNCTION
# ============================================
echo -e "${BLUE}🔐 Paso 4: Creando IAM Role para Step Function...${NC}"

SF_ROLE_NAME="${PROJECT}-stepfunction-execution-role"

if aws iam get-role --role-name ${SF_ROLE_NAME} 2>&1 | grep -q 'NoSuchEntity'; then
    # Crear role para Step Function
    aws iam create-role \
      --role-name ${SF_ROLE_NAME} \
      --assume-role-policy-document file://deployment/aws-permissions/stepfunction-trust-policy.json

    echo -e "${GREEN}✅ Role de Step Function creado: ${SF_ROLE_NAME}${NC}"
    
    sleep 5
    
    # Adjuntar política personalizada
    aws iam put-role-policy \
      --role-name ${SF_ROLE_NAME} \
      --policy-name InvenadroStepFunctionPolicy \
      --policy-document file://deployment/aws-permissions/stepfunction-role-policy.json
    
    echo -e "${GREEN}✅ Política de Step Function adjuntada${NC}"
else
    echo "⏭️  Role de Step Function ya existe: ${SF_ROLE_NAME}"
fi

echo ""

# ============================================
# 5. CREAR USER POOL DE COGNITO
# ============================================
echo -e "${BLUE}👤 Paso 5: Creando Cognito User Pool...${NC}"

USER_POOL_NAME="${PROJECT}-users-${ENV}"

# Verificar si ya existe
EXISTING_POOL=$(aws cognito-idp list-user-pools --max-results 60 --region ${REGION} | \
    jq -r ".UserPools[] | select(.Name==\"${USER_POOL_NAME}\") | .Id")

if [ -z "$EXISTING_POOL" ]; then
    # Crear User Pool
    USER_POOL_ID=$(aws cognito-idp create-user-pool \
      --pool-name ${USER_POOL_NAME} \
      --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
      --auto-verified-attributes email \
      --username-attributes email \
      --region ${REGION} | jq -r '.UserPool.Id')
    
    echo -e "${GREEN}✅ User Pool creado: ${USER_POOL_ID}${NC}"
    
    # Crear App Client
    CLIENT_ID=$(aws cognito-idp create-user-pool-client \
      --user-pool-id ${USER_POOL_ID} \
      --client-name "${PROJECT}-app-client" \
      --no-generate-secret \
      --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
      --region ${REGION} | jq -r '.UserPoolClient.ClientId')
    
    echo -e "${GREEN}✅ App Client creado: ${CLIENT_ID}${NC}"
    
    # Guardar IDs en archivo
    cat > deployment/cognito-ids.txt << EOF
USER_POOL_ID=${USER_POOL_ID}
CLIENT_ID=${CLIENT_ID}
EOF
    
    echo ""
    echo -e "${GREEN}🎉 IMPORTANTE: Guarda estos valores${NC}"
    echo -e "User Pool ID: ${BLUE}${USER_POOL_ID}${NC}"
    echo -e "Client ID: ${BLUE}${CLIENT_ID}${NC}"
    echo ""
else
    echo "⏭️  User Pool ya existe: ${EXISTING_POOL}"
    USER_POOL_ID=${EXISTING_POOL}
fi

echo ""

# ============================================
# RESUMEN
# ============================================
echo -e "${GREEN}✅ Infraestructura base creada exitosamente!${NC}"
echo ""
echo "📝 Resumen de recursos creados:"
echo "  - S3 Buckets: ${PROJECT}-uploads-${ENV}, ${PROJECT}-results-${ENV}, ${PROJECT}-frontend-${ENV}"
echo "  - DynamoDB Table: ${PROJECT}-jobs-${ENV}"
echo "  - IAM Role (Lambda): ${ROLE_NAME}"
echo "  - IAM Role (Step Function): ${SF_ROLE_NAME}"
echo "  - Cognito User Pool: ${USER_POOL_NAME} (ID: ${USER_POOL_ID})"
echo ""
echo "📋 Próximos pasos:"
echo "  1. Actualizar FrontEnd-lambdas/src/aws-config.js con los IDs de Cognito"
echo "  2. Ejecutar el script 2-create-lambdas.sh para crear las funciones Lambda"
echo "  3. Ejecutar el script 3-create-api-gateway.sh para crear API Gateway"
echo "  4. Ejecutar el script 4-create-step-function.sh para crear Step Function"
echo ""

