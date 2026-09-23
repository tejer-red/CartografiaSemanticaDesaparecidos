#!/usr/bin/env python3
"""
anonymizer.py: Motor de Anonimización de Información Personal Identificable (PII).
Utiliza detección NER (GLiNER / Heurísticas) y sustitución determinista mediante HMAC-SHA256
con una sal criptográfica compartida (PII_GLOBAL_SALT).

Garantiza:
1. Reemplazo determinista: La misma entidad produce el mismo token hash.
2. Inviolabilidad de offsets: Los reemplazos se aplican de derecha a izquierda.
3. Generación de diccionario criptográfico para poblar la tabla `pii_hash_registry`.
4. Soporte para modo standalone / desacoplable sin dependencias obligatorias de GPU.
"""

import os
import re
import hmac
import hashlib
from typing import Dict, List, Tuple, Any, Optional

DEFAULT_SALT = os.getenv("PII_GLOBAL_SALT", "tejer_secret_salt_2026_cartografia_semantica")

# Expresiones regulares de respaldo para extracción sin modelo cargado
PATTERNS = {
    "TELEFONO": re.compile(r'(?:\+?52\s*)?(?:\(?\d{2,3}\)?[\s.-]*)?\d{3,4}[\s.-]*\d{4}\b'),
    "HORA": re.compile(r'\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s*(?:hrs|horas|am|pm|a\.m\.|p\.m\.))?\b', re.IGNORECASE),
    "FECHA": re.compile(r'\b(?:\d{1,2}\s+de\s+[a-záéíóú]+\s+de(?:l)?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})\b', re.IGNORECASE),
    "PLACA": re.compile(r'\b[A-Z]{3}-?\d{3,4}-?[A-Z0-9]?\b'),
    "EXP": re.compile(r'\b(?:CI|EXP|AP|C\.I\.)[-/\s:]*[A-Z0-9/-]{4,20}\b', re.IGNORECASE)
}


def normalize_entity_text(text: str) -> str:
    """Normaliza el texto de una entidad eliminando espacios redundantes y estandarizando mayúsculas."""
    if not text:
        return ""
    # Quitar signos de puntuación periféricos comunes
    clean = text.strip(" ,;.:\"'()[]{}")
    # Colapsar múltiples espacios
    clean = re.sub(r'\s+', ' ', clean)
    return clean.upper()


def compute_entity_hash(entity_text: str, entity_type: str, salt: Optional[str] = None) -> str:
    """
    Calcula un hash determinista HMAC-SHA256 para una entidad normalizada.
    Retorna los primeros 8 caracteres hexadecimales para generar un token legible.
    """
    secret = (salt or DEFAULT_SALT).encode("utf-8")
    canonical = normalize_entity_text(entity_text)
    payload = f"{entity_type.upper()}:{canonical}".encode("utf-8")
    full_digest = hmac.new(secret, payload, hashlib.sha256).hexdigest()
    return full_digest[:8]


class PIIAnonymizer:
    """
    Servicio de Anonimización PII con soporte para modelo GLiNER y reglas heurísticas.
    """

    def __init__(self, model_path: Optional[str] = None, salt: Optional[str] = None):
        self.salt = salt or os.getenv("PII_GLOBAL_SALT", DEFAULT_SALT)
        self.model = None
        self.model_loaded = False

        if model_path and os.path.exists(model_path):
            try:
                from gliner import GLiNER
                self.model = GLiNER.from_pretrained(model_path)
                self.model_loaded = True
            except Exception as e:
                print(f"[WARN] No se pudo cargar GLiNER desde {model_path}: {e}")

    def detect_entities_heuristic(self, text: str) -> List[Dict[str, Any]]:
        """Extrae entidades básicas mediante expresiones regulares si no hay modelo disponible."""
        entities = []
        for label, regex in PATTERNS.items():
            for match in regex.finditer(text):
                entities.append({
                    "start": match.start(),
                    "end": match.end(),
                    "label": label,
                    "text": match.group()
                })
        return entities

    def anonymize_text(
        self,
        text: str,
        entities: Optional[List[Dict[str, Any]]] = None,
        include_original_in_mapping: bool = True
    ) -> Dict[str, Any]:
        """
        Anonimiza un texto libre sustituyendo las entidades por tokens deterministas:
        `[DOMICILIO_HASH_a8f3b]`, `[NOMBRE_HASH_7f8a]`, etc.

        Aplica sustituciones en orden inverso de offsets para no alterar posiciones previas.
        """
        if not text:
            return {"text_anonimizado": "", "entities": [], "hash_mappings": []}

        # Si no se pasan entidades explícitas, detectarlas
        if entities is None:
            if self.model_loaded and self.model:
                try:
                    labels = ["FECHA", "HORA", "DOMICILIO", "NOMBRE", "TELEFONO", "EXP", "PLACA"]
                    gliner_ents = self.model.predict_entities(text, labels)
                    entities = [{"start": e["start"], "end": e["end"], "label": e["label"], "text": e["text"]} for e in gliner_ents]
                except Exception:
                    entities = self.detect_entities_heuristic(text)
            else:
                entities = self.detect_entities_heuristic(text)

        # Evitar solapamientos: ordenar por inicio y longitud descendente
        entities_sorted = sorted(entities, key=lambda x: (x["start"], -(x["end"] - x["start"])))
        non_overlapping = []
        last_end = -1
        for e in entities_sorted:
            if e["start"] >= last_end:
                non_overlapping.append(e)
                last_end = e["end"]

        # Crear tokens de sustitución y mappings
        hash_mappings = []
        replacements = [] # (start, end, token, label, original_text)

        for ent in non_overlapping:
            start = ent["start"]
            end = ent["end"]
            label = ent["label"]
            orig_text = text[start:end]
            canonical = normalize_entity_text(orig_text)
            
            hash_token_id = compute_entity_hash(orig_text, label, self.salt)
            token = f"[{label.upper()}_HASH_{hash_token_id}]"

            replacements.append((start, end, token, label, orig_text, hash_token_id))

            mapping = {
                "hash_id": f"{label.upper()}_HASH_{hash_token_id}",
                "entity_type": label.upper(),
                "token": token
            }
            if include_original_in_mapping:
                mapping["canonical_value"] = canonical
                mapping["raw_text"] = orig_text
            hash_mappings.append(mapping)

        # Aplicar reemplazos de DERECHA a IZQUIERDA
        chars = list(text)
        for start, end, token, _, _, _ in sorted(replacements, key=lambda x: x[0], reverse=True):
            chars[start:end] = list(token)

        anonymized_text = "".join(chars)

        return {
            "text_anonimizado": anonymized_text,
            "entities_found": non_overlapping,
            "hash_mappings": hash_mappings,
            "total_redactions": len(replacements)
        }


# Instancia global por defecto para uso directo
anonymizer_service = PIIAnonymizer()
