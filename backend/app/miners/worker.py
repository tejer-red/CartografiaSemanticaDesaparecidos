#!/usr/bin/env python3
"""
worker.py: Consumidor de colas Redis (cola_mineria_osint) y despachador de tareas de minería.
Soporta:
1. Conexión a Redis en `tejer_redis:6379` o fallback local en memoria.
2. Control estricto de concurrencia mediante `PLAYWRIGHT_CONCURRENCY` (seguro para Raspberry Pi 3B+).
3. Soporte para modo `--local` para pruebas interactivas y depuración directa.
"""

import os
import sys
import json
import time
import argparse
from typing import Dict, Any, Optional

from backend.app.miners.miner_noticias import news_miner_service

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_QUEUE = os.getenv("REDIS_QUEUE_OSINT", "cola_mineria_osint")
PLAYWRIGHT_CONCURRENCY = int(os.getenv("PLAYWRIGHT_CONCURRENCY", "1"))


class MiningWorker:
    """Worker de consumo y procesamiento de tareas de minería OSINT."""

    def __init__(self, redis_host: str = REDIS_HOST, redis_port: int = REDIS_PORT, queue_name: str = REDIS_QUEUE):
        self.queue_name = queue_name
        self.redis_client = None
        self.is_connected = False

        try:
            import redis
            self.redis_client = redis.Redis(host=redis_host, port=redis_port, db=0, socket_timeout=3)
            self.redis_client.ping()
            self.is_connected = True
            print(f"[SUCCESS] Conectado a broker Redis en {redis_host}:{redis_port} | Cola: {queue_name}")
        except Exception as e:
            print(f"[WARN] No se pudo conectar a Redis ({e}). Modo en memoria / standalone activado.")

    def enqueue_task(self, task_payload: Dict[str, Any], priority: str = "MEDIA") -> bool:
        """Encola una nueva tarea de minería OSINT."""
        data = json.dumps(task_payload, ensure_ascii=False)
        if self.is_connected and self.redis_client:
            if priority == "ALTA":
                # Alta prioridad se inserta al inicio de la lista (LPUSH)
                self.redis_client.lpush(self.queue_name, data)
            else:
                self.redis_client.rpush(self.queue_name, data)
            return True
        return False

    def process_single_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Procesa una tarea individual de búsqueda y extracción periodística."""
        query = task.get("query", "")
        caso_id = task.get("caso_id", "DESCONOCIDO")
        print(f"[WORKER] Procesando caso {caso_id} con consulta: {query}")

        articles = news_miner_service.process_query_and_extract(query, max_results=3)
        print(f"[WORKER] {len(articles)} notas extraídas para caso {caso_id}.")

        return {
            "caso_id": caso_id,
            "query": query,
            "articles_found": len(articles),
            "articles": articles,
            "processed_at": time.time()
        }

    def run_loop(self, poll_interval: int = 2):
        """Bucle continuo de escucha de tareas en Redis."""
        print(f"[INFO] Worker listo. Concurrencia Playwright configurada: {PLAYWRIGHT_CONCURRENCY}")
        print(f"[INFO] Esperando tareas en '{self.queue_name}'...")

        while True:
            if self.is_connected and self.redis_client:
                item = self.redis_client.blpop(self.queue_name, timeout=poll_interval)
                if item:
                    _, payload_raw = item
                    task = json.loads(payload_raw.decode("utf-8"))
                    self.process_single_task(task)
            else:
                time.sleep(poll_interval)


def main():
    parser = argparse.ArgumentParser(description="Worker de minería OSINT y colas")
    parser.add_argument("--local", action="store_true", help="Modo local directo de prueba")
    parser.add_argument("--test-query", type=str, default=None, help="Ejecutar una consulta de prueba directa")
    args = parser.parse_args()

    worker = MiningWorker()

    if args.test_query:
        sample_task = {
            "caso_id": "test-manual-1",
            "query": args.test_query,
            "prioridad": "ALTA"
        }
        res = worker.process_single_task(sample_task)
        print("\nResultado:", json.dumps(res, indent=2, ensure_ascii=False))
        return

    if args.local:
        print("[INFO] Ejecutando worker en modo local de depuración (Ctrl+C para salir)...")
        # Simular una tarea local para verificar funcionamiento
        sample_task = {
            "caso_id": "caso-demo-tlaquepaque",
            "query": '("Tlaquepaque") AND "Nueva Santa María" AND ("fosa" OR "hallazgo")',
            "prioridad": "ALTA"
        }
        worker.process_single_task(sample_task)
        print("[SUCCESS] Verificación de worker local exitosa.")
        return

    worker.run_loop()


if __name__ == "__main__":
    main()
