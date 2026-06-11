from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database

router = APIRouter()

@router.get("", response_model=List[schemas.EtiquetaOut])
def get_etiquetas(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Etiqueta).offset(skip).limit(limit).all()

@router.post("", response_model=schemas.EtiquetaOut)
def create_etiqueta(etiqueta: schemas.EtiquetaCreate, db: Session = Depends(database.get_db)):
    db_etiqueta = db.query(models.Etiqueta).filter(models.Etiqueta.nombre == etiqueta.nombre).first()
    if db_etiqueta:
        raise HTTPException(status_code=400, detail="Etiqueta with this name already exists")
    
    db_etiqueta = models.Etiqueta(nombre=etiqueta.nombre)
    db.add(db_etiqueta)
    db.commit()
    db.refresh(db_etiqueta)
    return db_etiqueta

@router.get("/{id}", response_model=schemas.EtiquetaOut)
def get_etiqueta(id: int, db: Session = Depends(database.get_db)):
    etiqueta = db.query(models.Etiqueta).filter(models.Etiqueta.id == id).first()
    if not etiqueta:
        raise HTTPException(status_code=404, detail="Etiqueta not found")
    return etiqueta

@router.delete("/{id}")
def delete_etiqueta(id: int, db: Session = Depends(database.get_db)):
    etiqueta = db.query(models.Etiqueta).filter(models.Etiqueta.id == id).first()
    if not etiqueta:
        raise HTTPException(status_code=404, detail="Etiqueta not found")
    db.delete(etiqueta)
    db.commit()
    return {"message": "Etiqueta deleted successfully"}
