#!/usr/bin/env python3
"""
dataset_builder.py: Extractor de ground truth NER para anonimización y entidades.
Compara 'repd_vp_cedulas_principal' (original) contra 'cedulas_anonimizadas' (anonimizada)
usando alineación determinista de anclas de texto para calcular los offsets exactos
(start, end, label, text) de cada entidad protegida.

IMPORTANTE: El output generado contiene datos personales sensibles (PII).
El archivo destino 'data/dataset_ner_personas.jsonl' está en .gitignore
y sólo debe transferirse por canales seguros autenticados (SSH / rsync).
"""

import os
import sys
import re
import json
from pathlib import Path
from collections import Counter
from datetime import date, datetime
from sqlalchemy import text
from app.database import engine

OUTPUT_DIR = Path("/app/data") if Path("/app").exists() else Path(__file__).resolve().parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "dataset_ner_personas.jsonl"
SUMMARY_FILE = OUTPUT_DIR / "dataset_summary.json"


def json_serializer(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def extract_entities_from_pair(orig: str, anon: str):
    """
    Alinea el texto original con el texto anonimizado mediante anclas exactas
    para identificar los spans y labels de cada entidad sensible protegida.
    """
    if not orig or not anon:
        return []

    parts = re.split(r'(\[[A-Z ]+\])', anon)
    entities = []
    curr_pos = 0
    i = 0

    while i < len(parts):
        token = parts[i]
        if token.startswith('[') and token.endswith(']'):
            tag_raw = token[1:-1].strip()
            tag_clean = tag_raw.replace(' PROTEGIDO', '').replace(' PROTEGIDA', '')
            next_anchor = parts[i + 1] if i + 1 < len(parts) else ''

            if next_anchor:
                idx = orig.find(next_anchor, curr_pos)
                if idx != -1:
                    matched_text = orig[curr_pos:idx]
                    if matched_text:
                        entities.append({
                            "start": curr_pos,
                            "end": idx,
                            "label": tag_clean,
                            "text": matched_text
                        })
                    curr_pos = idx + len(next_anchor)
                    i += 2
                    continue
                else:
                    anchor_words = next_anchor.strip().split()
                    sub_anchor = anchor_words[0] if anchor_words else ''
                    if sub_anchor and len(sub_anchor) >= 3:
                        idx = orig.find(sub_anchor, curr_pos)
                        if idx != -1:
                            matched_text = orig[curr_pos:idx]
                            if matched_text:
                                entities.append({
                                    "start": curr_pos,
                                    "end": idx,
                                    "label": tag_clean,
                                    "text": matched_text
                                })
                            curr_pos = idx + len(sub_anchor)
                            i += 2
                            continue
            else:
                matched_text = orig[curr_pos:]
                if matched_text:
                    entities.append({
                        "start": curr_pos,
                        "end": len(orig),
                        "label": tag_clean,
                        "text": matched_text
                    })
                break
        else:
            if token:
                idx = orig.find(token, curr_pos)
                if idx != -1:
                    curr_pos = idx + len(token)
            i += 1

    return entities


def build_dataset():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[INFO] Consultando registros alineados en la base de datos...", file=sys.stderr)
    query = text("""
        SELECT 
            o.id_cedula_busqueda,
            o.nombre_completo,
            o.edad_momento_desaparicion,
            o.sexo,
            o.municipio,
            o.fecha_desaparicion,
            o.descripcion_desaparicion AS orig_desc,
            a.descripcion_desaparicion AS anon_desc
        FROM repd_vp_cedulas_principal o
        JOIN cedulas_anonimizadas a ON o.id_cedula_busqueda = a.id_cedula_busqueda
        ORDER BY o.fecha_desaparicion DESC
    """)

    with engine.connect() as conn:
        rows = conn.execute(query).mappings().all()

    total_rows = len(rows)
    print(f"[INFO] Total de pares obtenidos: {total_rows}", file=sys.stderr)

    entity_counts = Counter()
    processed_count = 0

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f_out:
        for r in rows:
            orig = r["orig_desc"] or ""
            anon = r["anon_desc"] or ""
            entities = extract_entities_from_pair(orig, anon)

            for e in entities:
                entity_counts[e["label"]] += 1

            record = {
                "id": r["id_cedula_busqueda"],
                "metadata": {
                    "nombre": r["nombre_completo"],
                    "edad": r["edad_momento_desaparicion"],
                    "sexo": r["sexo"],
                    "municipio": r["municipio"],
                    "fecha_desaparicion": str(r["fecha_desaparicion"]) if r["fecha_desaparicion"] else None
                },
                "text_original": orig,
                "text_anonimizado": anon,
                "entities": entities
            }

            f_out.write(json.dumps(record, ensure_ascii=False, default=json_serializer) + "\n")
            processed_count += 1

    summary = {
        "total_records": processed_count,
        "entity_counts": dict(entity_counts),
        "total_entities_extracted": sum(entity_counts.values()),
        "output_file": str(OUTPUT_FILE)
    }

    with open(SUMMARY_FILE, "w", encoding="utf-8") as f_sum:
        json.dump(summary, f_sum, indent=2, ensure_ascii=False)

    print(f"[SUCCESS] Dataset guardado en: {OUTPUT_FILE}", file=sys.stderr)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    build_dataset()
