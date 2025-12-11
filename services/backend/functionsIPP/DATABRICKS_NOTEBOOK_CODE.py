# ============================================================
# NOTEBOOK DATABRICKS - IPP Job 1
# Código para agregar AL FINAL de tu notebook existente
# ============================================================

# ===========================================================
# SECCIÓN 1: WIDGETS (AL INICIO DEL NOTEBOOK - PRIMERA CELL)
# ===========================================================
import json
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType
from datetime import datetime

# Crear widgets para recibir parámetros desde Lambda
dbutils.widgets.text("job_id", "test_local_001")
dbutils.widgets.text("mostradores_lambda", "7051602")
dbutils.widgets.text("bucket_name", "invenadro-backend-jul-dev-ipp-raw")
dbutils.widgets.text("dynamodb_table", "invenadro-backend-jul-dev-ipp-jobs")
dbutils.widgets.text("limite_precio", "3000")
dbutils.widgets.text("estatus_material", "Disponible")

# Leer los valores de los widgets
job_id_param = dbutils.widgets.get("job_id")
mostradores_lambda = dbutils.widgets.get("mostradores_lambda")
bucket_name = dbutils.widgets.get("bucket_name")
dynamodb_table = dbutils.widgets.get("dynamodb_table")
limite_precio = float(dbutils.widgets.get("limite_precio"))
estatus_material = dbutils.widgets.get("estatus_material")

print("=" * 80)
print("📋 PARÁMETROS DEL JOB IPP:")
print("=" * 80)
print(f"Job ID: {job_id_param}")
print(f"Mostradores: {mostradores_lambda}")
print(f"Bucket S3: {bucket_name}")
print(f"Tabla DynamoDB: {dynamodb_table}")
print(f"Límite Precio: {limite_precio}")
print(f"Estatus Material: {estatus_material}")
print("=" * 80)

# ===========================================================
# SECCIÓN 2: CONFIGURACIÓN DE MOSTRADORES (AJUSTAR TU CÓDIGO)
# ===========================================================
# Convertir mostradores_lambda a lista
mostradores_list = mostradores_lambda.split(',')

# Generar config_list dinámicamente para cada mostrador
config_list = []
for mostrador in mostradores_list:
    config_list.append({
        "mostrador": mostrador.strip(),
        "Tipo_invenadro": "SPP",
        "Monto_deseado": 150000,
        "Incluye_Refrigerados": "S",
        "Incluye_Psicotropicos": "S",
        "Incluye_Especialidades": "S",
        "Incluye_Genericos": "S",
        "Incluye_Dispositivos_Medicos": "S",
        "Incluye_Complementos_Alimenticios": "S",
        "Incluye_Dermatologico": "S",
        "Incluye_OTC": "S",
        "Incluye_Etico_Patente": "S"
    })

print("Config generada para mostradores:")
print(config_list)

# ===========================================================
# SECCIÓN 3: TU PROCESAMIENTO IPP ACTUAL
# (Todo tu código de Factor_A, Factor_B, Factor_C, etc.)
# NO TOCAR - Ya lo tienes funcionando
# ===========================================================
# ... TODO TU CÓDIGO ACTUAL AQUÍ ...
# Al final deberías tener df_result con todos los datos procesados

# ===========================================================
# ÚLTIMA SECCIÓN: GUARDAR EN S3 + DYNAMODB (AL FINAL DEL NOTEBOOK)
# ===========================================================
import boto3

print("\n" + "=" * 80)
print("📦 GUARDANDO RESULTADO EN AWS S3 (PARTICIONADO POR CLIENTE)")
print("=" * 80)

# Obtener credenciales AWS desde Databricks Secrets
aws_access_key = dbutils.secrets.get(scope="aws-creds", key="access-key")
aws_secret_key = dbutils.secrets.get(scope="aws-creds", key="secret-key")

# Conectar a AWS
s3 = boto3.client(
    's3',
    aws_access_key_id=aws_access_key,
    aws_secret_access_key=aws_secret_key,
    region_name='mx-central-1'
)

dynamodb = boto3.resource(
    'dynamodb',
    aws_access_key_id=aws_access_key,
    aws_secret_access_key=aws_secret_key,
    region_name='mx-central-1'
)

# Obtener lista única de clientes procesados
clientes_procesados = [row.Cliente for row in df_result.select("Cliente").distinct().collect()]
total_clientes = len(clientes_procesados)
total_registros_global = df_result.count()

print(f"📊 Total de clientes: {total_clientes}")
print(f"📊 Total de registros: {total_registros_global}")

# PARTICIONAR Y GUARDAR POR CLIENTE
clientes_metadata = []

