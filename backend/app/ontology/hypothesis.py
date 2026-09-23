#!/usr/bin/env python3
"""
hypothesis.py: Motor de Generación de Hipótesis de Investigación Asistido por LLM Local.
Se comunica mediante la red local / Tailscale con el endpoint vLLM (ia-pub.tejer.red / RTX 5060 Ti)
para cruzar el contexto de la cédula con la ontología y deducir hipótesis de búsqueda.
"""

import os
import json
import urllib.request
from typing import Dict, Any, List, Optional

VLLM_API_BASE = os.getenv("VLLM_API_BASE", "https://ia-pub.tejer.red/api/v1").rstrip("/")
VLLM_MODEL = os.getenv("VLLM_MODEL", "architect:latest")


class HypothesisEngine:
    """Motor de formulación de hipótesis analíticas asistidas por LLM."""

    def __init__(self, api_base: str = VLLM_API_BASE, model: str = VLLM_MODEL):
        self.api_base = api_base
        self.model = model

    def generate_llm_hypothesis(
        self,
        case_data: Dict[str, Any],
        nearby_findings: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Envía un prompt estructurado al vLLM local para deducir líneas de investigación y queries.
        """
        nearby_findings = nearby_findings or []
        municipio = case_data.get("municipio", "DESCONOCIDO")
        fecha = case_data.get("fecha_desaparicion", "NO_ESPECIFICADA")
        colonias = ", ".join(case_data.get("colonias", [])) or "No especificada"

        findings_summary = ""
        for f in nearby_findings[:3]:
            findings_summary += f"- Hallazgo/Fosa en {f.get('municipio')} ({f.get('fecha_hallazgo', 's/f')}): {f.get('total_cuerpos', 0)} cuerpos.\n"

        prompt = f"""Eres un analista de datos forenses y cartografía de personas desaparecidas en Jalisco.
Analiza este caso y los hallazgos en la zona para formular una hipótesis de búsqueda de prensa:

CASO:
- Municipio: {municipio}
- Colonia: {colonias}
- Fecha Desaparición: {fecha}

HALLAZGOS/FOSAS CERCANAS CONOCIDAS:
{findings_summary or "Sin hallazgos previos en la misma colonia."}

Genera un JSON estricto con:
1. "hipotesis": Una línea explicando la hipótesis investigativa.
2. "query_sugerida": Una consulta booleana optimizada para prensa.
3. "prioridad": "ALTA", "MEDIA" o "BAJA".
4. "justificacion": Breve razonamiento del cruce espacio-temporal.
Responde ÚNICAMENTE con el objeto JSON.
"""
        # Intentar llamar al vLLM local
        endpoint = f"{self.api_base}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "Eres un asistente forense experto. Devuelve únicamente JSON válido."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 400
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                endpoint,
                data=req_data,
                headers={"Content-Type": "application/json", "User-Agent": "CartografiaHypothesis/1.0"}
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status == 200:
                    resp_json = json.loads(response.read().decode("utf-8"))
                    content = resp_json["choices"][0]["message"]["content"].strip()
                    # Extraer bloque JSON
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0].strip()
                    return json.loads(content)
        except Exception:
            # Fallback determinista basado en reglas heurísticas
            pass

        # Generador de hipótesis heurístico de respaldo
        return {
            "hipotesis": f"Posible correlación con operativos o hallazgos en {municipio} cercanos a la fecha {fecha}.",
            "query_sugerida": f'"{municipio}" "{colonias}" ("fosa" OR "hallazgo" OR "cuerpo")',
            "prioridad": "ALTA" if colonias != "No especificada" else "MEDIA",
            "justificacion": f"Cruce heurístico espacio-temporal por coincidencia municipal en {municipio}."
        }


hypothesis_engine = HypothesisEngine()
