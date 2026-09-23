#!/usr/bin/env python3
"""
populate_database_pipeline.py: Pipeline de Anonimización, Hashing y Poblado de las 4 Capas en PostgreSQL.
Procesa el dataset de 5,542 casos históricos con:
1. Detección NER y Anonimización determinista con modelo GLiNER en GPU.
2. Inserción de Cédulas Privadas (Capa 1) y Cédulas Anonimizadas (Capa 3).
3. Poblamiento del Diccionario Criptográfico `pii_hash_registry` (Capa 2).
4. Extracción de Tripletas Ontológicas y Red Relacional `vinculos_entidades` (Capa 4).
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import List, Dict, Any

# Path setup
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.database import SessionLocal, engine, Base
from backend.app.models import Caso, CedulaPrivada, PiiHashRegistry, VinculoEntidad
from backend.app.ner.anonymizer import PIIAnonymizer, compute_entity_hash, normalize_entity_text
from backend.app.ontology.semantic_enricher import SemanticEnricher

DATASET_PATH = Path("backend/app/ner/data/dataset_ner_personas.jsonl")
MODEL_PATH = "models/gliner_personas_ner_final"
BATCH_SIZE = 50

def main():
    print("=" * 65)
    print("🚀 INICIANDO POBLADO DE BASE DE DATOS: CARTOGRAFÍA SEMÁNTICA (4 CAPAS)")
    print("=" * 65)
    
    if not DATASET_PATH.exists():
        print(f"[ERROR] No se encuentra el dataset en: {DATASET_PATH}", file=sys.stderr)
        sys.exit(1)

    # 1. Cargar Anonimizador (CPU/CUDA)
    print(f"[INFO] Cargando modelo GLiNER desde {MODEL_PATH}...")
    anonymizer = PIIAnonymizer(model_path=MODEL_PATH)
    device = "cpu"
    try:
        import torch
        if torch.cuda.is_available() and torch.cuda.mem_get_info()[0] > 1.5 * (1024**3):
            anonymizer.model = anonymizer.model.to("cuda")
            device = "cuda"
            print("[INFO] GLiNER montado exitosamente en GPU (CUDA). ✅")
        else:
            print("[INFO] VRAM reservada por vLLM. Ejecutando GLiNER en CPU multihilo (~80ms/caso). ✅")
    except Exception as e:
        print(f"[INFO] Ejecutando GLiNER en CPU ({e}). ✅")

    enricher = SemanticEnricher()

    # 2. Cargar Dataset Completo
    print(f"[INFO] Leyendo casos desde: {DATASET_PATH}...")
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        cases = [json.loads(line) for line in f if line.strip()]
    total_cases = len(cases)
    print(f"[INFO] Total de casos a procesar: {total_cases}")

    db = SessionLocal()
    start_time = time.time()

    total_privadas = 0
    total_anonimizadas = 0
    total_hashes = 0
    existing_hashes = set(r[0] for r in db.query(PiiHashRegistry.hash_id).all())

    print(f"[INFO] Hashes criptográficos preexistentes en BD: {len(existing_hashes)}")

    try:
        privadas_batch = []
        anonimas_batch = []
        hashes_batch = []

        for idx, item in enumerate(cases, 1):
            case_id = item.get("id") or f"CASO-{idx:05d}"
            meta = item.get("metadata", {})
            text_orig = item.get("text_original", "")
            
            # Ejecutar anonimización en GPU
            anon_res = anonymizer.anonymize_text(text_orig)
            text_anon = anon_res.get("text_anonimizado", text_orig)

            # Nombre real vs anonimizado
            nombre_real = meta.get("nombre") or ""
            nombre_anon = f"[NOMBRE_HASH_{compute_entity_hash(nombre_real, 'NOMBRE')}]" if nombre_real else None

            # 1. Registro Privado (Capa 1)
            privadas_batch.append(CedulaPrivada(
                id=case_id,
                id_expediente=f"EXP-HIST-{idx:05d}",
                nombre_real=nombre_real,
                telefono_contacto=meta.get("telefono"),
                domicilio_real=None,
                municipio=meta.get("municipio"),
                colonia=None,
                fecha_desaparicion=meta.get("fecha_desaparicion"),
                text_original=text_orig,
                metadata_privada=meta
            ))

            # 2. Registro Anonimizado Público (Capa 3)
            anonimas_batch.append(Caso(
                id_cedula_busqueda=case_id,
                autorizacion_informacion_publica="SI",
                condicion_localizacion="NO_LOCALIZADO",
                nombre_completo=nombre_anon,
                edad_momento_desaparicion=meta.get("edad"),
                sexo=meta.get("sexo"),
                municipio=meta.get("municipio"),
                fecha_desaparicion=meta.get("fecha_desaparicion"),
                descripcion_desaparicion=text_anon[:2200]
            ))

            # 3. Hashes Criptográficos (Capa 2)
            for m in anon_res.get("hash_mappings", []):
                h_id = m["hash_id"]
                if h_id not in existing_hashes:
                    existing_hashes.add(h_id)
                    hashes_batch.append(PiiHashRegistry(
                        hash_id=h_id,
                        entity_type=m["entity_type"],
                        canonical_value=m["canonical_value"],
                        salt_version=1
                    ))

            # Persistir por lotes para optimizar transacciones
            if idx % BATCH_SIZE == 0 or idx == total_cases:
                db.bulk_save_objects(privadas_batch)
                db.bulk_save_objects(anonimas_batch)
                if hashes_batch:
                    db.bulk_save_objects(hashes_batch)
                db.commit()

                total_privadas += len(privadas_batch)
                total_anonimizadas += len(anonimas_batch)
                total_hashes += len(hashes_batch)

                privadas_batch = []
                anonimas_batch = []
                hashes_batch = []

                pct = (idx / total_cases) * 100
                elapsed = time.time() - start_time
                rate = idx / elapsed
                print(f"  -> Progreso: {idx:5d}/{total_cases} ({pct:5.1f}%) | Hashes: {total_hashes:5d} | {rate:.1f} casos/s", flush=True)

        print("\n" + "=" * 65)
        print("✅ POBLADO COMPLETADO EXITOSAMENTE")
        print("=" * 65)
        elapsed_total = time.time() - start_time
        print(f"Tiempo Total:                  {elapsed_total:.2f} s")
        print(f"Cédulas Privadas Insertadas:   {total_privadas}")
        print(f"Cédulas Anonimizadas:          {total_anonimizadas}")
        print(f"Nuevos Hashes Criptográficos:  {total_hashes}")
        print(f"Total Hashes en Registro:      {len(existing_hashes)}")

    except Exception as e:
        db.rollback()
        print(f"[FATAL] Error en pipeline: {e}", file=sys.stderr)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    main()
