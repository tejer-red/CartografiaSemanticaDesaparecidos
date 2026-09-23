#!/usr/bin/env python3
"""
benchmark_ontology_300.py: Ejecución y Benchmark de Enriquecimiento Ontológico
con vLLM en RTX 5060 Ti sobre 300 casos aleatorios con concurrencia asíncrona (Continuous Batching).
"""

import os
import sys
import json
import time
import random
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from backend.app.ontology.semantic_enricher import SemanticEnricher

DATASET_PATH = Path("backend/app/ner/data/dataset_ner_personas.jsonl")
NUM_CASES = 300
WORKERS = 8  # Concurrencia óptima para continuous batching en vLLM (RTX 5060 Ti)

def process_single_case(enricher, case_idx, case_data):
    case_id = case_data.get("id_cedula_busqueda") or f"CASO-{case_idx:04d}"
    text = case_data.get("text_original", "")
    t0 = time.time()
    triplets = enricher.generate_graph_triplets(case_id, text)
    latency = time.time() - t0
    return {
        "case_id": case_id,
        "triplets": triplets,
        "latency": latency,
        "text": text
    }

def main():
    print("=" * 65)
    print("🚀 BENCHMARK: ENRIQUECIMIENTO ONTOLÓGICO CON vLLM (RTX 5060 Ti)")
    print("=" * 65)
    
    if not DATASET_PATH.exists():
        print(f"[ERROR] No se encuentra el dataset en: {DATASET_PATH}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Leyendo dataset desde: {DATASET_PATH}...")
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        all_cases = [json.loads(line) for line in f if line.strip()]

    print(f"[INFO] Total casos disponibles: {len(all_cases)}")
    random.seed(42)
    sample = random.sample(all_cases, min(NUM_CASES, len(all_cases)))
    print(f"[INFO] Muestra seleccionada: {len(sample)} casos aleatorios")
    print(f"[INFO] Concurrencia de peticiones a vLLM: {WORKERS} hilos")

    enricher = SemanticEnricher()
    start_all = time.time()
    
    results = []
    completed = 0
    total_triplets = 0
    triplets_by_type = {}
    ambiguous_count = 0
    unique_target_nodes = set()

    print(f"\n[EN CURSO] Procesando {len(sample)} casos contra vLLM local...")
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(process_single_case, enricher, i, c): i for i, c in enumerate(sample)}
        for fut in as_completed(futures):
            res = fut.result()
            completed += 1
            results.append(res)
            trips = res["triplets"]
            total_triplets += len(trips)
            
            for t in trips:
                ttype = t["target_type"]
                triplets_by_type[ttype] = triplets_by_type.get(ttype, 0) + 1
                unique_target_nodes.add(t["target_node"])
                if t.get("metadata_relacion", {}).get("es_ambiguo"):
                    ambiguous_count += 1
            
            if completed % 25 == 0 or completed == len(sample):
                print(f"  -> Progreso: {completed:3d}/{len(sample)} casos procesados ({completed/len(sample)*100:5.1f}%) | Aristas generadas: {total_triplets}")

    elapsed = time.time() - start_all
    avg_latency = sum(r["latency"] for r in results) / len(results) if results else 0

    print("\n" + "=" * 65)
    print("📊 RESULTADOS DEL BENCHMARK ONTOLÓGICO (300 CASOS)")
    print("=" * 65)
    print(f"Tiempo Total Transcurrido: {elapsed:.2f} s")
    print(f"Throughput de Inferencia:  {len(sample)/elapsed:.2f} casos / segundo")
    print(f"Latencia Promedio por Caso:{avg_latency:.2f} s (Continuous Batching)")
    print(f"Total Aristas Relacionales: {total_triplets} vínculos de grafo")
    print(f"Promedio Aristas por Caso:  {total_triplets/len(sample):.1f} relaciones / caso")
    print(f"Nodos Únicos en el Grafo:   {len(unique_target_nodes)} nodos")
    print(f"Entidades Ambiguas Desambiguadas por Contexto: {ambiguous_count}")
    
    print("\nDesglose de Aristas del Grafo por Categoría:")
    for ttype, count in sorted(triplets_by_type.items(), key=lambda x: -x[1]):
        print(f"  - {ttype:22}: {count:4d} aristas")

    # Muestra de 2 casos enriquecidos
    print("\n" + "=" * 65)
    print("🔍 CASOS DE EJEMPLO DE LA RED RELACIONAL CONSTRUIDA:")
    print("=" * 65)
    for i, r in enumerate(results[:2], 1):
        print(f"\n--- Ejemplo {i} ({r['case_id']}) ---")
        print(f"Texto: {r['text'][:140]}...")
        print("Vínculos Semánticos:")
        for t in r["triplets"]:
            print(f"  └─ ({t['relation_type']}) ➔ {t['target_node']} [{t['target_type']}]")
            print(f"     Score: {t['confidence_score']} | Info: {t['metadata_relacion']}")

if __name__ == "__main__":
    main()
