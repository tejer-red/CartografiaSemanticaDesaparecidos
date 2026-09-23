#!/usr/bin/env python3
"""
semantic_enricher.py: Enriquecedor Semántico de Ontología con vLLM Local.
Extrae redes relacionales profundas (Familiares, Amigos, Testigos, Lugares y Objetos/Vehículos)
y resuelve la desambiguación de nombres comunes/apodos mediante Hashes Contextuales Compuestos.
"""

import os
import re
import json
import urllib.request
from typing import Dict, Any, List, Optional
from backend.app.ner.anonymizer import compute_entity_hash, normalize_entity_text

VLLM_API_BASE = os.getenv("VLLM_API_BASE", "http://127.0.0.1:8000/v1").rstrip("/")
VLLM_MODEL = os.getenv("VLLM_MODEL", "architect:latest")

# Nombres de pila y apodos de alta frecuencia en México que requieren desambiguación obligatoria
NOMBRES_COMUNES_ALTA_FRECUENCIA = {
    "JUAN", "JOSÉ", "JOSE", "MARÍA", "MARIA", "JESÚS", "JESUS", "FRANCISCO", "CARLOS",
    "PEDRO", "LUIS", "MIGUEL", "JORGE", "FERNANDO", "MANUEL", "ANTONIO", "GUADALUPE",
    "EL CHINO", "EL GÜERO", "EL GUERO", "EL FLACO", "EL NEGRO", "EL MORENO", "EL CHATO"
}


