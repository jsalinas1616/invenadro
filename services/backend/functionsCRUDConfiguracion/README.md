# CRUD de Configuraciones de Mostrador

Este módulo implementa un CRUD completo para gestionar configuraciones de mostradores, completamente **separado** del proceso de cálculo de redondeo (Step Functions).

## 📁 Estructura

```
functionsCRUDConfiguracion/
├── create-config/     # Lambda para crear configuraciones
├── read-config/       # Lambda para leer configuraciones
├── update-config/     # Lambda para actualizar configuraciones
└── delete-config/     # Lambda para eliminar configuraciones
```

**Nota:** Esta carpeta está separada de `functions/` para mantener una organización clara entre las lambdas del proceso de cálculo (Step Functions) y las lambdas del CRUD.

## 🔌 API Endpoints

Todos los endpoints requieren autenticación con Cognito (Bearer token).

### 1. **Crear Configuración**
```
POST /configuraciones
```

**Body:**
```json
{
  "mostrador": "Mostrador Central",
  "tipoInvenadro": "SPP",
  "montoRequerido": 150000,
  "incluye_Refrigerados": "S",
  "incluye_Psicotropicos": "S",
  "incluye_Especialidades": "S",
  "incluye_Genericos": "N",
  "incluye_Dispositivos_Medicos": "S",
  "incluye_Complementos_Alimenticios": "S",
  "incluye_Dermatologico": "S",
  "incluye_OTC": "S",
  "incluye_Etico_Patente": "S"
}
```

**Respuesta:**
```json
{
  "message": "Configuración creada exitosamente",
  "config": {
    "mostradorId": "uuid-generado",
    "mostrador": "Mostrador Central",
    ...
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. **Listar Todas las Configuraciones**
```
GET /configuraciones
```

**Respuesta:**
```json
{
  "configs": [...],
  "count": 5
}
```

### 3. **Obtener Configuración por ID**
```
GET /configuraciones/{mostradorId}
```

**Respuesta:**
```json
{
  "config": {
    "mostradorId": "uuid",
    "mostrador": "Mostrador Central",
    ...
  }
}
```

### 4. **Actualizar Configuración**
```
PUT /configuraciones/{mostradorId}
```

**Body:**
```json
{
  "montoRequerido": 200000,
  "incluye_Refrigerados": "N"
}
```

**Respuesta:**
```json
{
  "message": "Configuración actualizada exitosamente",
  "config": { ... }
}
```

### 5. **Eliminar Configuración**
```
DELETE /configuraciones/{mostradorId}
```

**Respuesta:**
```json
{
  "message": "Configuración eliminada exitosamente",
  "mostradorId": "uuid"
}
```

## 💾 DynamoDB

**Tabla:** `invenadro-backend-{stage}-configuraciones-mostrador`

**Clave Primaria:** `mostradorId` (String)

**Atributos:**
- `mostradorId`: UUID único
- `mostrador`: Nombre del mostrador
- `tipoInvenadro`: SPP o IPP
- `montoRequerido`: Número
- `incluye_*`: S/N para cada tipo de producto
- `createdAt`: Timestamp de creación
- `updatedAt`: Timestamp de última actualización

## 🚀 Deploy

```bash
cd services/backend
serverless deploy --stage jul-dev
```

## 🧪 Testing Local

```bash
# Crear configuración
curl -X POST https://api-url/configuraciones \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mostrador":"Test","tipoInvenadro":"SPP","montoRequerido":100000}'

# Listar todas
curl -X GET https://api-url/configuraciones \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Notas Importantes

- ✅ **Separado del Step Function**: Este CRUD NO interfiere con el proceso de cálculo
- ✅ **Tabla independiente**: Usa su propia tabla de DynamoDB
- ✅ **Endpoints propios**: Rutas `/configuraciones/*` separadas
- ✅ **Autenticación requerida**: Todos los endpoints protegidos con Cognito
- ✅ **CORS habilitado**: Permite requests desde el frontend

## 🔐 Permisos IAM

Cada lambda tiene permisos específicos solo a la tabla de configuraciones:
- `createConfig`: `dynamodb:PutItem`
- `readConfig`: `dynamodb:GetItem`, `dynamodb:Scan`
- `updateConfig`: `dynamodb:UpdateItem`
- `deleteConfig`: `dynamodb:DeleteItem`

