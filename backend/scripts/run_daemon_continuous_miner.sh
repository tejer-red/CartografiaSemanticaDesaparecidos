#!/usr/bin/env bash
# run_daemon_continuous_miner.sh: Orquestador continuo desatendido de minería OSINT con rate limits seguros
# Procesa lotes secuenciales de cédulas históricas preservando el estado en SQLite/PostgreSQL.

PROJECT_DIR="/home/abundis/temporal-ner-ontologia"
PYTHON_BIN="/home/abundis/miniconda3/envs/ner-cartografia/bin/python"
LOG_FILE="$PROJECT_DIR/reports/mining/continuous_daemon.log"

mkdir -p "$PROJECT_DIR/reports/mining"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando Demonio Continuo de Minería OSINT..." >> "$LOG_FILE"

BATCH_SIZE=25
DELAY_MIN=8
DELAY_MAX=15

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ejecutando lote de $BATCH_SIZE casos..." >> "$LOG_FILE"
    $PYTHON_BIN "$PROJECT_DIR/backend/scripts/run_news_miner_batch.py" \
        --limit $BATCH_SIZE \
        --min-delay $DELAY_MIN \
        --max-delay $DELAY_MAX >> "$LOG_FILE" 2>&1
    
    # Pausa de cortesía entre ciclos de lotes (30 a 60 segundos)
    SLEEP_CYCLE=$((30 + RANDOM % 30))
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Fin de lote. Esperando ciclo de cortesía ($SLEEP_CYCLE segs)..." >> "$LOG_FILE"
    sleep $SLEEP_CYCLE
done
