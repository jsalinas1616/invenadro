# Módulo IPP (Inventario de Precisión Predictiva)

## 📁 Estructura de Componentes

```
src/
├── pages/
│   └── IPPPage.js                      # Página principal del módulo IPP
├── components/
│   └── ipp/
│       ├── ClientInputForm.js          # Formulario para ingresar clientes
│       ├── ClientValidationTable.js    # Tabla de resultados de validación
│       ├── ValidationWarningModal.js   # Modal de advertencia
│       ├── IPPProcessStatus.js         # Status del proceso en tiempo real
│       └── README.md                   # Este archivo
└── services/
    └── ippService.js                   # Servicio para comunicación con APIs
```

---

## 🎯 Flujo del Módulo

### 1. **Entrada de Clientes** (`ClientInputForm`)
- Usuario puede ingresar clientes de 2 formas:
  - **Manual**: Lista separada por comas o líneas nuevas
  - **CSV**: Subir archivo con IDs de clientes
- Valida que sean números válidos
- Muestra contador en tiempo real

### 2. **Validación** (`ippService.validateClients()`)
- Llama a Lambda `ipp-verificador`
- Verifica configuración en Databricks
- Retorna: `{ status, validClients, invalidClients }`

### 3. **Resultados de Validación** (`ClientValidationTable`)
- Muestra clientes válidos vs inválidos
- Estadísticas visuales (badges)
- Opciones: "Continuar" o "Editar Lista"

### 4. **Modal de Advertencia** (`ValidationWarningModal`)
- Se muestra si hay clientes sin configuración
- Lista detallada de clientes inválidos
- Usuario decide: continuar o cancelar

### 5. **Inicio del Proceso** (`ippService.initiateIPPProcess()`)
- Llama a Lambda `ipp-iniciador`
- Trigger Databricks Job 1
- Retorna `job_id`

### 6. **Monitoreo del Proceso** (`IPPProcessStatus`)
- Polling cada 5 segundos
- Timeline visual del flujo:
  1. Validación ✅
  2. Job 1 (Normalizador) 🔄
  3. Aplicación de factor ⚙️
  4. Job 2 (Knoblock) 🔄
  5. Completado 🎉

---

## 🔌 API Endpoints (Backend)

### POST `/ipp/validate-clients`
**Request:**
```json
{
  "clients": ["7051602", "7051603", "7051604"]
}
```

**Response:**
```json
{
  "status": "partial_valid",
  "validClients": ["7051602", "7051603"],
  "invalidClients": ["7051604"],
  "message": "2 de 3 clientes tienen configuración"
}
```

---

### POST `/ipp/start`
**Request:**
```json
{
  "clients": ["7051602", "7051603"]
}
```

**Response:**
```json
{
  "job_id": "ipp-abc123-def456",
  "status": "job1_running",
  "message": "Proceso IPP iniciado"
}
```

---

### GET `/ipp/status/{job_id}`
**Response:**
```json
{
  "job_id": "ipp-abc123-def456",
  "status": "processing",
  "message": "Aplicando factor de redondeo...",
  "progress": 50
}
```

---

### GET `/ipp/results/{job_id}`
**Response:**
```json
{
  "job_id": "ipp-abc123-def456",
  "status": "completed",
  "results": {
    "clients": [...],
    "summary": {...}
  }
}
```

---

## 🎨 Estilos y Diseño

### Paleta de Colores
- **Primary**: `#648a26` (verde corporativo)
- **Success**: `#28a745` (verde Bootstrap)
- **Warning**: `#ffc107` (amarillo Bootstrap)
- **Danger**: `#dc3545` (rojo Bootstrap)

### Componentes Reutilizados
- **Bootstrap React**: Cards, Badges, Buttons, Tables, Modals
- **React Icons**: FaUsers, FaCheckCircle, FaTimesCircle, etc.
- **react-dropzone**: Para upload de CSV

---

## 🛠️ Desarrollo

### Agregar nuevo estado al proceso
1. Actualizar `IPPProcessStatus.js`:
```javascript
const progressMap = {
  'nuevo_estado': { percent: 60, label: 'Descripción...' }
};
```

2. Actualizar timeline visual con nuevo paso

### Agregar validación adicional
1. Modificar `ClientInputForm.js`:
```javascript
const validateInput = (input) => {
  // Tu lógica de validación
};
```

### Personalizar modal
1. Editar `ValidationWarningModal.js`
2. Agregar/quitar secciones según necesidad

---

## ✅ Testing

### Manual Testing
1. Ejecutar frontend: `npm start`
2. Navegar a módulo "Farmacias Independientes - IPP"
3. Probar ambos métodos de entrada (manual y CSV)
4. Verificar validación
5. Probar flujo completo end-to-end

### CSV de Prueba
```csv
cliente
7051602
7051603
7051604
7051605
```

---

## 📝 Mejoras Futuras

- [ ] Agregar validación de formato de CSV más robusta
- [ ] Permitir editar lista después de validación
- [ ] Mostrar logs detallados del proceso
- [ ] Descargar resultados en Excel
- [ ] Histórico de procesos IPP ejecutados
- [ ] Notificaciones push cuando proceso termine

---

## 🐛 Troubleshooting

### Error: "No se pudo obtener token de autenticación"
- Verificar que usuario esté logueado
- Revisar configuración de Cognito en `aws-config.js`

### Error: "Error validando clientes"
- Verificar que Lambda `ipp-verificador` esté deployada
- Revisar logs en CloudWatch
- Verificar conexión a Databricks

### Modal no se muestra
- Verificar estado `showWarningModal` en `IPPPage.js`
- Revisar props pasadas a `ValidationWarningModal`

---

## 📚 Recursos

- [Diagrama de Arquitectura](../../../docs/ipp-architecture.png)
- [Documentación Backend](../../../services/backend/functionsIPP/README.md)
- [Guía de Deployment](../../../README_DEPLOY.md)

---

**Última actualización**: Diciembre 2024

