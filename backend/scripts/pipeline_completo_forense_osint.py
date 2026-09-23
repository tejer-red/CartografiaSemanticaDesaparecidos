#!/usr/bin/env python3
"""
pipeline_completo_forense_osint.py: Pipeline integral de procesamiento:
Fase A: Extracción forense multihilo de patrones, albergues, anexos e indicios (5,542 cédulas).
Fase B: Minado de noticias OSINT 2.0 controlado con Gatekeeper Neuronal.
"""

import sys
import os
import time
import subprocess
from datetime import datetime

PYTHON_BIN = "/home/abundis/miniconda3/envs/ner-cartografia/bin/python"
WORKSPACE_DIR = "/home/abundis/temporal-ner-ontologia"

def log(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

def run_extraction_all():
    log("================================================================================")
    log("🚀 [FASE A] INICIANDO EXTRACCIÓN FORENSE MULTIHILO (6 WORKERS)")
    log("================================================================================")
    cmd = [PYTHON_BIN, "backend/scripts/extract_case_forensic_patterns.py", "5600", "6"]
    ret = subprocess.run(cmd, cwd=WORKSPACE_DIR)
    if ret.returncode != 0:
        log(f"⚠️ Extracción finalizó con código {ret.returncode}.")
    else:
        log("✅ [FASE A] Extracción forense completada con éxito.")

def run_osint_miner():
    log("================================================================================")
    log("📰 [FASE B] INICIANDO MINADO DE NOTICIAS OSINT 2.0 CON GATEKEEPER NEURONAL")
    log("================================================================================")
    cmd = [PYTHON_BIN, "backend/scripts/miner_osint_v2.py", "60"]
    ret = subprocess.run(cmd, cwd=WORKSPACE_DIR)
    if ret.returncode != 0:
        log(f"⚠️ Minero OSINT finalizó con código {ret.returncode}.")
    else:
        log("✅ [FASE B] Minado OSINT completado con éxito.")

if __name__ == "__main__":
    log("Iniciando pipeline de ejecución integral...")
    t0 = time.time()
    run_extraction_all()
    run_osint_miner()
    total_time = time.time() - t0
    log(f"🏁 Pipeline completado en {total_time/60:.2f} minutos.")
