from fastapi import APIRouter, Depends, HTTPException, Query
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
    query = db.query(models.Caso).options(
        joinedload(models.Caso.inferencia),
        joinedload(models.Caso.senas)
    )
    
    if start_date and end_date:
        query = query.filter(models.Caso.fecha_desaparicion.between(start_date, end_date))
        
    records = query.all()
    
    # We want to format the output similarly to legacy specificDate.php
    formatted_records = []
    for r in records:
        # Get inferencia fields
        inferencia_data = {}
        if r.inferencia:
            inferencia_data = {
                "tipo_loc": r.inferencia.tipo_loc,
                "loc": r.inferencia.loc,
                "lat_long": r.inferencia.lat_long,
                "fecha": r.inferencia.fecha,
                "sum_score": r.inferencia.sum_score,
                "violence_score": r.inferencia.violence_score,
                "violence_terms": r.inferencia.violence_terms
            }
            
        # Get tatuajes (repd_vp_cedulas_senas)
        tatuajes = []
        for s in r.senas:
            if s.tipo_sena == "TATUAJES":
                tatuajes.append({
                    "descripcion": s.descripcion,
                    "parte_cuerpo": s.parte_cuerpo
                })
                
        # Merge all fields
        record_dict = {
            "id_cedula_busqueda": r.id_cedula_busqueda,
            "autorizacion_informacion_publica": r.autorizacion_informacion_publica,
            "condicion_localizacion": r.condicion_localizacion,
            "nombre_completo": r.nombre_completo,
            "edad_momento_desaparicion": r.edad_momento_desaparicion,
            "sexo": r.sexo,
            "genero": r.genero,
            "complexion": r.complexion,
            "estatura": r.estatura,
            "tez": r.tez,
            "cabello": r.cabello,
            "ojos_color": r.ojos_color,
            "municipio": r.municipio,
            # include compatibility field for municipio_desaparicion
            "municipio_desaparicion": r.municipio,
            "estado": r.estado,
            "fecha_desaparicion": r.fecha_desaparicion,
            "estatus_persona_desaparecida": r.estatus_persona_desaparecida,
            "descripcion_desaparicion": r.descripcion_desaparicion,
            "ruta_foto": r.ruta_foto,
            "tatuajes": tatuajes,
            **inferencia_data
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
