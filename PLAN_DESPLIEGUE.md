# 🚀 Plan de Despliegue y Orden Recomendado de Arranque
> **Proyecto:** Cartografía Semántica de Desaparecidos  
> **Rama Git:** `feature/ner-ontologia-mineria`  
> **Servidores Involucrados:** `gpu` (RTX 5060 Ti 16GB), `abeja` (Debian 6.12 | 100.66.3.85), y Nodos Edge (Raspberry Pi 3B+).

---

## 📋 Resumen del Flujo de Puesta en Marcha

Para asegurar que los datos sensibles nunca queden expuestos y que los motores de búsqueda no bloqueen las consultas por sobrecarga, el despliegue debe seguir **estrictamente este orden secuencial**:

```
[1. Servidor GPU]          [2. Servidor Abeja]         [3. Entorno Local]        [4. Minería Histórica]
Entrenamiento NER          Inicialización 4 Capas      Prueba Unitaria OSINT     Worker Redis + Batch
(GLiNER / Reporte F1)  ➔   (Postgres + Qdrant)    ➔    (worker.py --local)   ➔   (Rate-Limit 300s)
```

---

## 🎯 1. Fase de Entrenamiento del NER (Servidor GPU)

### Por dónde empezar:
Lo primero es consolidar el modelo de extracción de entidades para asegurarte de que el anonimizador tenga **alta precisión ($F1 \ge 0.90$)** antes de procesar registros sensibles en masa.

### Pasos en el Servidor GPU (`produccion@gpu`):
1. **Acceder al servidor y ubicarse en la rama de trabajo:**
   ```bash
   cd /ruta/a/CartografiaSemanticaDesaparecidos
   git fetch origin
   git checkout feature/ner-ontologia-mineria
   git pull origin feature/ner-ontologia-mineria
   ```

2. **Verificar que el dataset esté presente:**
   ```bash
   ls -lh backend/app/ner/data/dataset_ner_personas.jsonl
   ```

3. **Ejecutar el pipeline de entrenamiento parametrizable:**
   ```bash
   python3 backend/app/ner/train_ner.py \
       --action train-gliner \
       --model-name urchade/gliner_medium-v2.1 \
       --epochs 6 \
       --batch-size 8 \
       --grad-accum 2 \
       --lr-encoder 2e-5 \
       --lr-head 5e-5 \
       --weight-decay 0.01 \
       --fp16 \
       --output-dir ./models/gliner_personas_ner \
       --report-dir ./reports/training/
   ```

4. **Objetivo y Criterio de Aceptación:**
   Inspeccionar el reporte Markdown generado automáticamente en `reports/training/reporte_iteracion_YYYYMMDD_HHMM.md`.
   * Verificar que se cumpla: $F1 \ge 0.90$ en `NOMBRE` y `DOMICILIO`, y $F1 \ge 0.85$ Global.

---

## 🗄️ 2. Migración e Inicialización de Capas (Servidor `abeja`)

### Siguiente paso:
Una vez validado el modelo, inicializa la base de datos aislada `cartografia_semantica_db` y los modelos SQLAlchemy correspondientes a las **4 capas** para habilitar la tabla de registros privados (`cedulas_privadas`), el registro de hashes criptográficos (`pii_hash_registry`) y la colección vectorial en Qdrant.

### Pasos en el Servidor `abeja` (`100.66.3.85`):
1. **Crear la base de datos aislada en PostgreSQL:**
   ```bash
   psql -h 127.0.0.1 -U tejer_Admin -d postgres -c "CREATE DATABASE cartografia_semantica_db;"
   ```

2. **Crear las tablas de las 4 capas:**
   ```bash
   # Opción A: Mediante el script SQL DDL
   psql -h 127.0.0.1 -U tejer_Admin -d cartografia_semantica_db -f backend/scripts/init_cartografia_db.sql

   # Opción B: Mediante SQLAlchemy
   python3 backend/scripts/init_db.py
   ```

3. **Crear la colección dedicada en Qdrant (`tejer_qdrant:6333`):**
   ```bash
   curl -X PUT "http://127.0.0.1:6333/collections/cartografia_registros_anonimizados" \
        -H "Content-Type: application/json" \
        -d '{"vectors": {"size": 768, "distance": "Cosine"}}'
   ```

4. **Configurar el archivo `.env` en producción:**
   Asegurar que `PII_GLOBAL_SALT` esté definido con una cadena secreta segura compartida.

---

## 🧪 3. Pruebas Locales del Pipeline OSINT (Entorno de Desarrollo)

### Siguiente paso:
Antes de disparar tareas masivas en producción o en los nodos edge, prueba el generador de consultas y el minero de prensa con un caso individual en modo local:

### Comandos de ejecución:
1. **Prueba del Worker en modo local interactivo:**
   ```bash
   python3 -m backend.app.miners.worker --local
   ```
   * *Resultado esperado:* Debe procesar una consulta de prueba, extraer el artículo y mostrar `[SUCCESS] Verificación de worker local exitosa`.

2. **Prueba unitaria de la CLI de anonimización:**
   ```bash
   echo "Refiere que Pedro Perez salio de calle Morelos 45 en Guadalajara el 20 de mayo 2024" > /tmp/test.txt
   python3 -m backend.app.ner.cli --input /tmp/test.txt --output /tmp/test_anon.txt --salt "mi_sal_local"
   cat /tmp/test_anon.txt
   ```
   * *Resultado esperado:* El texto debe contener tokens como `[NOMBRE_HASH_xxxx]` y `[DOMICILIO_HASH_xxxx]` sin nombres reales.

3. **Correr la suite automatizada de pruebas:**
   ```bash
   pytest tests/ -v
   ```
   * *Resultado esperado:* 14 pruebas pasadas exitosamente (`14 passed`).

---

## ⛏️ 4. Ejecución del Minero Histórico (Con Rate-Limiting)

### Paso final:
Una vez verificado el flujo unitario, enciende el worker conectado a Redis (`tejer_redis:6379`) y arranca el script por lotes (`batch_miner.py`) aplicando las restricciones de concurrencia adecuadas según el nodo (especialmente si operas sobre la Raspberry Pi 3B+ o el servidor central).

### Paso 4.1: Encender el Worker de Colas
* **En Raspberry Pi 3B+ (1GB RAM):**
  ```bash
  export PLAYWRIGHT_CONCURRENCY=1
  python3 -m backend.app.miners.worker
  ```
* **En Servidor Abeja o GPU:**
  ```bash
  export PLAYWRIGHT_CONCURRENCY=4
  python3 -m backend.app.miners.worker
  ```

### Paso 4.2: Lanzar el Minero Batch con Rate-Limiting
En otra terminal o sesión en segundo plano:
```bash
# Procesa lotes de 50 casos esperando 300 segundos (5 minutos) entre consultas:
python3 -m backend.app.miners.batch_miner --limit 50 --interval 300
```

> [!TIP]
> **Modo Simulación (Dry-Run):** Puedes verificar que las queries booleanas se formulen correctamente antes de consultar internet ejecutando:
> ```bash
> python3 -m backend.app.miners.batch_miner --limit 10 --interval 5 --dry-run
> ```

---

## 🚢 5. Despliegue de Servicios Docker (Opcional en Servidor)

Si deseas levantar todo el stack como contenedores Docker administrados en `abeja`:

```bash
# Levantar Backend API (puerto 8002) y Worker de Minería:
docker compose --profile backend --profile worker up -d

# Verificar salud del microservicio:
curl http://localhost:8002/api/v1/health
```
