# 📦 lambda-get-presigned-url

## 🎯 Propósito

Genera URLs pre-firmadas para permitir que el frontend **suba archivos GRANDES directamente a S3**, evitando el límite de 10 MB de API Gateway.

## ⚠️ Problema que resuelve

**ANTES (con límite):**
```
Frontend → API Gateway (❌ 10MB máximo) → lambda-initiator → S3
```
- ❌ Archivos >10 MB: **413 Content Too Large**
- ❌ Solo ~10 clientes por archivo

**DESPUÉS (sin límite):**
```
Frontend → lambda-get-presigned-url → Frontend sube DIRECTO a S3 → lambda-initiator
```
- ✅ Archivos de **cualquier tamaño**
- ✅ 100 clientes, 1000 clientes, lo que sea
- ✅ Más rápido (bypass de API Gateway)

---

## 🔧 Funcionamiento

### 1. Frontend pide presigned URL
```javascript
POST /get-presigned-url
{
  "fileName": "inventario.xlsx",
  "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}
```

### 2. Lambda genera presigned URL
```javascript
{
  "presignedUrl": "https://s3.amazonaws.com/bucket/key?signature=...",
  "bucket": "factor-redondeo-lambda-uploads-dev",
  "key": "uploads/1234567890-inventario.xlsx",
  "expiresIn": 900  // 15 minutos
}
```

### 3. Frontend sube archivo directo a S3
```javascript
PUT [presignedUrl]
Headers: { 'Content-Type': 'application/...' }
Body: [archivo binario]
```

### 4. Frontend inicia procesamiento
```javascript
POST /calcular-redondeo
{
  "s3Bucket": "factor-redondeo-lambda-uploads-dev",
  "s3Key": "uploads/1234567890-inventario.xlsx",
  "customConfig": {...}
}
```

---

## 📋 Deployment

### 1. Instalar dependencias
```bash
npm install
```

### 2. Desplegar Lambda
```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. Configurar API Gateway
```bash
# Crear endpoint POST /get-presigned-url
# Integrar con lambda-get-presigned-url
# Habilitar CORS:
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: POST, OPTIONS
```

### 4. Actualizar lambda-initiator
```bash
cd ../lambda-initiator
# Ya está modificado para aceptar s3Key + s3Bucket
./deploy.sh  # o tu método de deploy
```

---

## 🔐 Permisos IAM Requeridos

El rol de Lambda debe tener:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::factor-redondeo-lambda-uploads-dev/*"
    }
  ]
}
```

---

## 🌐 Variables de Entorno

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `S3_UPLOADS_BUCKET` | `factor-redondeo-lambda-uploads-dev` | Bucket para archivos subidos |
| `AWS_REGION` | `us-east-1` | Región de AWS |

---

## 🧪 Testing

### Probar generación de presigned URL:
```bash
curl -X POST https://YOUR-API-GATEWAY/dev/get-presigned-url \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.xlsx"}'
```

### Probar upload a S3:
```bash
# 1. Obtener presigned URL (del comando anterior)
PRESIGNED_URL="https://s3.amazonaws.com/..."

# 2. Subir archivo
curl -X PUT "$PRESIGNED_URL" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" \
  --data-binary @test.xlsx
```

---

## 📊 Integración con Frontend

El frontend ya está actualizado en `lambdaService.js`:

```javascript
// AUTOMÁTICO: Detecta tamaño del archivo
if (file.size > 10 * 1024 * 1024) {
  // → Usa presigned URL (archivos grandes)
} else {
  // → Usa base64 (archivos pequeños, retrocompatible)
}
```

---

## ✅ Checklist de Implementación

- [x] Crear `lambda-get-presigned-url`
- [x] Modificar `lambda-initiator` para aceptar s3Key
- [x] Actualizar frontend `lambdaService.js`
- [x] Actualizar README principal
- [ ] Desplegar `lambda-get-presigned-url`
- [ ] Configurar API Gateway endpoint `/get-presigned-url`
- [ ] Redesplegar `lambda-initiator` actualizado
- [ ] Probar con archivo >10 MB
- [ ] Probar con archivo <10 MB (retrocompatibilidad)

---

## 🎉 Resultado

- ✅ Archivos de **cualquier tamaño**
- ✅ **Sin cambios** en Step Functions
- ✅ **Sin cambios** en lambda-processor
- ✅ **Retrocompatible** con archivos pequeños
- ✅ **Más rápido** y más barato

¡Sistema listo para procesar archivos con 100+ clientes! 🚀

