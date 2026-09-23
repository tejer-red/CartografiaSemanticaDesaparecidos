#!/usr/bin/env python3
"""
audit_pilot_with_local_llm.py: Auditoría del Primer Piloto de Grafo Ontológico
utilizando el LLM Local en GPU (Qwen2.5-Coder-14B / vLLM en localhost:8000).

Evalúa con rigor forense la validez semántica de los vínculos CASO <-> NOTICIA
creados por el minador de palabras clave en 'vinculos_entidades'.
"""

import os
import sys
import json
import time
import urllib.request
from typing import Dict, Any, List
from collections import Counter
from sqlalchemy import create_engine, text

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ.get("DB_USER", "postgres")
    pwd = os.environ.get("DB_PASSWORD", "")
    name = os.environ.get("DB_NAME", "cartografia_semantica_db")
    DB_URL = f"postgresql://{user}:{pwd}@{host}:{port}/{name}" if pwd else f"postgresql://{user}@{host}:{port}/{name}"

LLM_API_URL = os.environ.get("LLM_API_URL", "http://localhost:8000/v1/chat/completions")
MODEL_NAME = os.environ.get("MODEL_NAME", "qwen-coder")


def call_local_llm(prompt: str, system_prompt: str) -> Dict[str, Any]:
    """Envía la solicitud al servidor vLLM local y retorna la respuesta parseada como dict."""
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 400
    }
    
    req = urllib.request.Request(
        LLM_API_URL,
        headers={"Content-Type": "application/json"},
        data=json.dumps(payload).encode("utf-8")
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"].strip()
            
            # Limpiar posibles bloques markdown ```json ... ```
            if content.startswith("```"):
                lines = content.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
                
            return json.loads(content)
    except Exception as e:
        return {
            "clasificacion": "ERROR_PARSEO",
            "es_conexion_valida": False,
            "causa_raiz": "ERROR_INFERENCIA",
            "razonamiento": f"Fallo al invocar o parsear salida del LLM: {str(e)}",
            "score_relevancia_real": 0.0
        }


def run_audit(sample_size: int = 50):
    print("=" * 80)
    print("🔍 INICIANDO AUDITORÍA FORENSE CON LLM LOCAL (GPU RTX 5060 Ti)")
    print(f"Objetivo: Evaluar muestra de {sample_size} vínculos generados por el primer piloto")
    print(f"Base de datos: {DB_URL}")
    print(f"Modelo LLM: {MODEL_NAME} en {LLM_API_URL}")
    print("=" * 80)

    engine = create_engine(DB_URL)
    
    # Extraer muestra diversa de vínculos CASO - NOTICIA
    query = text("""
        SELECT DISTINCT ON (v.source_node)
            v.id as vinculo_id,
            v.source_node,
            v.target_node,
            v.confidence_score,
            v.metadata_relacion,
            c.id as caso_id,
            c.municipio as caso_municipio,
            c.colonia as caso_colonia,
            c.fecha_desaparicion as caso_fecha,
            c.nombre_real as caso_nombre,
            c.text_original as caso_texto,
            n.id as noticia_id,
            n.titular as noticia_titular,
            n.fecha as noticia_fecha,
            n.cuerpo_texto as noticia_cuerpo,
            n.query_origen as noticia_query,
            n.url as noticia_url
        FROM vinculos_entidades v
        JOIN cedulas_privadas c ON c.id = SUBSTRING(v.source_node FROM 6)
        JOIN noticias n ON n.id = CAST(SUBSTRING(v.target_node FROM 9) AS INTEGER)
        WHERE v.relation_type = 'MENCIONADO_EN_NOTICIA'
          AND v.source_type = 'CASO'
        ORDER BY v.source_node, v.id DESC
        LIMIT :limit
    """)

    with engine.connect() as conn:
        rows = conn.execute(query, {"limit": sample_size}).fetchall()

    total_records = len(rows)
    print(f"[*] Registros extraídos para auditoría: {total_records}\n")

    system_prompt = """Eres un Auditor Forense, Penal y de Ciencia de Datos especializado en análisis de desaparición forzada y minería OSINT en México.
Tu tarea es auditar un vínculo establecido automáticamente entre un CASO DE DESAPARICIÓN y una NOTA PERIODÍSTICA.

Debes determinar con honestidad y rigor analítico si la noticia realmente tiene relación con el caso, o si se trata de un falso positivo forzado por coincidencia superficial de palabras clave (ej: homonimia de colonias como 'Constitución', eventos cívicos, homicidios aislados no vinculados, desfase de años o lugares lejanos).

Responde EXCLUSIVAMENTE con un objeto JSON válido con estas claves:
{
  "clasificacion": "GENUINO_CORRELACIONADO" | "PLAUSIBLE_ZONA_O_FOSA" | "FORZADO_FALSO_POSITIVO" | "TOTALMENTE_ERRONEO",
  "es_conexion_valida": true | false,
  "causa_raiz": "COINCIDENCIA_LEGITIMA" | "HOMONIMIA_GEOGRAFICA" | "EVENTO_CRIMINAL_DISCONEXO" | "NOTA_CIVICA_O_IRRELEVANTE" | "DESFASE_TEMPORAL_INCOMPATIBLE" | "OTRA_CIUDAD_O_ESTADO",
  "razonamiento": "Explicación breve y concisa de 2-3 oraciones del porqué.",
  "score_relevancia_real": 0.0 a 1.0 (número flotante objetivo)
}"""

    results = []
    clasificaciones = Counter()
    causas_raiz = Counter()
    scores_originales = []
    scores_reales = []

    for idx, r in enumerate(rows, 1):
        v_id = r[0]
        s_node = r[1]
        t_node = r[2]
        orig_score = float(r[3])
        meta_rel = r[4] or {}
        
        c_mpio = r[6] or "Desconocido"
        c_col = r[7] or "Desconocida"
        c_fecha = r[8] or "Desconocida"
        c_nombre = r[9] or "Anonimizado"
        c_desc = (r[10] or "")[:800]
        
        n_titular = r[12] or "Sin título"
        n_fecha = str(r[13]) if r[13] else "Desconocida"
        n_cuerpo = (r[14] or "")[:900]
        n_query = r[15] or "Sin query"
        n_url = r[16] or ""

        prompt_user = f"""AUDITA LA SIGUIENTE CONEXIÓN ONTOLÓGICA:

[EXPEDIENTE DE DESAPARICIÓN]
- ID Caso: {s_node}
- Persona: {c_nombre}
- Fecha Desaparición: {c_fecha}
- Municipio: {c_mpio}
- Colonia registrada: {c_col}
- Narrativa de los hechos: {c_desc}

[NOTICIA PERIODÍSTICA ASOCIADA]
- ID Noticia: {t_node}
- Titular: {n_titular}
- Fecha Noticia: {n_fecha}
- Query con la que se minó: {n_query}
- URL: {n_url}
- Contenido / Extracto: {n_cuerpo}

[EVALUACIÓN AUTOMÁTICA PREVIA]
- Score asignado por el script: {orig_score}
- Razones registradas: {json.dumps(meta_rel.get('coincidencias', []), ensure_ascii=False)}

¿Es este vínculo una correlación fáctica o contextual válida, o es un falso positivo forzado? Analiza críticamente."""

        print(f"[{idx}/{total_records}] Evaluando {s_node} <--> {t_node}...")
        t0 = time.time()
        audit_res = call_local_llm(prompt_user, system_prompt)
        dt = time.time() - t0

        audit_res["vinculo_id"] = v_id
        audit_res["source_node"] = s_node
        audit_res["target_node"] = t_node
        audit_res["score_original"] = orig_score
        audit_res["titular"] = n_titular
        audit_res["caso_lugar"] = f"{c_col}, {c_mpio}"
        audit_res["caso_fecha"] = c_fecha
        audit_res["noticia_fecha"] = n_fecha
        
        clasif = audit_res.get("clasificacion", "ERROR")
        causa = audit_res.get("causa_raiz", "DESCONOCIDA")
        real_score = float(audit_res.get("score_relevancia_real", 0.0))

        clasificaciones[clasif] += 1
        causas_raiz[causa] += 1
        scores_originales.append(orig_score)
        scores_reales.append(real_score)

        results.append(audit_res)

        print(f"   -> Clasificación: {clasif} | Causa: {causa} | Score Real: {real_score:.2f} (Orig: {orig_score:.2f}) [{dt:.2f}s]")
        print(f"   -> Razón: {audit_res.get('razonamiento', '')[:140]}...\n")

    # Guardar resultados en archivo
    out_dir = "/home/abundis/temporal-ner-ontologia/backend/data"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "auditoria_piloto_llm.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_auditados": total_records,
            "resumen_clasificaciones": dict(clasificaciones),
            "resumen_causas_raiz": dict(causas_raiz),
            "promedio_score_original": sum(scores_originales) / max(len(scores_originales), 1),
            "promedio_score_real": sum(scores_reales) / max(len(scores_reales), 1),
            "detalles": results
        }, f, indent=2, ensure_ascii=False)

    print("=" * 80)
    print("📊 RESUMEN EJECUTIVO DE LA AUDITORÍA")
    print("=" * 80)
    print(f"Total Vínculos Auditados: {total_records}")
    print(f"Promedio Score Original del Minador: {sum(scores_originales)/len(scores_originales):.2f}")
    print(f"Promedio Score Real (Validado por LLM): {sum(scores_reales)/len(scores_reales):.2f}")
    print("\n[CLASIFICACIONES]:")
    for k, v in clasificaciones.most_common():
        pct = (v / total_records) * 100
        print(f"  - {k}: {v} ({pct:.1f}%)")

    print("\n[CAUSAS RAÍZ DETECTADAS]:")
    for k, v in causas_raiz.most_common():
        pct = (v / total_records) * 100
        print(f"  - {k}: {v} ({pct:.1f}%)")

    print(f"\n[+] Resultados completos exportados a: {out_path}")
    print("=" * 80)


if __name__ == "__main__":
    n = 50
    if len(sys.argv) > 1:
        try:
            n = int(sys.argv[1])
        except ValueError:
            pass
    run_audit(n)
