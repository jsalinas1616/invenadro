#!/bin/bash
# Script de prueba para API de Invenadro
# NOTA: Este es un TEMPLATE. Actualiza las URLs después de crear tu API Gateway

# ⚠️ IMPORTANTE: Después de ejecutar la migración, actualiza estas URLs:
API_GATEWAY_ID="TU_NUEVO_API_GATEWAY_ID"  # Actualizar después de crear API Gateway
REGION="us-east-1"
STAGE="dev"

# URL base
BASE_URL="https://${API_GATEWAY_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}"

echo "🧪 Testing Invenadro API"
echo "📍 URL: ${BASE_URL}/calcular-redondeo"
echo ""

# Verificar si postman_payload.json existe
if [ ! -f "postman_payload.json" ]; then
    echo "❌ Error: postman_payload.json no encontrado"
    echo "Crea un archivo postman_payload.json con tu payload de prueba"
    exit 1
fi

# Hacer la petición
curl -X POST "${BASE_URL}/calcular-redondeo" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -d @postman_payload.json \
  --max-time 300 \
  --verbose

echo ""
echo "✅ Test completado"
