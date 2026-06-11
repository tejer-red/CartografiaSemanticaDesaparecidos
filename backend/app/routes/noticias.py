from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database

router = APIRouter()

@router.get("", response_model=List[schemas.NoticiaOut])
def get_noticias(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Noticia).offset(skip).limit(limit).all()

@router.post("", response_model=schemas.NoticiaOut)
def create_noticia(noticia: schemas.NoticiaCreate, db: Session = Depends(database.get_db)):
    db_noticia = models.Noticia(**noticia.dict())
    db.add(db_noticia)
    db.commit()
    db.refresh(db_noticia)
    return db_noticia

@router.get("/{id}", response_model=schemas.NoticiaOut)
def get_noticia(id: int, db: Session = Depends(database.get_db)):
    noticia = db.query(models.Noticia).filter(models.Noticia.id == id).first()
    if not noticia:
        raise HTTPException(status_code=404, detail="Noticia not found")
    return noticia

@router.delete("/{id}")
def delete_noticia(id: int, db: Session = Depends(database.get_db)):
    noticia = db.query(models.Noticia).filter(models.Noticia.id == id).first()
    if not noticia:
        raise HTTPException(status_code=404, detail="Noticia not found")
    db.delete(noticia)
    db.commit()
    return {"message": "Noticia deleted successfully"}
