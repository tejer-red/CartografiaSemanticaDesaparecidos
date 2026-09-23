#!/usr/bin/env python3
"""
osint.py: Endpoints REST para generación de consultas booleanas, minería bajo demanda e hipótesis.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.miners.query_generator import OSINTQueryGenerator
from backend.app.miners.worker import MiningWorker
from backend.app.ontology.hypothesis import hypothesis_engine

router = APIRouter(prefix="/osint", tags=["Minería OSINT e Inteligencia"])
worker_instance = MiningWorker()


class GenerateQueriesRequest(BaseModel):
    municipio: Optional[str] = None
    colonias: List[str] = Field(default_factory=list)
    domicilios: List[Dict[str, Any]] = Field(default_factory=list)
    fecha_desaparicion: Optional[str] = None


class MineOnDemandRequest(BaseModel):
    caso_id: str
    query: str
    prioridad: str = "ALTA"


@router.post("/generate-queries")
def generate_queries_endpoint(payload: GenerateQueriesRequest):
    """
    Genera consultas booleanas de prensa en 3 niveles de precisión para un caso específico.
    """
    case_dict = payload.model_dump()
    queries = OSINTQueryGenerator.generate_queries_for_case(case_dict)
    return {"caso": case_dict, "queries": queries, "total_queries": len(queries)}


@router.post("/mine-on-demand")
def mine_on_demand_endpoint(payload: MineOnDemandRequest):
    """
    Encola una tarea de minería con prioridad ALTA disparada a demanda por el analista desde la UI.
    """
    task = {
        "caso_id": payload.caso_id,
        "query": payload.query,
        "prioridad": payload.prioridad
    }
    enqueued = worker_instance.enqueue_task(task, priority="ALTA")

    # Si Redis no está disponible, procesar síncronamente
    if not enqueued:
        result = worker_instance.process_single_task(task)
        return {"status": "PROCESADO_LOCAL", "resultado": result}

    return {"status": "ENCOLADO_PRIORIDAD_ALTA", "task": task}


@router.get("/hypothesis/{municipio}")
def get_hypothesis_endpoint(municipio: str, colonia: Optional[str] = None, fecha: Optional[str] = None):
    """
    Obtiene una hipótesis investigativa asistida por vLLM local para una zona y fecha.
    """
    case_data = {
        "municipio": municipio,
        "colonias": [colonia] if colonia else [],
        "fecha_desaparicion": fecha
    }
    hypothesis = hypothesis_engine.generate_llm_hypothesis(case_data)
    return hypothesis
