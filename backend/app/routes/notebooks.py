from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import re
from typing import List
from .. import models, schemas, database

router = APIRouter()

@router.get("")
def list_notebooks(db: Session = Depends(database.get_db)):
    notebooks = db.query(models.Notebook).all()
    names = [
        {
            "name": n.id,
            "startDate": n.startDate,
            "endDate": n.endDate,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "notesCount": len(n.notes) if n.notes else 0
        }
        for n in notebooks
    ]
    return {"success": True, "notebooks": names}

@router.post("")
def save_notebook(notebook_data: schemas.NotebookCreate, db: Session = Depends(database.get_db)):
    # Sanitize the notebook name like in PHP
    sanitized_id = re.sub(r'[^a-zA-Z0-9_-]', '_', notebook_data.name)
    if not sanitized_id:
        raise HTTPException(status_code=400, detail="Invalid notebook name")
        
    db_notebook = db.query(models.Notebook).filter(models.Notebook.id == sanitized_id).first()
    if db_notebook:
        # Update existing
        db_notebook.notes = notebook_data.notes
        db_notebook.startDate = notebook_data.startDate
        db_notebook.endDate = notebook_data.endDate
    else:
        # Create new
        db_notebook = models.Notebook(
            id=sanitized_id,
            notes=notebook_data.notes,
            startDate=notebook_data.startDate,
            endDate=notebook_data.endDate
        )
        db.add(db_notebook)
        
    db.commit()
    return {"success": True, "name": sanitized_id}

@router.get("/{id}")
def load_notebook(id: str, db: Session = Depends(database.get_db)):
    notebook = db.query(models.Notebook).filter(models.Notebook.id == id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
        
    return {
        "success": True,
        "notes": notebook.notes,
        "startDate": notebook.startDate,
        "endDate": notebook.endDate
    }

@router.delete("/{id}")
def delete_notebook(id: str, db: Session = Depends(database.get_db)):
    notebook = db.query(models.Notebook).filter(models.Notebook.id == id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    db.delete(notebook)
    db.commit()
    return {"success": True, "message": "Notebook deleted successfully"}
