from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from .. import models, schemas, database

router = APIRouter()

@router.get("")
def get_personas_fallecidas_sin_identificar(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.PersonaFallecidaSinIdentificar)
    
    if start_date and end_date:
        try:
            start_date_parsed = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_date_parsed = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(models.PersonaFallecidaSinIdentificar.Fecha_Ingreso.between(start_date_parsed, end_date_parsed))
        except ValueError:
            raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")
            
    records = query.all()
    
    # We want to format the output similarly to legacy sininden.php
    formatted_records = []
    for r in records:
        formatted_records.append({
            "ID": r.ID,
            "Fecha_Ingreso": r.Fecha_Ingreso.strftime("%Y-%m-%d") if r.Fecha_Ingreso else None,
            "Sexo": r.Sexo,
            "Probable_nombre": r.Probable_nombre,
            "Edad": r.Edad,
            "Tatuajes": r.Tatuajes,
            "Indumentarias": r.Indumentarias,
            "Senas_Particulares": r.Senas_Particulares,
            "Delegacion_IJCF": r.Delegacion_IJCF
        })
        
    return {"records": formatted_records}

@router.get("/{id}", response_model=schemas.PersonaFallecidaSinIdentificarOut)
def get_persona_fallecida_sin_identificar_by_id(id: str, db: Session = Depends(database.get_db)):
    persona = db.query(models.PersonaFallecidaSinIdentificar).filter(models.PersonaFallecidaSinIdentificar.ID == id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona fallecida sin identificar not found")
    return persona
