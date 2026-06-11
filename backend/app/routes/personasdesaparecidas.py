from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database

router = APIRouter()

@router.get("", response_model=List[schemas.CasoOut])
def get_personas_desaparecidas(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Caso).offset(skip).limit(limit).all()

@router.get("/{id_cedula_busqueda}", response_model=schemas.CasoOut)
def get_persona_desaparecida(id_cedula_busqueda: str, db: Session = Depends(database.get_db)):
    persona = db.query(models.Caso).filter(models.Caso.id_cedula_busqueda == id_cedula_busqueda).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona desaparecida not found")
    return persona
