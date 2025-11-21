# Páginas de la Aplicación

Esta carpeta contiene las páginas principales de la aplicación.

## 📄 Páginas Disponibles

### ConfiguracionesPage.js
**Ruta:** Accesible desde el Sidebar > Configuraciones

Página para gestionar el CRUD de configuraciones de mostrador.

**Características:**
- ✅ Listar todas las configuraciones
- ✅ Crear nueva configuración
- ✅ Editar configuración existente
- ✅ Eliminar configuración
- ✅ Búsqueda y filtros
- ✅ Estadísticas en tiempo real
- ✅ Notificaciones toast
- ✅ Modal de confirmación para eliminación

**Componentes utilizados:**
- `ConfigTable`: Tabla con búsqueda y filtros
- `ConfigForm`: Formulario de creación/edición
- `ConfigModal`: Modal para crear/editar

**Servicios:**
- `configService`: API para CRUD de configuraciones

## 🔄 Navegación

La navegación entre páginas se maneja en `App.js` mediante el estado `activeModule`:

```javascript
{activeModule === 'configuraciones' && (
  <ConfiguracionesPage />
)}
```

## 📦 Estructura de Datos

**Configuración:**
```javascript
{
  mostradorId: "uuid",
  mostrador: "Nombre del mostrador",
  tipoInvenadro: "SPP | IPP",
  montoRequerido: 150000,
  incluye_Refrigerados: "S | N",
  incluye_Psicotropicos: "S | N",
  incluye_Especialidades: "S | N",
  incluye_Genericos: "S | N",
  incluye_Dispositivos_Medicos: "S | N",
  incluye_Complementos_Alimenticios: "S | N",
  incluye_Dermatologico: "S | N",
  incluye_OTC: "S | N",
  incluye_Etico_Patente: "S | N",
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

