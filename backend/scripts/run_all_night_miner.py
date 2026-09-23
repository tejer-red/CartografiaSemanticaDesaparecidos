#!/usr/bin/env python3
"""
run_all_night_miner.py: Pipeline nocturno desatendido de minería OSINT y correlación de prensa.
Procesa el universo de fichas históricas de forma secuencial:
  - Orden: De las más recientes (2024) a las más antiguas (DESC NULLS LAST).
  - Anti-duplicados: Excluye automáticamente casos ya vinculados o evaluados.
  - Rate Limiting Conservador: Jitter dinámico de 8 a 14 segundos entre casos.
  - Persistencia: Ingesta directa en PostgreSQL central ('abeja': cartografia_semantica_db).
"""

import os
import sys
import re
import time
import random
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, text
from backend.app.miners.miner_noticias import news_miner_service
from backend.app.miners.query_generator import OSINTQueryGenerator

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://tejer_Admin:T3jeEr!-!s@192.168.1.64:5432/cartografia_semantica_db")
LOG_DIR = PROJECT_ROOT / "reports" / "mining"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "night_miner.log"


def log_msg(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
            f.flush()
    except Exception:
        pass


def extract_colonia_from_text(text_content: str) -> Optional[str]:
    """Extrae el nombre de la colonia a partir de la narrativa textual."""
    match = re.search(
        r'(?:COLONIA|COL\.?|FRACCIONAMIENTO|FRACC\.?|BARRIO)\s+([A-ZÁÉÍÓÚÑ0-9\s]+?)(?:,|\.|\s+EN\s+|\s+MUNICIPIO|\s+JALISCO|$)',
        text_content.upper()
    )
    if match:
        col = match.group(1).strip()
        col = re.sub(r'\s+(CP|C\.P\.|SECCION|SECCIÓN).*', '', col).strip()
        if len(col) >= 3:
            return col
    return None


def fetch_next_unmined_cases(engine, batch_size: int = 20) -> List[Dict[str, Any]]:
    """
    Obtiene el siguiente lote de casos aún no evaluados, ordenados de más nuevos a más viejos.
    """
    sql = text("""
        SELECT p.id, p.municipio, p.fecha_desaparicion, p.text_original,
               (SELECT string_agg(h.canonical_value, '||') 
                FROM pii_hash_registry h 
                WHERE p.text_original ILIKE '%' || h.canonical_value || '%' 
                  AND h.entity_type = 'DOMICILIO' 
                  AND length(h.canonical_value) > 4) as domicilios_str
        FROM cedulas_privadas p
        WHERE p.municipio IS NOT NULL 
          AND p.municipio NOT IN ('SE IGNORA', '')
          AND p.text_original ILIKE '%COLONIA%'
          AND NOT EXISTS (
              SELECT 1 FROM vinculos_entidades v 
              WHERE v.source_node = 'CASO_' || p.id 
                AND v.relation_type IN ('MENCIONADO_EN_NOTICIA', 'REVISADO_SIN_NOTICIA')
          )
        ORDER BY p.fecha_desaparicion DESC NULLS LAST
        LIMIT :batch_size
    """)
    for intento in range(3):
        try:
            with engine.connect() as conn:
                rows = conn.execute(sql, {"batch_size": batch_size}).fetchall()
                cases = []
                for r in rows:
                    doms = r[4].split("||") if r[4] else []
                    col = extract_colonia_from_text(r[3])
                    cases.append({
                        "id": r[0],
                        "municipio": r[1],
                        "fecha": r[2],
                        "text": r[3],
                        "colonias": [col] if col else [],
                        "domicilios": [{"calle_raw": d} for d in doms if d]
                    })
                return cases
        except Exception as e:
            log_msg(f"[WARN] Error obteniendo lote de casos (intento {intento+1}/3): {e}")
            time.sleep(3.0)
    return []


def insert_noticia_and_relations(engine, caso: Dict[str, Any], article: Dict[str, Any], query_str: str) -> bool:
    """Inserta la noticia minada y establece la relación ontológica en el grafo."""
    url = article.get("url")
    title = article.get("titular", "Sin título")
    fecha_str = article.get("fecha")
    cuerpo = article.get("cuerpo_texto", "")

    fecha_val = None
    if fecha_str:
        try:
            fecha_val = datetime.strptime(fecha_str[:10], "%Y-%m-%d").date()
        except Exception:
            fecha_val = None

    with engine.connect() as conn:
        existing = conn.execute(text("SELECT id FROM noticias WHERE url = :url"), {"url": url}).fetchone()
        if existing:
            noticia_id = existing[0]
        else:
            ins_noticia = text("""
                INSERT INTO noticias (url, titular, fecha, caso_id, cuerpo_texto, query_origen, created_at)
                VALUES (:url, :titular, :fecha, :caso_id, :cuerpo, :query, NOW())
                RETURNING id
            """)
            res = conn.execute(ins_noticia, {
                "url": url,
                "titular": title[:490],
                "fecha": fecha_val,
                "caso_id": caso["id"],
                "cuerpo": cuerpo[:8000],
                "query": query_str
            })
            noticia_id = res.scalar()

        source_node = f"CASO_{caso['id']}"
        target_node = f"NOTICIA_{noticia_id}"
        
        municipio = caso.get("municipio", "").upper()
        colonia = caso["colonias"][0].upper() if caso.get("colonias") else ""
        text_upper = (title + " " + cuerpo).upper()
        fecha_caso_raw = caso.get("fecha")

        # 1. Filtro Temporal Estricto: Ventana de Coherencia
        # Un hallazgo periodístico solo puede ocurrir DESPUÉS de la desaparición (o máximo 15 días antes por desfase de denuncia)
        # y no más de 4 años después para notas que no sean explícitamente históricas.
        fecha_caso_dt = None
        if fecha_caso_raw:
            try:
                fecha_caso_dt = datetime.strptime(str(fecha_caso_raw)[:10], "%Y-%m-%d").date()
            except Exception:
                fecha_caso_dt = None

        confidence = 0.60
        razones = []

        if fecha_val and fecha_caso_dt:
            delta_dias = (fecha_val - fecha_caso_dt).days
            if delta_dias < -30:
                # La noticia ocurrió meses o años ANTES de la desaparición: Imposible correlación directa de hallazgo
                confidence -= 0.40
                razones.append(f"Incoherencia temporal: Noticia {delta_dias} días antes del hecho")
            elif -15 <= delta_dias <= 365:
                confidence += 0.20
                razones.append(f"Alta coherencia temporal (+{delta_dias} días)")
            elif 366 <= delta_dias <= 1460:
                confidence += 0.05
                razones.append(f"Coherencia temporal tardía (+{delta_dias} días)")
            else:
                confidence -= 0.20
                razones.append(f"Desfase temporal excesivo (+{delta_dias} días)")

        # Regla estricta contra duplicación y falsos positivos:
        # Una noticia solo puede vincularse a este caso si:
        # 1. Coincide exactamente la colonia en el texto de la noticia (o titular), O
        # 2. Existe coincidencia de PII propio de este caso específico (nombre/alias/domicilio del caso presente en la noticia).
        has_colonia_match = bool(colonia and len(colonia) >= 4 and colonia in text_upper)

        # Cotejar PII pero EXCLUSIVAMENTE contra PII que pertenezca al texto de ESTE caso
        caso_texto = (caso.get("text") or "").upper()
        pii_matches = []
        if caso_texto:
            pii_matches = conn.execute(text("""
                SELECT entity_type, canonical_value, hash_id 
                FROM pii_hash_registry 
                WHERE length(canonical_value) >= 8
                  AND canonical_value NOT IN ('WHATSAP', 'PERIFÉRICO NORTE', 'CARRETERA A CHAPALA', 'AVENIDA JUAREZ', 'CRUZ VERDE', 'HOSPITAL CIVIL', 'ZAPOPAN', 'GUADALAJARA', 'TLAQUEPAQUE', 'TLAJOMULCO', 'TONALA')
                  AND :caso_texto ILIKE '%' || canonical_value || '%'
                  AND :noticia_texto ILIKE '%' || canonical_value || '%'
                LIMIT 5
            """), {"caso_texto": caso_texto, "noticia_texto": text_upper}).fetchall()

        has_case_pii_match = len(pii_matches) > 0

        # Si no coincide la colonia específica ni hay un PII coincidente de este caso, RECHAZAR el vínculo
        if not has_colonia_match and not has_case_pii_match:
            conn.commit()
            return False

        if has_colonia_match:
            confidence += 0.25
            razones.append(f"Misma Colonia: {colonia}")

        if municipio and municipio in text_upper:
            confidence += 0.10
            razones.append(f"Mismo Municipio: {municipio}")

        # Descartar titulares genéricos o placeholders de indexación
        if title in ["Nota periodística sobre hallazgo o caso", "Visor Proaxis", "Sin título"]:
            confidence -= 0.30

        for p_type, p_val, p_hash in pii_matches:
            confidence = min(0.98, confidence + 0.25)
            razones.append(f"Coincidencia PII caso [{p_type}]: {p_hash}")

            edge_pii = conn.execute(text("""
                SELECT id FROM vinculos_entidades 
                WHERE source_node = :src AND target_node = :tgt AND relation_type = 'MENCIONADO_EN_NOTICIA'
            """), {"src": p_hash, "tgt": target_node}).fetchone()

            if not edge_pii:
                ins_pii_edge = text("""
                    INSERT INTO vinculos_entidades 
                    (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                    VALUES (:src, :stype, :tgt, 'NOTICIA', 'MENCIONADO_EN_NOTICIA', 0.95, 'APROBADO', :meta, NOW())
                """)
                conn.execute(ins_pii_edge, {
                    "src": p_hash,
                    "stype": f"HASH_{p_type}",
                    "tgt": target_node,
                    "meta": json.dumps({"valor_anonimizado": p_hash, "noticia_id": noticia_id, "url": url}, ensure_ascii=False)
                })

        edge_check = conn.execute(text("""
            SELECT id FROM vinculos_entidades 
            WHERE source_node = :src AND target_node = :tgt AND relation_type = 'MENCIONADO_EN_NOTICIA'
        """), {"src": source_node, "tgt": target_node}).fetchone()

        if not edge_check:
            ins_edge = text("""
                INSERT INTO vinculos_entidades 
                (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                VALUES (:src, 'CASO', :tgt, 'NOTICIA', 'MENCIONADO_EN_NOTICIA', :conf, :aprob, :meta, NOW())
            """)
            meta_payload = {
                "titular": title,
                "url": url,
                "municipio_caso": caso.get("municipio"),
                "colonia_caso": colonia,
                "coincidencias": razones
            }
            conn.execute(ins_edge, {
                "src": source_node,
                "tgt": target_node,
                "conf": min(confidence, 0.95),
                "aprob": "APROBADO" if confidence >= 0.85 else "SUGERIDO",
                "meta": json.dumps(meta_payload, ensure_ascii=False)
            })

        conn.commit()
    return True


def mark_case_evaluated_no_match(engine, caso_id: str):
    """Marca el caso como evaluado en la red ontológica para no re-consultarlo (con reintentos)."""
    for intento in range(3):
        try:
            with engine.connect() as conn:
                chk = conn.execute(text("""
                    SELECT id FROM vinculos_entidades 
                    WHERE source_node = :src AND relation_type = 'REVISADO_SIN_NOTICIA'
                """), {"src": f"CASO_{caso_id}"}).fetchone()
                if not chk:
                    conn.execute(text("""
                        INSERT INTO vinculos_entidades 
                        (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                        VALUES (:src, 'CASO', 'OSINT_EMPTY', 'REGISTRO', 'REVISADO_SIN_NOTICIA', 1.0, 'ARCHIVADO', '{"estado": "SIN_NOTAS_PUBLICAS"}', NOW())
                    """), {"src": f"CASO_{caso_id}"})
                    conn.commit()
            return
        except Exception as e:
            log_msg(f"[WARN] Error marcando caso evaluado (intento {intento+1}/3): {e}")
            time.sleep(2.0)


def run_all_night():
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={
            "connect_timeout": 15,
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5
        }
    )
    log_msg("===================================================================")
    log_msg("🌙 INICIANDO SESIÓN DE MINERÍA NOCTURNA DESATENDIDA")
    log_msg("Estrategia: De más nuevas a más viejas (DESC NULLS LAST)")
    log_msg(f"Destino: Base PostgreSQL en {DATABASE_URL.split('@')[-1]}")
    log_msg("===================================================================")

    total_procesados = 0
    total_notas_guardadas = 0

    while True:
        cases = fetch_next_unmined_cases(engine, batch_size=15)
        if not cases:
            log_msg("🎉 ¡TODOS LOS CASOS ELEGIBLES HAN SIDO PROCESADOS EXITOSAMENTE!")
            break

        for c in cases:
            total_procesados += 1
            caso_id = c["id"]
            mpio = c["municipio"]
            fecha = c["fecha"] or "Fecha s/d"
            col = c["colonias"][0] if c["colonias"] else "Sin Colonia"
            log_msg(f"\n[#{total_procesados}] Caso: {caso_id} | Fecha: {fecha} | Mpio: {mpio} | Col: {col}")

            adaptive_queries = OSINTQueryGenerator.generate_adaptive_queries(c)
            if not adaptive_queries:
                mark_case_evaluated_no_match(engine, caso_id)
                continue

            articulos_encontrados = False
            for aq in adaptive_queries:
                q_str = aq["query"]
                log_msg(f"  Consulta [{aq['tipo']}]: {q_str}")

                try:
                    articles = news_miner_service.process_query_and_extract(q_str, max_results=3)
                    if articles:
                        articulos_encontrados = True
                        for art in articles:
                            if insert_noticia_and_relations(engine, c, art, q_str):
                                total_notas_guardadas += 1
                                log_msg(f"    [GUARDADO] {art['titular'][:70]}...")
                        # Si ya encontró artículos en este cluster, no desgastar queries redundantes
                        break
                    else:
                        log_msg(f"    [SIN NOTA CLUSTER {aq['cluster']}] Probando cluster semántico siguiente...")
                        time.sleep(random.uniform(1.5, 2.5))
                except Exception as e:
                    log_msg(f"  [ERROR] Excepción procesando cluster: {e}")

            if not articulos_encontrados:
                mark_case_evaluated_no_match(engine, caso_id)
                log_msg("    [SIN NOTA] Sin notas públicas concurrentes tras evaluar clusters adaptativos.")

            # Jitter moderado-agresivo calibrado entre 3.5 y 6.0 segundos
            delay = random.uniform(3.5, 6.0)
            log_msg(f"  ⚡ Pausa ágil de {delay:.1f}s...")
            time.sleep(delay)

        log_msg(f"\n--- Subtotal: {total_procesados} casos revisados | {total_notas_guardadas} noticias persistidas ---")
        time.sleep(random.uniform(2.0, 4.0))


if __name__ == "__main__":
    run_all_night()
