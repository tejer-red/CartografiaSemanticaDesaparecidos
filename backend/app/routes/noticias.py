from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from .. import models, schemas, database

router = APIRouter()

@router.get("", response_model=List[schemas.NoticiaOut])
def get_noticias(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    print(f"[API] get_noticias called with start_date={start_date}, end_date={end_date}")
    query = db.query(models.Noticia)
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
            # Retrieve news from start_date - 183 days (6 months) up to end_date to cover 6-month visibility
            adjusted_start = start_dt - timedelta(days=183)
            print(f"[API] Date filtering range: adjusted_start={adjusted_start} to end_dt={end_dt}")
            query = query.filter(models.Noticia.fecha.between(adjusted_start, end_dt))
        except ValueError as e:
            print(f"[API] Error parsing dates: {e}")
            pass
    results = query.offset(skip).limit(limit).all()
    print(f"[API] Returning {len(results)} noticias.")
    return results

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
