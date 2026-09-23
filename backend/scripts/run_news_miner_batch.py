#!/usr/bin/env python3
"""
run_news_miner_batch.py: Pipeline desatendido (/goal) de minería de notas periodísticas,
extracción de entidades y correlación ontológica con casos de desaparición histórica en Jalisco.

Características:
1. Selección de casos prioritarios con georreferenciación (Municipio + Colonia + Domicilio).
2. Generación de consultas booleanas OSINT (Nivel 1 y Nivel 2).
3. Rate limiting conservador con jitter aleatorio (5 a 12 segs) para evitar bloqueos/bans.
4. Extracción de notas completas vía Trafilatura (con fallback a Playwright).
5. Cruce de entidades y generación de aristas en `vinculos_entidades` y registros en `noticias`.
6. Almacenamiento persistente en PostgreSQL central (abeja).
"""

import os
import sys
import re
import time
import random
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
from backend.app.ner.anonymizer import compute_entity_hash, normalize_entity_text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ.get("DB_USER", "postgres")
    pwd = os.environ.get("DB_PASSWORD", "")
    name = os.environ.get("DB_NAME", "cartografia_semantica_db")
    DATABASE_URL = f"postgresql://{user}:{pwd}@{host}:{port}/{name}" if pwd else f"postgresql://{user}@{host}:{port}/{name}"
LOG_DIR = PROJECT_ROOT / "reports" / "mining"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "news_miner_batch.log"


def log_msg(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


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


def fetch_target_cases(engine, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Obtiene los casos priorizados con contexto espacial para minería."""
    sql = text("""
        SELECT p.id, p.municipio, p.fecha_desaparicion, p.text_original,
               (SELECT string_agg(h.canonical_value, '||') 
                FROM pii_hash_registry h 
                WHERE p.text_original ILIKE '%' || h.canonical_value || '%' 
                  AND h.entity_type = 'DOMICILIO' 
                  AND length(h.canonical_value) > 4) as domicilios_str
        FROM cedulas_privadas p
        WHERE p.municipio IS NOT NULL 
          AND p.municipio IN ('SAN PEDRO TLAQUEPAQUE', 'TLAQUEPAQUE', 'TLAJOMULCO DE ZUÑIGA', 'GUADALAJARA', 'ZAPOPAN', 'EL SALTO', 'TONALA', 'TONALÁ')
          AND p.text_original ILIKE '%COLONIA%'
        ORDER BY p.fecha_desaparicion DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"limit": limit, "offset": offset}).fetchall()
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


def insert_noticia_and_relations(engine, caso: Dict[str, Any], article: Dict[str, Any], query_str: str) -> bool:
    """Inserta la noticia minada y establece la relación ontológica en el grafo."""
    url = article.get("url")
    title = article.get("titular", "Sin título")
    fecha_str = article.get("fecha")
    cuerpo = article.get("cuerpo_texto", "")

    # Validar formato fecha si viene disponible
    fecha_val = None
    if fecha_str:
        try:
            fecha_val = datetime.strptime(fecha_str[:10], "%Y-%m-%d").date()
        except Exception:
            fecha_val = None

    with engine.connect() as conn:
        # Verificar si la URL ya existe
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

        # Generar arista de conocimiento en vinculos_entidades
        # Relación: CASO -> MENCIONADO_O_VINCULADO_CON -> NOTICIA
        source_node = f"CASO_{caso['id']}"
        target_node = f"NOTICIA_{noticia_id}"
        
        # Evaluar confianza según coincidencia espacial o temporal
        municipio = caso.get("municipio", "").upper()
        colonia = caso["colonias"][0].upper() if caso.get("colonias") else ""
        text_upper = (title + " " + cuerpo).upper()

        confidence = 0.70
        razones = []
        if municipio and municipio in text_upper:
            confidence += 0.10
            razones.append(f"Mismo Municipio: {municipio}")
        if colonia and colonia in text_upper:
            confidence += 0.15
            razones.append(f"Misma Colonia: {colonia}")

        # Comprobar si el texto de la noticia menciona personas o domicilios registrados del caso
        pii_matches = conn.execute(text("""
            SELECT entity_type, canonical_value, hash_id 
            FROM pii_hash_registry 
            WHERE length(canonical_value) >= 6
              AND :noticia_texto ILIKE '%' || canonical_value || '%'
            LIMIT 5
        """), {"noticia_texto": text_upper}).fetchall()

        for p_type, p_val, p_hash in pii_matches:
            confidence = min(0.98, confidence + 0.20)
            razones.append(f"Coincidencia PII [{p_type}]: {p_hash}")

            # Arista directa entre Entidad Criptográfica y Noticia
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