class SemanticEnricher:
    """Motor de enriquecimiento ontológico asistido por LLM y desambiguación relacional."""

    def __init__(self, api_base: str = VLLM_API_BASE, model: str = VLLM_MODEL):
        self.api_base = api_base
        self.model = model

    @staticmethod
    def is_ambiguous_name(name: str) -> bool:
        """Determina si un nombre es mono-palabra o apodo genérico con alto riesgo de colisión."""
        clean = normalize_entity_text(name)
        parts = clean.split()
        if len(parts) <= 1:
            return True
        if clean in NOMBRES_COMUNES_ALTA_FRECUENCIA:
            return True
        return False

    @classmethod
    def compute_contextual_hash(cls, entity_text: str, entity_type: str, case_id: str, salt: Optional[str] = None) -> str:
        """
        Calcula un hash compuesto para entidades débiles/ambiguas.
        Si la entidad es ambigua (ej. 'JUAN' o 'EL CHINO'), se ata al contexto del caso para evitar
        falsa convergencia en el grafo. Si es una entidad fuerte (ej. con dos apellidos o placa),
        mantiene el hash global.
        """
        clean = normalize_entity_text(entity_text)
        if cls.is_ambiguous_name(clean):
            # Hash compuesto dependiente del caso
            compound_payload = f"CTX:{case_id}:{clean}"
            return compute_entity_hash(compound_payload, entity_type, salt)
        return compute_entity_hash(clean, entity_type, salt)

    def extract_relational_network_llm(self, text: str) -> Dict[str, Any]:
        """
        Envía el texto de la cédula al vLLM local para extraer la red de
        personas relacionadas, lugares clave y objetos/vehículos involucrados.
        """
        prompt = f"""Eres un analista de inteligencia forense y ontología de desaparición de personas.
Analiza la siguiente ficha de búsqueda y extrae la red relacional de entidades en formato JSON estricto.

Estructura requerida:
{{
  "sujeto_principal": "nombre de la persona buscada",
  "personas_relacionadas": [
    {{"nombre": "nombre o rol (ej. Padre, Reportante, Hermano, Juan)", "rol": "FAMILIAR|AMIGO|TESTIGO|SOSPECHOSO|COMPAÑERO", "parentesco": "PADRE|MADRE|HIJO|HERMANO|CONOCIDO|DESCONOCIDO"}}
  ],
  "lugares": [
    {{"descripcion": "dirección o cruce específico", "tipo_lugar": "DOMICILIO|VIA_PUBLICA|TRABAJO|DESCONOCIDO", "rol": "LUGAR_ULTIMO_AVISTAMIENTO|DOMICILIO_HABITUAL|LUGAR_HECHOS"}}
  ],
  "objetos_e_indicios": [
    {{"descripcion": "descripción del objeto (ej. Carro rojo polarizado, Motocicleta Italika, Mochila)", "tipo_objeto": "VEHICULO|ARMA|PRENDA|OTRO", "rol": "TRANSPORTE_HECHOS|PORTADA|EXTRAIDA"}}
  ]
}}

FICHA:
{text}
"""
        endpoint = f"{self.api_base}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "Eres un extractor de grafos forenses. Devuelve ÚNICAMENTE el objeto JSON sin texto antes ni después."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 700
        }

        fallback_result = {
            "sujeto_principal": "",
            "personas_relacionadas": [],
            "lugares": [],
            "objetos_e_indicios": []
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                endpoint,
                data=req_data,
                headers={"Content-Type": "application/json", "User-Agent": "CartografiaEnricher/1.0"}
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                if response.status == 200:
                    resp_json = json.loads(response.read().decode("utf-8"))
                    content = resp_json["choices"][0]["message"]["content"].strip()
                    if content.startswith("```"):
                        content = re.sub(r"^```[a-zA-Z]*\n", "", content)
                        content = re.sub(r"```$", "", content).strip()
                    return json.loads(content)
        except Exception as e:
            print(f"[WARN] Error al consultar vLLM para extracción relacional: {e}")

        return fallback_result

    def generate_graph_triplets(self, case_id: str, case_text: str) -> List[Dict[str, Any]]:
        """
        Combina la extracción del LLM con el hashing contextual para generar
        tripletas de grafo listas para insertar en la tabla `vinculos_entidades`.
        """
        extracted = self.extract_relational_network_llm(case_text)
        triplets = []

        # 1. Tripletas de Personas Relacionadas (Familiares, Amigos, Testigos)
        for p in extracted.get("personas_relacionadas", []):
            p_name = p.get("nombre", "").strip()
            if not p_name:
                continue
            is_ambig = self.is_ambiguous_name(p_name)
            p_hash = self.compute_contextual_hash(p_name, "NOMBRE", case_id)
            target_node = f"PERSONA_HASH_{p_hash}"
            
            triplets.append({
                "source_node": f"CASO_{case_id}",
                "source_type": "CASO",
                "target_node": target_node,
                "target_type": "PERSONA_RELACIONADA",
                "relation_type": f"RELACIONADO_CON_{p.get('rol', 'CONTACTO')}",
                "confidence_score": 0.85 if not is_ambig else 0.70,
                "estado_aprobacion": "APROBADO" if not is_ambig else "SUGERIDO",
                "metadata_relacion": {
                    "nombre_original": p_name,
                    "rol": p.get("rol"),
                    "parentesco": p.get("parentesco"),
                    "es_ambiguo": is_ambig
                }
            })

        # 2. Tripletas de Lugares (Domicilio, Vía Pública, Lugar de Hechos)
        for l in extracted.get("lugares", []):
            l_desc = l.get("descripcion", "").strip()
            if not l_desc:
                continue
            l_hash = compute_entity_hash(l_desc, "DOMICILIO")
            target_node = f"DOMICILIO_HASH_{l_hash}"
            
            triplets.append({
                "source_node": f"CASO_{case_id}",
                "source_type": "CASO",
                "target_node": target_node,
                "target_type": "LUGAR",
                "relation_type": l.get("rol", "LUGAR_ASOCIADO"),
                "confidence_score": 0.90,
                "estado_aprobacion": "APROBADO",
                "metadata_relacion": {
                    "descripcion": l_desc,
                    "tipo_lugar": l.get("tipo_lugar"),
                    "rol": l.get("rol")
                }
            })

        # 3. Tripletas de Objetos e Indicios (Vehículos, Armas, Pertenencias)
        for o in extracted.get("objetos_e_indicios", []):
            o_desc = o.get("descripcion", "").strip()
            if not o_desc:
                continue
            o_hash = compute_entity_hash(o_desc, "OBJETO")
            target_node = f"INDICIO_HASH_{o_hash}"
            
            triplets.append({
                "source_node": f"CASO_{case_id}",
                "source_type": "CASO",
                "target_node": target_node,
                "target_type": "INDICIO_OBJETO",
                "relation_type": f"INVOLUCRA_{o.get('tipo_objeto', 'OBJETO')}",
                "confidence_score": 0.80,
                "estado_aprobacion": "SUGERIDO" if o.get("tipo_objeto") == "VEHICULO" else "APROBADO",
                "metadata_relacion": {
                    "descripcion": o_desc,
                    "tipo_objeto": o.get("tipo_objeto"),
                    "rol": o.get("rol")
                }
            })

        return triplets
