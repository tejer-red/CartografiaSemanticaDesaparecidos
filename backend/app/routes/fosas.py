from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database

router = APIRouter()

@router.get("", response_model=List[schemas.FosaOut])
def get_fosas(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Fosa).offset(skip).limit(limit).all()

@router.post("", response_model=schemas.FosaOut)
def create_fosa(fosa: schemas.FosaCreate, db: Session = Depends(database.get_db)):
    db_fosa = models.Fosa(**fosa.dict())
    db.add(db_fosa)
    db.commit()
    db.refresh(db_fosa)
    return db_fosa

@router.get("/{id}", response_model=schemas.FosaOut)
def get_fosa(id: int, db: Session = Depends(database.get_db)):
    fosa = db.query(models.Fosa).filter(models.Fosa.id == id).first()
    if not fosa:
        raise HTTPException(status_code=404, detail="Fosa not found")
    return fosa

@router.delete("/{id}")
def delete_fosa(id: int, db: Session = Depends(database.get_db)):
    fosa = db.query(models.Fosa).filter(models.Fosa.id == id).first()
    if not fosa:
        raise HTTPException(status_code=404, detail="Fosa not found")
    db.delete(fosa)
    db.commit()
    return {"message": "Fosa deleted successfully"}
