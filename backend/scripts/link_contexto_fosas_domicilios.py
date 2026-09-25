#!/usr/bin/env python3
"""
link_contexto_fosas_domicilios.py: Generación de vínculos ontológicos para la Matriz de Contexto.
Exclusivamente para variables contextuales y estructurales (NO noticias periodísticas):
  1. Domicilios y Fincas de Desaparición (Hashes PII compartidos) -> DESAPARECIO_EN_DOMICILIO
  2. Fosas Clandestinas Oficiales (Catálogo Estatal) -> POSIBLE_HALLAZGO_EN_FOSA
"""

import os
import re
import math
import json
import unicodedata
from datetime import datetime
from collections import Counter

from backend.app.database import SessionLocal
from backend.app.models import Caso, Fosa, VinculoEntidad
from sqlalchemy import text

def log_msg(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def norm(s: str) -> str:
    if not s: return ''
    return ''.join(c for c in unicodedata.normalize('NFD', s.upper()) if unicodedata.category(c) != 'Mn')

def main():
    db = SessionLocal()
    log_msg("Iniciando vinculador de Contexto Forense (Domicilios y Fosas Oficiales)...")

    # Limpiar vínculos previos de estas dos categorías para re-ejecución idempotente
    db.query(VinculoEntidad).filter(
        VinculoEntidad.relation_type.in_(['DESAPARECIO_EN_DOMICILIO', 'POSIBLE_HALLAZGO_EN_FOSA'])
    ).delete(synchronize_session=False)
    db.commit()
    log_msg("Vínculos previos de FOSAS y DOMICILIOS limpiados.")

    # =========================================================================
    # 1. VINCULACIÓN DE DOMICILIOS HASHEADOS (PII)
    # =========================================================================
    log_msg("1/2: Procesando Domicilios y Fincas de Desaparición...")
    sql_cedulas = text("""
        SELECT id_cedula_busqueda, municipio, descripcion_desaparicion, fecha_desaparicion
        FROM cedulas_anonimizadas
        WHERE descripcion_desaparicion LIKE '%DOMICILIO_HASH_%'
    """)
    rows = db.execute(sql_cedulas).mappings().all()

    # Mapear domicilios y contar frecuencia
    dom_map = {}
    for r in rows:
        desc = r['descripcion_desaparicion'] or ''
        hashes = re.findall(r'\[(DOMICILIO_HASH_[a-f0-9]+)\]', desc)
        for h in set(hashes):
            dom_map.setdefault(h, []).append(r)

    log_msg(f"Total domicilios únicos encontrados: {len(dom_map)}")
    shared_doms = {k: v for k, v in dom_map.items() if len(v) >= 2}
    log_msg(f"Domicilios compartidos por 2 o más casos (fincas / eventos múltiples): {len(shared_doms)}")

    dom_links = []
    # Insertamos vínculos para todos los domicilios compartidos (alta relevancia de clúster)
    for h, cases_in_dom in dom_map.items():
        is_shared = len(cases_in_dom) >= 2
        if is_shared:
            for c in cases_in_dom:
                v = VinculoEntidad(
                    source_node=f"CASO_{c['id_cedula_busqueda']}",
                    source_type="CASO",
                    target_node=h,
                    target_type="DOMICILIO",
                    relation_type="DESAPARECIO_EN_DOMICILIO",
                    confidence_score=1.0,
                    estado_aprobacion="APROBADO",
                    metadata_relacion={
                        "domicilio_hash": h,
                        "municipio": c['municipio'],
                        "casos_en_domicilio": len(cases_in_dom),
                        "es_compartido": True
                    }
                )
                dom_links.append(v)

    db.bulk_save_objects(dom_links)
    db.commit()
    log_msg(f"✅ Se insertaron {len(dom_links)} vínculos de Domicilios Compartidos (relación DESAPARECIO_EN_DOMICILIO).")

    # =========================================================================
    # 2. VINCULACIÓN DE FOSAS CLANDESTINAS OFICIALES (CATÁLOGO ESTATAL)
    # =========================================================================
    log_msg("2/2: Correlacionando casos con Catálogo Oficial de Fosas Clandestinas...")
    fosas = db.query(Fosa).all()

    # Cargar centroides municipales
    centroides_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'centroides_jalisco.json')
    with open(centroides_path, 'r', encoding='utf-8') as f:
        centroides_norm = {norm(k): v for k, v in json.load(f).items()}

    valid_fosas = []
    for f in fosas:
        if f.coordenadas and ',' in f.coordenadas:
            try:
                p = f.coordenadas.split(',')
                valid_fosas.append({
                    'id': f.id,
                    'municipio': f.municipio,
                    'fecha': f.fecha_hallazgo,
                    'total_cuerpos': f.total_cuerpos or 0,
                    'total_fosas': f.total_fosas or 1,
                    'lat': float(p[0]),
                    'lon': float(p[1])
                })
            except Exception:
                pass

    log_msg(f"Fosas oficiales analizadas con coordenadas válidas: {len(valid_fosas)}")

    # Obtener todas las cédulas con municipio y fecha
    sql_todas_cedulas = text("""
        SELECT id_cedula_busqueda, municipio, fecha_desaparicion
        FROM cedulas_anonimizadas
        WHERE municipio IS NOT NULL AND fecha_desaparicion IS NOT NULL
    """)
    todas_cedulas = db.execute(sql_todas_cedulas).mappings().all()

    fosa_links = []
    for c in todas_cedulas:
        c_mun = norm(c['municipio'])
        coords = centroides_norm.get(c_mun)
        if not coords:
            continue
        c_lat, c_lon = coords[0], coords[1]
        try:
            c_fecha = datetime.strptime(str(c['fecha_desaparicion'])[:10], '%Y-%m-%d').date()
        except Exception:
            continue

        # Evaluar contra fosas
        best_fosas_for_case = []
        for f in valid_fosas:
            dist = haversine_km(c_lat, c_lon, f['lat'], f['lon'])
            # Radio estricto: <= 10 km (o mismo municipio y <= 15 km)
            if dist <= 10.0 or (c_mun == norm(f['municipio']) and dist <= 15.0):
                # Causalidad temporal: desapareció antes o en la fecha de hallazgo
                if f['fecha'] and c_fecha <= f['fecha']:
                    delta_days = (f['fecha'] - c_fecha).days
                    if delta_days <= 730: # Máximo 2 años de ventana de búsqueda
                        # Score: penaliza distancia y tiempo transcurrido
                        score = round(max(0.5, 1.0 - (dist / 15.0) * 0.3 - (delta_days / 730.0) * 0.2), 2)
                        if score >= 0.75:
                            best_fosas_for_case.append((f, dist, delta_days, score))

        # Seleccionar la fosa con mayor score de afinidad para este caso (máx 2)
        best_fosas_for_case.sort(key=lambda x: x[3], reverse=True)
        for f_match, dist, delta_days, score in best_fosas_for_case[:2]:
            v = VinculoEntidad(
                source_node=f"CASO_{c['id_cedula_busqueda']}",
                source_type="CASO",
                target_node=f"FOSA_{f_match['id']}",
                target_type="FOSA",
                relation_type="POSIBLE_HALLAZGO_EN_FOSA",
                confidence_score=score,
                estado_aprobacion="SUGERIDO",
                metadata_relacion={
                    "fosa_id": f_match['id'],
                    "municipio_fosa": f_match['municipio'],
                    "municipio_caso": c['municipio'],
                    "dist_km": round(dist, 2),
                    "dias_diferencia": delta_days,
                    "cuerpos_en_fosa": f_match['total_cuerpos'],
                    "fecha_hallazgo_fosa": str(f_match['fecha']),
                    "fecha_desaparicion_caso": str(c_fecha)
                }
            )
            fosa_links.append(v)

    db.bulk_save_objects(fosa_links)
    db.commit()
    log_msg(f"✅ Se insertaron {len(fosa_links)} vínculos de Fosas Oficiales (relación POSIBLE_HALLAZGO_EN_FOSA).")

    # Resumen final de conteos en vinculos_entidades
    from sqlalchemy import func
    res = db.query(VinculoEntidad.relation_type, func.count(VinculoEntidad.id)).group_by(VinculoEntidad.relation_type).all()
    log_msg("=== Resumen de Vínculos en Base de Datos ===")
    for r_type, cnt in res:
        log_msg(f"  * {r_type}: {cnt}")

    db.close()
    log_msg("Proceso completado exitosamente.")

if __name__ == "__main__":
    main()
