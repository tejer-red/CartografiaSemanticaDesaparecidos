#!/usr/bin/env python3
"""
anonymize.py: Endpoints REST para anonimización de texto libre y gestión de PII.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import PiiHashRegistry
from backend.app.ner.anonymizer import anonymizer_service

router = APIRouter(prefix="/anonymize", tags=["Anonimización PII"])


class AnonymizeRequest(BaseModel):
    text: str = Field(..., description="Texto libre o reporte que contiene PII a proteger")
    store_in_registry: bool = Field(default=False, description="Guardar el mapeo en la tabla pii_hash_registry")


class AnonymizeResponse(BaseModel):
    text_anonimizado: str
    total_redactions: int
    entities_found: List[Dict[str, Any]]
    hash_mappings: List[Dict[str, Any]]


@router.post("", response_model=AnonymizeResponse)
def anonymize_text_endpoint(payload: AnonymizeRequest, db: Session = Depends(get_db)):
    """
    Anonimiza un texto libre sustituyendo PII por tokens hashes deterministas HMAC-SHA256.
    """
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="El texto a anonimizar no puede estar vacío.")

    result = anonymizer_service.anonymize_text(payload.text)

    # Si se solicita persistencia del diccionario criptográfico
    if payload.store_in_registry and result["hash_mappings"]:
        try:
            for m in result["hash_mappings"]:
                hash_id = m.get("hash_id")
                entity_type = m.get("entity_type")
                canonical = m.get("canonical_value")

                # Comprobar si ya existe
                existing = db.query(PiiHashRegistry).filter(PiiHashRegistry.hash_id == hash_id).first()
                if not existing:
                    entry = PiiHashRegistry(
                        hash_id=hash_id,
                        entity_type=entity_type,
                        canonical_value=canonical,
                        salt_version=1
                    )
                    db.add(entry)
            db.commit()
        except Exception:
            db.rollback()

    return AnonymizeResponse(
        text_anonimizado=result["text_anonimizado"],
        total_redactions=result["total_redactions"],
        entities_found=result["entities_found"],
        hash_mappings=result["hash_mappings"]
    )
