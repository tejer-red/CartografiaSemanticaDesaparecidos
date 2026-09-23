#!/usr/bin/env python3
"""
batch_miner.py: Script batch con rate-limiting para minería controlada del histórico (5,542 casos).
Garantiza que no se colapsen las IPs de búsqueda ni el metabuscador SearXNG.
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path

# Asegurar que el root del proyecto esté en sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.ner.extractor import EntityExtractor
from backend.app.miners.query_generator import OSINTQueryGenerator
from backend.app.miners.worker import MiningWorker

DATASET_FILE = Path(__file__).resolve().parent.parent / "ner" / "data" / "train.jsonl"
if not DATASET_FILE.exists():
    DATASET_FILE = Path(__file__).resolve().parent.parent.parent.parent / "dataset_ner_personas.jsonl"


def run_batch_miner(limit: int = 10, interval: int = 300, dry_run: bool = False):
    """
    Lee casos históricos, genera consultas OSINT y las procesa respetando el intervalo de rate-limiting.
    """
    if not DATASET_FILE.exists():
        print(f"[ERROR] No se encuentra el dataset en: {DATASET_FILE}", file=sys.stderr)
        return

    print(f"\n=======================================================")
    print(f"⛏️  INICIANDO MINERÍA BATCH DEL HISTÓRICO CON RATE-LIMIT")
    print(f"=======================================================")
    print(f"Límite de Casos: {limit} | Intervalo entre casos: {interval}s")
    print(f"Modo Dry-Run: {dry_run}")

    worker = MiningWorker()
    processed_count = 0

    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            if processed_count >= limit:
                break
            if not line.strip():
                continue

            record = json.loads(line)
            structured = EntityExtractor.extract_structured_case(record)
            queries = OSINTQueryGenerator.generate_queries_for_case(structured)

            if not queries:
                continue

            target_query = queries[0]  # Tomar la query de Nivel 1 (Mayor precisión)
            caso_id = record.get("id", f"caso_{idx}")

            print(f"\n[{processed_count + 1}/{limit}] Caso: {caso_id} (Municipio: {structured.get('municipio')})")
            print(f"  Consulta: {target_query['query']}")

            if dry_run:
                print("  [DRY-RUN] Simulación de consulta sin envío de red.")
            else:
                task = {
                    "caso_id": caso_id,
                    "query": target_query["query"],
                    "municipio": structured.get("municipio"),
                    "prioridad": "BAJA"
                }
                worker.process_single_task(task)

            processed_count += 1

            if processed_count < limit:
                print(f"  ⏳ Esperando {interval} segundos de cortesía (Rate-Limiting)...")
                time.sleep(min(interval, 5 if dry_run else interval))

    print(f"\n[SUCCESS] Lote de {processed_count} casos procesado exitosamente.")


def main():
    parser = argparse.ArgumentParser(description="Procesador Batch de Minería OSINT con Rate-Limiting")
    parser.add_argument("--limit", type=int, default=5, help="Número máximo de casos a procesar en esta corrida")
    parser.add_argument("--interval", type=int, default=300, help="Segundos de espera entre cada caso (default: 300s = 5m)")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin realizar requests HTTP reales")
    args = parser.parse_args()

    run_batch_miner(limit=args.limit, interval=args.interval, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
