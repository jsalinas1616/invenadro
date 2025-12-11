# 🔄 Cambio en customConfig - DynamoDB

## 📅 Fecha: 2025-12-11

## 🎯 Cambio Realizado:

### **ANTES:**
```javascript
customConfig: { 
    M: { 
        factorRedondeo: { N: String(customConfig?.factorRedondeo || 0.47) },
        joroba: { N: String(customConfig?.joroba || 3.5) },
        diasInversionDeseados: { N: String(customConfig?.diasInversionDeseados || 27) }
    } 
}
```
**Problema:** Solo guardaba 3 campos específicos, perdiendo información adicional como `source`, `ipp_job_id`, `cliente`.

---

### **DESPUÉS:**
```javascript
customConfig: { S: JSON.stringify(customConfig || {}) }
```
**Ventaja:** Guarda TODO el objeto customConfig completo, incluyendo campos dinámicos.

---

## ✅ Beneficios:

1. **Trazabilidad IPP → Factor de Redondeo:**
   - Ahora se guarda `source: 'IPP'`
   - Ahora se guarda `ipp_job_id: 'ipp_abc123'`
   - Ahora se guarda `cliente: '7051602'`

2. **Backward Compatible:**
   - Procesos antiguos siguen funcionando
   - Campos `factorRedondeo`, `joroba`, `diasInversionDeseados` siguen ahí

3. **Flexible:**
   - Cualquier campo nuevo en `customConfig` se guarda automáticamente
   - No requiere cambios futuros en el código

---

## 🔍 Lectura del customConfig:

### **Desde DynamoDB (si necesitas leer):**
```javascript
const { GetItemCommand } = require('@aws-sdk/client-dynamodb');

const result = await dynamoDB.send(new GetItemCommand({
  TableName: 'invenadro-backend-jul-dev-jobs',
  Key: { processId: { S: 'uuid-123' } }
}));

// Parsear el JSON
const customConfig = JSON.parse(result.Item.customConfig.S);

console.log(customConfig);
// {
//   source: 'IPP',
//   ipp_job_id: 'ipp_abc123',
//   cliente: '7051602',
//   factorRedondeo: 0.47,
//   joroba: 3.5,
//   diasInversionDeseados: 27
// }
```

---

## 🛡️ Seguridad:

- ✅ **No rompe código existente** (nadie lee customConfig desde DynamoDB actualmente)
- ✅ **Se pasa via Step Functions** (eventos entre Lambdas)
- ✅ **Optional chaining protege** (`customConfig?.campo`)
- ✅ **Tests existentes pasan** (campos conocidos siguen disponibles)

---

## 📊 Ejemplo de Uso (IPP → Factor):

```javascript
// Bridge envía desde IPP:
const initiatorPayload = {
  s3Bucket: 'uploads',
  s3Key: 'ipp-to-factor/ipp_abc123/7051602/input.xlsx',
  customConfig: {
    source: 'IPP',                    // ⭐ Se guarda
    ipp_job_id: 'ipp_abc123',         // ⭐ Se guarda
    cliente: '7051602',               // ⭐ Se guarda
    factorRedondeo: 0.47,             // ✅ Se guarda
    joroba: 3.5,                      // ✅ Se guarda
    diasInversionDeseados: 27         // ✅ Se guarda
  }
};

// Initiator guarda en DynamoDB:
// customConfig: '{"source":"IPP","ipp_job_id":"ipp_abc123","cliente":"7051602","factorRedondeo":0.47,"joroba":3.5,"diasInversionDeseados":27}'

// Processor recibe del evento (Step Function):
// customConfig = { source: 'IPP', ipp_job_id: 'ipp_abc123', ... }

// Usa los valores:
const factor = customConfig?.factorRedondeo || 0.47;  // ✅ Funciona
const origen = customConfig?.source;                   // ⭐ 'IPP'
const ippJob = customConfig?.ipp_job_id;              // ⭐ 'ipp_abc123'
```

---

## 🔄 Migración:

**No se requiere migración** de datos antiguos porque:
1. El código usa optional chaining (`?.`)
2. Los valores defaults (`|| 0.47`) siguen funcionando
3. Procesos viejos y nuevos coexisten sin problemas

---

## 📝 Notas:

- Este cambio permite la trazabilidad completa entre IPP y Factor de Redondeo
- No afecta el flujo normal del Factor de Redondeo (sin IPP)
- Es extensible para futuros campos sin modificar código

