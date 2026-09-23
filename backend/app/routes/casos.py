from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from .. import models, schemas, database

router = APIRouter()

@router.get("")
def get_casos(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db)
):
    where_clause = ""
    params = {}
    if start_date and end_date:
        where_clause = "WHERE c.fecha_desaparicion BETWEEN :start_date AND :end_date"
        params = {"start_date": start_date, "end_date": end_date}
        
    sql_cases = text(f"""
        SELECT c.*, i.tipo_loc, i.loc, i.lat_long, i.fecha, i.sum_score, i.violence_score, i.violence_terms
        FROM cedulas_anonimizadas c
        LEFT JOIN repd_vp_inferencia3 i ON c.id_cedula_busqueda = i.id_cedula_busqueda
        {where_clause}
    """)
    cases = db.execute(sql_cases, params).mappings().all()
    case_ids = [c["id_cedula_busqueda"] for c in cases]
    
    tatuajes_by_case = {}
    if case_ids:
        sql_senas = text("""
            SELECT id_cedula_busqueda, descripcion, parte_cuerpo
            FROM repd_vp_cedulas_senas
            WHERE tipo_sena = 'TATUAJES' AND id_cedula_busqueda IN :ids
        """)
        # Postgres supports tuples for IN queries when bound properly
        senas = db.execute(sql_senas, {"ids": tuple(case_ids)}).mappings().all()
        for s in senas:
            cid = s["id_cedula_busqueda"]
            if cid not in tatuajes_by_case:
                tatuajes_by_case[cid] = []
            tatuajes_by_case[cid].append({
                "descripcion": s["descripcion"],
                "parte_cuerpo": s["parte_cuerpo"]
            })
            
    # Carga de catálogo de centroides municipales de Jalisco
    import json, os, hashlib, unicodedata
    centroides_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "centroides_jalisco.json")
    centroides_map = {}
    if os.path.exists(centroides_path):
        try:
            with open(centroides_path, "r", encoding="utf-8") as cf:
                raw_c = json.load(cf)
                for k, v in raw_c.items():
                    nk = ''.join(c for c in unicodedata.normalize('NFD', k.upper()) if unicodedata.category(c) != 'Mn').strip()
                    centroides_map[nk] = (float(v[0]), float(v[1]))
        except Exception as err:
            print(f"[casos.py] Error cargando centroides: {err}")

    def get_jitter(key: str, scale=0.015):
        h = int(hashlib.md5(key.encode()).hexdigest(), 16)
        dx = ((h % 10000) / 5000.0 - 1.0) * scale
        dy = (((h >> 16) % 10000) / 5000.0 - 1.0) * scale
        return dx, dy

    formatted_records = []
    for row in cases:
        inferencia_data = {}
        if row["tipo_loc"] is not None or row["loc"] is not None or row["lat_long"] is not None:
            inferencia_data = {
                "tipo_loc": row["tipo_loc"],
                "loc": row["loc"],
                "lat_long": row["lat_long"],
                "fecha": row["fecha"],
                "sum_score": row["sum_score"],
                "violence_score": row["violence_score"],
                "violence_terms": row["violence_terms"]
            }
            
        tatuajes = tatuajes_by_case.get(row["id_cedula_busqueda"], [])
        
        # Fallback de georreferenciación por centroide de municipio con jitter determinista
        lat_long = inferencia_data.get("lat_long")
        if not lat_long and row["municipio"]:
            mun_norm = ''.join(c for c in unicodedata.normalize('NFD', row["municipio"].upper()) if unicodedata.category(c) != 'Mn').strip()
            if mun_norm in centroides_map:
                c_lat, c_lng = centroides_map[mun_norm]
                j_lat, j_lng = get_jitter(str(row["id_cedula_busqueda"]))
                lat_long = f"{round(c_lat + j_lat, 6)}, {round(c_lng + j_lng, 6)}"

        # Asegurar sum_score para que los filtros visuales del mapa no descarten la cédula
        raw_sum_score = inferencia_data.get("sum_score")
        sum_score = float(raw_sum_score) if raw_sum_score is not None else 1.0

        record_dict = {
            "id_cedula_busqueda": row["id_cedula_busqueda"],
            "autorizacion_informacion_publica": row["autorizacion_informacion_publica"],
            "condicion_localizacion": row["condicion_localizacion"] or "NO APLICA",
            "nombre_completo": row["nombre_completo"],
            "edad_momento_desaparicion": row["edad_momento_desaparicion"],
            "sexo": row["sexo"],
            "genero": row["genero"],
            "complexion": row["complexion"],
            "estatura": row["estatura"],
            "tez": row["tez"],
            "cabello": row["cabello"],
            "ojos_color": row["ojos_color"],
            "municipio": row["municipio"],
            "municipio_desaparicion": row["municipio"],
            "estado": row["estado"],
            "fecha_desaparicion": row["fecha_desaparicion"],
            "estatus_persona_desaparecida": row["estatus_persona_desaparecida"],
            "descripcion_desaparicion": row["descripcion_desaparicion"],
            "ruta_foto": row["ruta_foto"],
            "tatuajes": tatuajes,
            "lat_long": lat_long,
            "sum_score": sum_score,
            **{k: v for k, v in inferencia_data.items() if k not in ("lat_long", "sum_score")}
        }
        formatted_records.append(record_dict)
        
    return {"records": formatted_records}

@router.get("/{id_cedula_busqueda}", response_model=schemas.CasoOut)
def get_caso_by_id(id_cedula_busqueda: str, db: Session = Depends(database.get_db)):
    caso = db.query(models.Caso).filter(models.Caso.id_cedula_busqueda == id_cedula_busqueda).first()
    if not caso:
        raise HTTPException(status_code=404, detail="Caso not found")
    return caso

@router.post("", response_model=schemas.CasoOut)
def create_caso(caso_data: schemas.CasoCreate, db: Session = Depends(database.get_db)):
    db_caso = db.query(models.Caso).filter(models.Caso.id_cedula_busqueda == caso_data.id_cedula_busqueda).first()
    if db_caso:
        raise HTTPException(status_code=400, detail="Caso with this ID already exists")
    
    db_caso = models.Caso(**caso_data.dict())
    db.add(db_caso)
    db.commit()
    db.refresh(db_caso)
    return db_caso

@router.post("/{id_cedula_busqueda}/etiquetas", response_model=schemas.CasoOut)
def add_etiqueta_to_caso(id_cedula_busqueda: str, etiqueta_id: int, db: Session = Depends(database.get_db)):
    caso = db.query(models.Caso).filter(models.Caso.id_cedula_busqueda == id_cedula_busqueda).first()
    if not caso:
        raise HTTPException(status_code=404, detail="Caso not found")
    
    etiqueta = db.query(models.Etiqueta).filter(models.Etiqueta.id == etiqueta_id).first()
    if not etiqueta:
        raise HTTPException(status_code=404, detail="Etiqueta not found")
        
    if etiqueta not in caso.etiquetas:
        caso.etiquetas.append(etiqueta)
        db.commit()
        db.refresh(caso)
    return caso