def run_miner_loop(limit: int = 30, min_delay: int = 6, max_delay: int = 12):
    """Bucle principal de minería con rate limiting conservador y jitter."""
    import json
    engine = create_engine(DATABASE_URL)
    log_msg(f"=== INICIANDO PIPELINE DE MINERÍA DE PRENSA OSINT ===")
    log_msg(f"Configuración: Límite={limit} casos | Delay={min_delay}-{max_delay}s | Base de Datos: {DATABASE_URL.split('@')[-1]}")

    cases = fetch_target_cases(engine, limit=limit)
    log_msg(f"Se cargaron {len(cases)} casos con contexto geográfico y colonia identificada.")

    total_articles_saved = 0
    total_queries_run = 0

    for idx, c in enumerate(cases, 1):
        caso_id = c["id"]
        mpio = c["municipio"]
        col = c["colonias"][0] if c["colonias"] else "Sin Colonia"
        log_msg(f"\n--- [{idx}/{len(cases)}] Procesando Caso: {caso_id} ({mpio} | Col: {col}) ---")

        queries = OSINTQueryGenerator.generate_queries_for_case(c)
        if not queries:
            log_msg("  [SKIP] No se pudieron formular queries con nivel de confianza adecuado.")
            continue

        # Seleccionar la consulta más específica (Nivel 1 o Nivel 2)
        target_q = queries[0]
        q_str = target_q["query"]
        log_msg(f"  Consulta [Nivel {target_q['nivel']} - {target_q['tipo']}]: {q_str}")

        # Ejecutar búsqueda y extracción
        try:
            articles = news_miner_service.process_query_and_extract(q_str, max_results=3)
            total_queries_run += 1
            log_msg(f"  Artículos válidos obtenidos: {len(articles)}")

            for art in articles:
                success = insert_noticia_and_relations(engine, c, art, q_str)
                if success:
                    total_articles_saved += 1
                    log_msg(f"    [GUARDADO] {art['titular'][:70]}... | URL: {art['url'][:60]}...")

        except Exception as e:
            log_msg(f"  [ERROR] Fallo al procesar consulta: {e}")

        # Rate Limiting Conservador con jitter
        delay = random.uniform(min_delay, max_delay)
        log_msg(f"  ⏳ Pausa conservadora de {delay:.1f}s antes de la siguiente consulta...")
        time.sleep(delay)

    log_msg(f"\n=== FIN DE CICLO DE MINERÍA ===")
    log_msg(f"Total consultas ejecutadas: {total_queries_run} | Total notas persistidas: {total_articles_saved}")


if __name__ == "__main__":
    import json
    parser = argparse.ArgumentParser(description="Batch Miner de Notas Periodísticas y Correlación")
    parser.add_argument("--limit", type=int, default=15, help="Cantidad de casos a procesar")
    parser.add_argument("--min-delay", type=int, default=6, help="Delay mínimo en segundos")
    parser.add_argument("--max-delay", type=int, default=12, help="Delay máximo en segundos")
    args = parser.parse_args()

    run_miner_loop(limit=args.limit, min_delay=args.min_delay, max_delay=args.max_delay)
