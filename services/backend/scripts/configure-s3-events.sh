#!/bin/bash

# Script para configurar S3 Event Notifications después del deploy
# Se ejecuta después de: npx serverless deploy --stage jul-dev

set -e

STAGE=${1:-jul-dev}
REGION="mx-central-1"
SERVICE_NAME="invenadro-backend"

echo "=================================================="
echo "Configurando S3 Events para stage: $STAGE"
echo "=================================================="

# 1. Obtener ARNs de las Lambdas
echo ""
echo "1. Obteniendo ARNs de las Lambdas..."

BRIDGE_LAMBDA_ARN=$(aws lambda get-function \
  --function-name ${SERVICE_NAME}-${STAGE}-ipp-to-factor-bridge \
  --region ${REGION} \
  --query 'Configuration.FunctionArn' \
  --output text)

CALLBACK_LAMBDA_ARN=$(aws lambda get-function \
  --function-name ${SERVICE_NAME}-${STAGE}-factor-completion-callback \
  --region ${REGION} \
  --query 'Configuration.FunctionArn' \
  --output text)

echo "   Bridge Lambda: $BRIDGE_LAMBDA_ARN"
echo "   Callback Lambda: $CALLBACK_LAMBDA_ARN"

# 2. Agregar permisos para que S3 invoque las Lambdas
echo ""
echo "2. Agregando permisos Lambda..."

# Permiso para ipp-to-factor-bridge
aws lambda add-permission \
  --function-name ${SERVICE_NAME}-${STAGE}-ipp-to-factor-bridge \
  --statement-id s3-ipp-raw-invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::${SERVICE_NAME}-${STAGE}-ipp-raw \
  --region ${REGION} \
  2>/dev/null || echo "   Permiso ya existe para bridge"

# Permiso para factor-completion-callback
aws lambda add-permission \
  --function-name ${SERVICE_NAME}-${STAGE}-factor-completion-callback \
  --statement-id s3-results-invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::${SERVICE_NAME}-${STAGE}-results \
  --region ${REGION} \
  2>/dev/null || echo "   Permiso ya existe para callback"

echo "   Permisos configurados"

# 3. Configurar notificación en bucket ipp-raw
echo ""
echo "3. Configurando notificación en bucket ipp-raw..."

cat > /tmp/ipp-raw-notification.json <<EOF
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "$BRIDGE_LAMBDA_ARN",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "suffix",
              "Value": "metadata.json"
            }
          ]
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-notification-configuration \
  --bucket ${SERVICE_NAME}-${STAGE}-ipp-raw \
  --notification-configuration file:///tmp/ipp-raw-notification.json \
  --region ${REGION}

echo "   Notificación configurada para ipp-raw"

# 4. Configurar notificación en bucket results
echo ""
echo "4. Configurando notificación en bucket results..."

cat > /tmp/results-notification.json <<EOF
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "$CALLBACK_LAMBDA_ARN",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "suffix",
              "Value": "resultado.json"
            }
          ]
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-notification-configuration \
  --bucket ${SERVICE_NAME}-${STAGE}-results \
  --notification-configuration file:///tmp/results-notification.json \
  --region ${REGION}

echo "   Notificación configurada para results"

# 5. Limpiar archivos temporales
rm /tmp/ipp-raw-notification.json
rm /tmp/results-notification.json

echo ""
echo "=================================================="
echo "S3 Events configurados exitosamente"
echo "=================================================="
echo ""
echo "Verificar:"
echo "  aws s3api get-bucket-notification-configuration --bucket ${SERVICE_NAME}-${STAGE}-ipp-raw"
echo "  aws s3api get-bucket-notification-configuration --bucket ${SERVICE_NAME}-${STAGE}-results"
echo ""

