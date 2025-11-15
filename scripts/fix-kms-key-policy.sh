#!/bin/bash
# Script para arreglar la key policy de la clave KMS AWS-managed
# Ejecuta esto UNA VEZ con tu usuario admin

set -e

REGION="mx-central-1"
ACCOUNT_ID="975130647458"
KEY_ID="dc6e7f4f-46e5-437c-83eb-677892620567"

echo "🔧 Actualizando key policy de la clave KMS AWS-managed..."
echo "   Key ID: $KEY_ID"
echo "   Region: $REGION"
echo ""

# Crear la policy actualizada
cat > /tmp/kms-policy-fixed.json << 'POLICY_EOF'
{
  "Version": "2012-10-17",
  "Id": "auto-awslambda",
  "Statement": [
    {
      "Sid": "Allow access through AWS Lambda for all principals in the account that are authorized to use AWS Lambda",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:CreateGrant",
        "kms:DescribeKey"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:CallerAccount": "975130647458",
          "kms:ViaService": "lambda.mx-central-1.amazonaws.com"
        }
      }
    },
    {
      "Sid": "Allow Lambda roles explicit access",
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::975130647458:role/invenadro-backend-jul-dev-initiator-mx-central-1-lambdaRole",
          "arn:aws:iam::975130647458:role/invenadro-backend-jul-dev-clientSeparator-mx-central-1",
          "arn:aws:iam::975130647458:role/invenadro-backend-jul-dev-processor-mx-central-1-lambdaRole",
          "arn:aws:iam::975130647458:role/invenadro-backend-jul-dev-statusChecker-mx-central-1-lambdaRole",
          "arn:aws:iam::975130647458:role/invenadro-backend-jul-dev-clientAggregator-mx-central-1",
          "arn:aws:iam::975130647458:role/invenadro-backend-jul-dev-downloadResult-mx-central-1-lambdaRole",
          "arn:aws:iam::975130647458:role/invenadro-backend-jul-dev-excelGenerator-mx-central-1-lambdaRole",
          "arn:aws:iam::975130647458:role/invenadro-backend-jul-dev-getPresignedUrl-mx-central-1"
        ]
      },
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Allow direct access to key metadata to the account",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::975130647458:root"
      },
      "Action": [
        "kms:Describe*",
        "kms:Get*",
        "kms:List*",
        "kms:RevokeGrant"
      ],
      "Resource": "*"
    }
  ]
}
POLICY_EOF

# Aplicar la policy
echo "📝 Aplicando nueva key policy..."
aws kms put-key-policy \
  --key-id "$KEY_ID" \
  --policy-name default \
  --policy file:///tmp/kms-policy-fixed.json \
  --region "$REGION"

echo ""
echo "✅ Key policy actualizada exitosamente!"
echo ""
echo "🎯 Ahora las Lambdas pueden descifrar env vars cuando Step Functions las invoca."
echo ""
echo "📋 Para verificar:"
echo "   aws kms get-key-policy --key-id $KEY_ID --policy-name default --region $REGION | jq -r '.Policy' | jq"

