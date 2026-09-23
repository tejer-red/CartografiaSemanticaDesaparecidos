#!/usr/bin/env python3
"""
linker_noticias_casos.py: Algoritmo de vinculación semi-supervisada espacio-temporal
entre noticias de hallazgos/fosas (noticias_corpus) y cédulas de desaparición (cedulas_privadas).

Fórmula de afinidad:
  Score = S_espacial * 0.50 + S_temporal * 0.30 + S_contexto * 0.20

Criterios:
  - S_espacial: Distancia Haversine entre fosa y última ubicación conocida de la persona.
  - S_temporal: Causalidad estricta (desaparición <= hallazgo) con decaimiento temporal.
  - S_contexto: Consistencia de sexo y rangos de edad si están disponibles.
  - Filtro Temporal de Hallazgos: Soporte para acotar hallazgos al periodo histórico de las cédulas (<= 2024).
  - Persistencia: Registra las top N coincidencias por noticia con Score >= umbral en vinculos_entidades
    bajo el estado 'PENDIENTE_REVISION'.
"""

import os
import sys
import math
import json
import argparse
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple

import psycopg2
from psycopg2.extras import Json

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ.get("DB_USER", "postgres")
    pwd = os.environ.get("DB_PASSWORD", "")
    name = os.environ.get("DB_NAME", "cartografia_semantica_db")
    DB_URL = f"postgresql://{user}:{pwd}@{host}:{port}/{name}" if pwd else f"postgresql://{user}@{host}:{port}/{name}"

def log_msg(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}", flush=True)

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def parse_date(date_val: Any) -> Optional[date]:
    if not date_val:
        return None
    if isinstance(date_val, date):
        return date_val
    if isinstance(date_val, datetime):
        return date_val.date()
    val_str = str(date_val).strip()[:10]
    try:
        return datetime.strptime(val_str, "%Y-%m-%d").date()
    except Exception:
        return None

def compute_spatial_score(dist_km: float) -> float:
    """Calcula el score espacial en función de la distancia en km."""
    if dist_km <= 2.0:
        return 1.0
    elif dist_km <= 5.0:
        return 0.85
    elif dist_km <= 10.0:
        return 0.70
    elif dist_km <= 20.0:
        return 0.50
    elif dist_km <= 35.0:
        return 0.30
    elif dist_km <= 50.0:
        return 0.15
    return 0.0

def compute_temporal_score(f_desap: Optional[date], f_hallazgo: Optional[date]) -> Tuple[float, Optional[int]]:
    """
    Evalúa consistencia temporal y causalidad:
    - Hallazgo anterior a desaparición: 0.0 (imposibilidad física).
    - Hallazgo en ventana cercana posterior: decaimiento controlado.
    """
    if not f_desap or not f_hallazgo:
        return 0.50, None  # Puntaje neutro ante incertidumbre temporal

    dias_diferencia = (f_hallazgo - f_desap).days
    if dias_diferencia < 0:
        return 0.0, dias_diferencia  # Violación causal

    if dias_diferencia <= 90:
        return 1.0, dias_diferencia
    elif dias_diferencia <= 365:
        return 0.85, dias_diferencia
    elif dias_diferencia <= 730:
        return 0.70, dias_diferencia
    elif dias_diferencia <= 1825:
        return 0.50, dias_diferencia
    else:
        return 0.35, dias_diferencia

def compute_context_score(cedula_meta: Dict[str, Any], noticia_meta: Dict[str, Any], noticia_texto: str) -> float:
    """Evalúa coherencia de contexto (sexo de la víctima y menciones en la noticia)."""
    sexo_cedula = (cedula_meta.get("sexo") or "").upper().strip()
    if not sexo_cedula:
        return 0.70

    texto_lower = (noticia_texto or "").lower()

    if sexo_cedula in ["HOMBRE", "MASCULINO"]:
        if any(term in texto_lower for term in ["hombre", "masculino", "varón", "masculinos", "sujetos"]):
            return 1.0
        elif any(term in texto_lower for term in ["mujer", "femenino", "femenina"]):
            return 0.30
    elif sexo_cedula in ["MUJER", "FEMENINO"]:
        if any(term in texto_lower for term in ["mujer", "femenino", "femenina", "mujeres"]):
            return 1.0
        elif any(term in texto_lower for term in ["hombre", "varón", "varones"]):
            return 0.30

    return 0.70

