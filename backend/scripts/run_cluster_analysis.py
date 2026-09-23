#!/usr/bin/env python3
"""
run_cluster_analysis.py: Ejecuta la detección y correlación forense con vLLM
sobre los clusters más densos de casos con coincidencia por domicilio hash,
municipio y fechas coincidentes, guardando las aristas en `vinculos_entidades`.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import json
from backend.app.database import SessionLocal
from backend.app.models import Caso, VinculoEntidad
from backend.app.ontology.cluster_correlator import ClusterCorrelator

def main():
    print("=" * 65)
    print("🧠 ANÁLISIS DE CLUSTERS Y CORRELACIÓN DE CASOS CON vLLM")
    print("=" * 65)

    db = SessionLocal()
    correlator = ClusterCorrelator()

    # 1. Obtener clusters con coincidencia de Domicilio Hash exacto (> 1 caso)
    print("[INFO] Identificando clusters por DOMICILIO_HASH y Fecha...")
    query_doms = """
        WITH extract_doms AS (
            SELECT id_cedula_busqueda, municipio, fecha_desaparicion, descripcion_desaparicion,
                   regexp_matches(descripcion_desaparicion, '\\[DOMICILIO_HASH_([a-f0-9]{8})\\]', 'g') AS dom_hash
            FROM cedulas_anonimizadas
        )
        SELECT dom_hash[1] AS hash_val, count(DISTINCT id_cedula_busqueda) as total_casos,
               array_agg(DISTINCT id_cedula_busqueda) as casos,
               array_agg(DISTINCT municipio) as municipios,
               array_agg(DISTINCT fecha_desaparicion) as fechas
        FROM extract_doms
        GROUP BY dom_hash[1]
        HAVING count(DISTINCT id_cedula_busqueda) >= 3
        ORDER BY total_casos DESC
        LIMIT 15;
    """
    
    clusters = db.execute(db.bind.text(query_doms)).fetchall() if hasattr(db.bind, 'text') else []
    if not clusters:
        from sqlalchemy import text
        clusters = db.execute(text(query_doms)).fetchall()

    print(f"[INFO] Se encontraron {len(clusters)} clusters densos de domicilio compartido.")

    total_edges_saved = 0

    for idx, cl in enumerate(clusters, 1):
        dom_hash, num_casos, caso_ids, municipios, fechas = cl
        print(f"\n--- Analizando Cluster #{idx} | Domicilio Hash: {dom_hash} ({num_casos} casos) ---")
        print(f"    Municipios: {municipios} | Fechas: {fechas}")

        # Obtener textos anonimizados
        from sqlalchemy import text
        placeholders = ",".join(f"'{cid}'" for cid in caso_ids)
        cases_data = db.execute(text(f"""
            SELECT id_cedula_busqueda, municipio, fecha_desaparicion, descripcion_desaparicion
            FROM cedulas_anonimizadas
            WHERE id_cedula_busqueda IN ({placeholders});
        """)).fetchall()

        cluster_cases = [
            {"id": r[0], "municipio": r[1], "fecha": r[2], "texto": r[3]}
            for r in cases_data
        ]

        # Consultar al LLM local
        print("    Consultando vLLM local (Qwen2.5-Coder / architect)...")
        analysis = correlator.analyze_cluster_with_llm(cluster_cases)

        if analysis.get("evento_compartido"):
            conf = analysis.get("confianza", 0.9)
            tipo_rel = analysis.get("tipo_relacion", "EVENTO_COMPARTIDO")
            just = analysis.get("justificacion", "")
            print(f"    ✅ VÍNCULO DETECTADO POR LLM: {tipo_rel} (Confianza: {conf})")
            print(f"    💡 Justificación: {just[:120]}...")

            # Insertar aristas en vinculos_entidades
            for edge in analysis.get("aristas_sugeridas", []):
                src = edge.get("source")
                tgt = edge.get("target")
                rel = edge.get("relacion", "VINCULADO_A")
                if src and tgt and src != tgt:
                    ve = VinculoEntidad(
                        source_node=f"CASO_{src}",
                        source_type="CASO",
                        target_node=f"CASO_{tgt}",
                        target_type="CASO",
                        relation_type=rel,
                        confidence_score=conf,
                        estado_aprobacion="APROBADO" if conf >= 0.85 else "SUGERIDO",
                        metadata_relacion={
                            "domicilio_hash": dom_hash,
                            "tipo_evento": tipo_rel,
                            "justificacion_llm": just
                        }
                    )
                    db.add(ve)
                    total_edges_saved += 1
            db.commit()
        else:
            print("    ℹ️ El LLM determinó que no comparten un hecho directo (solo coincidencia de calle).")

    print("\n" + "=" * 65)
    print(f"🎉 ANÁLISIS CONCLUIDO: {total_edges_saved} aristas relacionales guardadas en vinculos_entidades")
    print("=" * 65)
    db.close()

if __name__ == "__main__":
    main()