for idx, cliente in enumerate(clientes_procesados, 1):
    print(f"\n[{idx}/{total_clientes}] Procesando cliente: {cliente}")
    
    # Filtrar datos de este cliente
    df_cliente = df_result.filter(F.col("Cliente") == cliente)
    
    # Contar registros del cliente
    registros_cliente = df_cliente.count()
    
    # Convertir a dict
    resultado_cliente_dict = df_cliente.toPandas().to_dict('records')
    
    # Calcular métricas del cliente
    metricas_cliente = df_cliente.agg(
        F.sum("Importe").alias("monto_total"),
        F.avg("Factor_4").alias("factor_promedio"),
        F.count("*").alias("total_registros")
    ).collect()[0]
    
    # Estructura JSON por cliente
    resultado_cliente = {
        "job_id": job_id_param,
        "cliente": cliente,
        "timestamp": datetime.now().isoformat(),
        "total_registros": registros_cliente,
        
        # Métricas agregadas
        "metricas": {
            "monto_total": float(metricas_cliente["monto_total"]) if metricas_cliente["monto_total"] else 0,
            "factor_promedio": float(metricas_cliente["factor_promedio"]) if metricas_cliente["factor_promedio"] else 0
        },
        
        # Datos completos del cliente
        "datos": resultado_cliente_dict
    }
    
    # Guardar en S3: un archivo por cliente
    s3_key_cliente = f'resultados/{job_id_param}/clientes/cliente_{cliente}.json'
    
    try:
        s3.put_object(
            Bucket=bucket_name,
            Key=s3_key_cliente,
            Body=json.dumps(resultado_cliente, ensure_ascii=False, default=str),
            ContentType='application/json'
        )
        print(f"   ✅ Guardado: s3://{bucket_name}/{s3_key_cliente}")
        print(f"      Registros: {registros_cliente}, Monto: ${metricas_cliente['monto_total']:,.2f}")
        
        # Guardar metadata del cliente para el resumen
        clientes_metadata.append({
            "cliente": cliente,
            "registros": registros_cliente,
            "monto_total": float(metricas_cliente["monto_total"]) if metricas_cliente["monto_total"] else 0,
            "s3_path": f's3://{bucket_name}/{s3_key_cliente}'
        })
        
    except Exception as e:
        print(f"   ❌ Error guardando cliente {cliente}: {str(e)}")
        raise

# GUARDAR METADATA GENERAL (resumen de todos los clientes)
metadata_general = {
    "job_id": job_id_param,
    "timestamp": datetime.now().isoformat(),
    "status": "completed",
    "total_clientes": total_clientes,
    "total_registros": total_registros_global,
    
    # Lista de clientes procesados con sus métricas
    "clientes": clientes_metadata,
    
    # Parámetros usados
    "parametros": {
        "limite_precio": limite_precio,
        "estatus_material": estatus_material,
        "mostradores": mostradores_lambda
    }
}

# Guardar metadata.json (archivo maestro que dispara el bridge)
s3_key_metadata = f'resultados/{job_id_param}/metadata.json'

s3.put_object(
    Bucket=bucket_name,
    Key=s3_key_metadata,
    Body=json.dumps(metadata_general, ensure_ascii=False, default=str),
    ContentType='application/json'
)

print(f"\n✅ Metadata general guardado: s3://{bucket_name}/{s3_key_metadata}")

# ACTUALIZAR DYNAMODB
print(f"\n🗄️  Actualizando DynamoDB...")

table = dynamodb.Table(dynamodb_table)

table.update_item(
    Key={'job_id': job_id_param},
    UpdateExpression='SET #s = :status, s3_result_path = :path, updated_at = :time, total_clientes = :clientes, total_registros = :registros',
    ExpressionAttributeNames={
        '#s': 'status'
    },
    ExpressionAttributeValues={
        ':status': 'completed',
        ':path': f's3://{bucket_name}/resultados/{job_id_param}/',
        ':time': datetime.now().isoformat(),
        ':clientes': total_clientes,
        ':registros': total_registros_global
    }
)

print(f"✅ DynamoDB actualizado")

# RESUMEN FINAL
print("\n" + "=" * 80)
print("🎉 PROCESO IPP COMPLETADO EXITOSAMENTE")
print("=" * 80)
print(f"📊 Resumen:")
print(f"   - Job ID: {job_id_param}")
print(f"   - Total clientes procesados: {total_clientes}")
print(f"   - Total registros generados: {total_registros_global:,}")
print(f"   - Promedio registros/cliente: {total_registros_global/total_clientes:,.0f}")
print(f"\n📁 Archivos generados:")
print(f"   - Metadata: s3://{bucket_name}/{s3_key_metadata}")
print(f"   - Datos por cliente: s3://{bucket_name}/resultados/{job_id_param}/clientes/")
print(f"\n🌉 Lambda Bridge se activará automáticamente al detectar metadata.json")
print("=" * 80)

