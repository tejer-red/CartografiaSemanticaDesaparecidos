#!/usr/bin/env python3
"""
cluster_correlator.py: Motor de Correlación Espacio-Temporal y Deducción con vLLM.
Identifica clusters de casos que comparten:
1. Mismo DOMICILIO_HASH exacto o centroide de localización.
2. Mismo Municipio + Misma Fecha (o ventana de +-3 días).
3. Utiliza vLLM local para deducir eventos compartidos (DESAPARICION_CONJUNTA, FAMILIARES, MISMO HECHO)
   e inserta las aristas resultantes en la tabla `vinculos_entidades`.
"""

import os
import re
import json
import urllib.request
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models import Caso, VinculoEntidad

VLLM_API_BASE = os.getenv("VLLM_API_BASE", "http://127.0.0.1:8000/v1").rstrip("/")
VLLM_MODEL = os.getenv("VLLM_MODEL", "architect:latest")

class ClusterCorrelator:
    """Detecta y correlaciona grupos de casos con alta probabilidad de vínculo."""

    def __init__(self, api_base: str = VLLM_API_BASE, model: str = VLLM_MODEL):
        self.api_base = api_base
        self.model = model

    def analyze_cluster_with_llm(self, cluster_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Envía un grupo de casos concurrentes al LLM local para validar si comparten el mismo hecho."""
        cases_text = ""
        for i, c in enumerate(cluster_cases, 1):
            cases_text += f"\nCASO {i} [ID: {c['id']} | Fecha: {c.get('fecha')} | Mpio: {c.get('municipio')}]:\n{c['texto'][:500]}\n"

        prompt = f"""Eres un analista forense y perito en investigación de desaparición de personas.
Analiza este grupo de cédulas ocurridas en la misma zona geográfica y ventana temporal.
Determina si corresponden a un mismo evento (ej. desaparición simultánea, familiares directos, mismo domicilio/vehículo) y sintetiza la relación:

{cases_text}

Responde ÚNICAMENTE un JSON válido con la siguiente estructura:
{{
  "evento_compartido": true|false,
  "tipo_relacion": "DESAPARICION_CONJUNTA|FAMILIARES_DIRECTOS|COINCIDENCIA_ESPACIAL|SIN_RELACION",
  "confianza": 0.0 a 1.0,
  "justificacion": "breve explicación forense de los hechos que los conectan",
  "aristas_sugeridas": [
    {{"source": "id_caso_A", "target": "id_caso_B", "relacion": "DESAPARECIO_JUNTO_A|HERMANO_DE|PAREJA_DE|FAMILIAR_DE"}}
  ]
}}
"""
        endpoint = f"{self.api_base}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "Eres un asistente forense algorítmico experto en grafos relacionales. Responde estrictamente JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 1500
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                endpoint,
                data=req_data,
                headers={"Content-Type": "application/json", "User-Agent": "ClusterCorrelator/1.0"}
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    content = data["choices"][0]["message"]["content"].strip()
                    if content.startswith("```"):
                        content = re.sub(r"^```[a-zA-Z]*\n", "", content)
                        content = re.sub(r"```$", "", content).strip()
                    return json.loads(content)
        except Exception as e:
            print(f"[WARN] Error consultando vLLM para cluster: {e}")

        return {"evento_compartido": False, "aristas_sugeridas": []}