class CorpusCasosLinker:

    def __init__(self, db_url: str = DB_URL, umbral: float = 0.55, top_n: int = 5, max_year: Optional[int] = 2024):
        self.db_url = db_url
        self.umbral = umbral
        self.top_n = top_n
        self.max_year = max_year

    def load_noticias(self) -> List[Dict[str, Any]]:
        conn = psycopg2.connect(self.db_url)
        cur = conn.cursor()
        
        # Filtro temporal para coincidir con el periodo histórico de las cédulas (<= 2024)
        where_clause = "WHERE lat IS NOT NULL AND lng IS NOT NULL"
        params = []
        if self.max_year:
            where_clause += " AND (fecha IS NULL OR EXTRACT(YEAR FROM fecha) <= %s)"
            params.append(self.max_year)

        cur.execute(f"""
            SELECT id, titular, fecha, lat, lng, municipio_extraido, colonia_extraida,
                   resumen_hallazgo, metadata_extraccion, evento_hallazgo_id, cuerpo_texto
            FROM noticias_corpus
            {where_clause};
        """, tuple(params))
        rows = cur.fetchall()
        conn.close()

        noticias = []
        for r in rows:
            noticias.append({
                "id": r[0],
                "titular": r[1],
                "fecha": parse_date(r[2]),
                "lat": float(r[3]),
                "lng": float(r[4]),
                "municipio": r[5],
                "colonia": r[6],
                "resumen": r[7],
                "metadata": r[8] or {},
                "evento_id": r[9],
                "texto": r[10] or ""
            })
        return noticias

    def load_cedulas_with_coords(self) -> List[Dict[str, Any]]:
        conn = psycopg2.connect(self.db_url)
        cur = conn.cursor()
        cur.execute("""
            SELECT c.id, c.nombre_real, c.fecha_desaparicion, c.municipio, c.colonia,
                   c.metadata_privada, i.lat_long, i.tipo_loc, i.loc
            FROM cedulas_privadas c
            LEFT JOIN repd_vp_inferencia3 i ON c.id = i.id_cedula_busqueda
            WHERE i.lat_long IS NOT NULL AND i.lat_long != '';
        """)
        rows = cur.fetchall()
        conn.close()

        cedulas = []
        for r in rows:
            lat_long_str = r[6]
            try:
                parts = [float(p.strip()) for p in lat_long_str.split(",")]
                lat, lng = parts[0], parts[1]
            except Exception:
                continue

            meta = r[5] if isinstance(r[5], dict) else {}
            cedulas.append({
                "id": r[0],
                "nombre": r[1],
                "fecha_desaparicion": parse_date(r[2]),
                "municipio": r[3],
                "colonia": r[4],
                "metadata": meta,
                "lat": lat,
                "lng": lng,
                "tipo_loc": r[7],
                "loc": r[8]
            })
        return cedulas

    def run_linking(self, dry_run: bool = False, purge_previous: bool = False) -> int:
        log_msg(f"=== INICIANDO PIPELINE DE VINCULACIÓN CASOS ↔ HALLAZGOS (AÑO MÁX: {self.max_year or 'SIN LÍMITE'}) ===")
        noticias = self.load_noticias()
        cedulas = self.load_cedulas_with_coords()

        log_msg(f"Noticias de hallazgos evaluadas: {len(noticias)}")
        log_msg(f"Cédulas con coordenadas geocodificadas: {len(cedulas)}")

        total_vinculos_generados = 0
        vinculos_a_insertar = []

        for noti in noticias:
            candidatos_noticia = []
            for ced in cedulas:
                dist_km = haversine_km(noti["lat"], noti["lng"], ced["lat"], ced["lng"])
                s_espacial = compute_spatial_score(dist_km)

                if s_espacial == 0.0:
                    continue

                s_temporal, dias_diff = compute_temporal_score(ced["fecha_desaparicion"], noti["fecha"])
                if s_temporal == 0.0:
                    continue

                s_contexto = compute_context_score(ced["metadata"], noti["metadata"], noti["texto"])

                total_score = (s_espacial * 0.50) + (s_temporal * 0.30) + (s_contexto * 0.20)

                if total_score >= self.umbral:
                    candidatos_noticia.append({
                        "cedula": ced,
                        "score": round(total_score, 4),
                        "s_espacial": round(s_espacial, 4),
                        "s_temporal": round(s_temporal, 4),
                        "s_contexto": round(s_contexto, 4),
                        "dist_km": round(dist_km, 2),
                        "dias_diff": dias_diff
                    })

            candidatos_noticia.sort(key=lambda x: x["score"], reverse=True)
            top_candidatos = candidatos_noticia[:self.top_n]

            for item in top_candidatos:
                ced = item["cedula"]
                meta_relacion = {
                    "distancia_km": item["dist_km"],
                    "dias_diferencia": item["dias_diff"],
                    "s_espacial": item["s_espacial"],
                    "s_temporal": item["s_temporal"],
                    "s_contexto": item["s_contexto"],
                    "fosa_titular": noti["titular"],
                    "fosa_municipio": noti["municipio"],
                    "fosa_fecha": str(noti["fecha"]) if noti["fecha"] else None,
                    "fosa_evento_id": noti["evento_id"],
                    "cedula_persona": ced["nombre"],
                    "cedula_municipio": ced["municipio"],
                    "cedula_fecha_desaparicion": str(ced["fecha_desaparicion"]) if ced["fecha_desaparicion"] else None,
                    "justificacion": (
                        f"Proximidad de {item['dist_km']} km entre última ubicación y hallazgo, "
                        f"con ventana temporal de {item['dias_diff']} días post-desaparición."
                    )
                }

                vinculos_a_insertar.append((
                    f"cedula_{ced['id']}",
                    "cedula_desaparicion",
                    f"corpus_{noti['id']}",
                    "noticia_fosa_hallazgo",
                    "POSIBLE_HALLAZGO_RELACIONADO",
                    item["score"],
                    "PENDIENTE_REVISION",
                    Json(meta_relacion)
                ))
                total_vinculos_generados += 1

                log_msg(
                    f"  [VÍNCULO #{total_vinculos_generados}] Score: {item['score']} | "
                    f"Persona: {ced['nombre'][:25]} ({ced['municipio']}) -> "
                    f"Fosa: {noti['titular'][:35]} | Dist: {item['dist_km']}km | Δt: {item['dias_diff']}d"
                )

        log_msg(f"=== TOTAL VÍNCULOS CALCULADOS: {total_vinculos_generados} ===")

        if dry_run:
            log_msg("[DRY-RUN] Modo simulación activo. No se persistieron datos en vinculos_entidades.")
            return total_vinculos_generados

        if vinculos_a_insertar:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            if purge_previous:
                log_msg("[DB] Purgando vínculos previos de tipo 'POSIBLE_HALLAZGO_RELACIONADO'...")
                cur.execute("DELETE FROM vinculos_entidades WHERE relation_type = 'POSIBLE_HALLAZGO_RELACIONADO';")

            insert_sql = """
                INSERT INTO vinculos_entidades (
                    source_node, source_type, target_node, target_type,
                    relation_type, confidence_score, estado_aprobacion, metadata_relacion
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """
            for v in vinculos_a_insertar:
                cur.execute(insert_sql, v)
            conn.commit()
            conn.close()
            log_msg(f"[DB] {len(vinculos_a_insertar)} aristas persistidas exitosamente en vinculos_entidades.")

        return total_vinculos_generados

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Linker Espacio-Temporal Casos ↔ Fosas v0.0.3")
    parser.add_argument("--umbral", type=float, default=0.55, help="Umbral mínimo de afinidad combinada (default 0.55)")
    parser.add_argument("--top-n", type=int, default=5, help="Máximo de cédulas vinculadas por noticia (default 5)")
    parser.add_argument("--max-year", type=int, default=2024, help="Año máximo de hallazgos a considerar (default 2024)")
    parser.add_argument("--purge", action="store_true", help="Purgar vínculos de hallazgos anteriores antes de insertar")
    parser.add_argument("--dry-run", action="store_true", help="Ejecutar sin insertar en la base de datos")
    args = parser.parse_args()

    linker = CorpusCasosLinker(umbral=args.umbral, top_n=args.top_n, max_year=args.max_year)
    linker.run_linking(dry_run=args.dry_run, purge_previous=args.purge)
