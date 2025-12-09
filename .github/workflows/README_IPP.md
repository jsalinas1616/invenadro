# Configuración de Secrets para IPP

## 🔐 Nuevo Secret Requerido

Para que los workflows desplieguen correctamente el módulo IPP, necesitas agregar este secret en GitHub:

### `DATABRICKS_IPP_JOB1_ID`

**Ubicación en GitHub:**
```
Repositorio → Settings → Secrets and variables → Actions → New repository secret
```

**Nombre del Secret:**
```
DATABRICKS_IPP_JOB1_ID
```

**Valor:**
```
[ID del Job 1 de Databricks para IPP]
```

Este ID lo obtienes después de crear el Job en Databricks con los notebooks:
- Notebook Tradicional
- Notebook Normalizador

---

## 📝 Cómo Obtener el Job ID de Databricks

1. **Ir a Databricks Workspace**
   ```
   https://adb-xxx.azuredatabricks.net
   ```

2. **Crear el Job IPP:**
   - Workflows → Create Job
   - Nombre: `IPP - Job 1 - Procesamiento Tradicional`
   - Agregar tasks:
     - Task 1: Notebook Tradicional
     - Task 2: Notebook Normalizador
   - Configurar parámetros:
     - `job_id`: (se pasará desde Lambda)
     - `mostradores`: (CSV de mostradores)

3. **Copiar Job ID:**
   - Después de crear el job, verás la URL:
     ```
     https://adb-xxx.azuredatabricks.net/#job/789/tasks
     ```
   - El número **789** es el Job ID

4. **Agregar a GitHub Secrets:**
   ```
   Name: DATABRICKS_IPP_JOB1_ID
   Value: 789
   ```

---

## ✅ Verificar Secrets Existentes

Asegúrate de que estos secrets ya existan (necesarios para CRUD y ahora también para IPP):

- ✅ `DATABRICKS_WORKSPACE_URL`
- ✅ `DATABRICKS_ACCESS_TOKEN`
- ✅ `DATABRICKS_WAREHOUSE_ID`
- ✅ `DATABRICKS_ORG_ID`
- 🆕 `DATABRICKS_IPP_JOB1_ID` (nuevo)

---

## 🚀 Después de Agregar el Secret

Los workflows ya están actualizados para pasar el nuevo parámetro:

```yaml
# deploy-jul-dev.yml, deploy-jul-qa.yml, deploy-nadro-qa.yml, deploy-nadro-prod.yml
--param="DATABRICKS_IPP_JOB1_ID=${{ secrets.DATABRICKS_IPP_JOB1_ID }}"
```

Cuando hagas push, el workflow automáticamente:
1. Desplegará las 4 nuevas Lambdas IPP
2. Creará la tabla DynamoDB `ipp-jobs`
3. Creará los buckets S3 `ipp-raw` y `ipp-processed`
4. Configurará los endpoints `/ipp/*`

---

## ⚠️ Si No Tienes el Job ID Todavía

Si aún no has creado el Job en Databricks, puedes:

**Opción 1:** Agregar un valor temporal
```
Value: 0
```
El deploy funcionará, pero la Lambda `ipp-iniciador` fallará al tratar de trigger el job.

**Opción 2:** Esperar a crear el Job primero
1. Crear Job en Databricks
2. Obtener Job ID
3. Agregar secret
4. Hacer push para deploy

---

## 📚 Documentación Relacionada

- [README IPP Backend](../../services/backend/functionsIPP/README.md)
- [README IPP Frontend](../../FrontEnd-lambdas/src/components/ipp/README.md)
- [Diagrama de Arquitectura](../../docs/ipp-architecture.png)

