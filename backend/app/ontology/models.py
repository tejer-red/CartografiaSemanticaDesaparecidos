#!/usr/bin/env python3
"""
models.py (Ontología): Definición de Nodos y Aristas del Grafo Semántico.
Provee serialización a formato Sigma.js / ForceAtlas2 y Cytoscape.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Colores estándar para Sigma.js en Cartografía Semántica
COLOR_MAP = {
    "PERSONA": "#e63946",       # Rojo alerta
    "HASH_DOMICILIO": "#457b9d",# Azul institucional
    "NOTICIA": "#f4a261",       # Naranja prensa
    "FOSA": "#2a9d8f",          # Verde esmeralda hallazgo
    "MUNICIPIO": "#6d6875",     # Gris super-nodo
    "SUGERENCIA": "#9d4edd"     # Morado IA sugerido
}


class GraphNode(BaseModel):
    """Representación de un nodo en el Grafo Semántico."""
    id: str
    label: str
    type: str  # PERSONA, HASH_DOMICILIO, NOTICIA, FOSA, MUNICIPIO
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    size: float = 10.0
    color: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_sigma_dict(self) -> Dict[str, Any]:
        """Convierte a formato esperado por Sigma.js."""
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type,
            "x": self.x or 0.0,
            "y": self.y or 0.0,
            "size": self.size,
            "color": self.color or COLOR_MAP.get(self.type, "#4a4e69"),
            "metadata": self.metadata
        }


class GraphEdge(BaseModel):
    """Representación de una arista entre nodos."""
    id: str
    source: str
    target: str
    relation_type: str  # OCURRIO_EN, MENCIONA_A, VINCULADO_A, COINCIDENCIA_ESPACIAL
    confidence_score: float = 1.0
    estado_aprobacion: str = "APROBADO"  # APROBADO (Sólida), SUGERIDO (Punteada), DESCARTADO
    label: Optional[str] = None

    def to_sigma_dict(self) -> Dict[str, Any]:
        """Convierte a formato esperado por Sigma.js."""
        # Si es sugerida, usar estilo punteado/dashed en la visualización
        is_dashed = self.estado_aprobacion == "SUGERIDO"
        color = "#9d4edd" if is_dashed else "#adb5bd"
        return {
            "id": self.id,
            "source": self.source,
            "target": self.target,
            "label": self.label or self.relation_type,
            "size": 2.0 if not is_dashed else 1.2,
            "color": color,
            "type": "dashed" if is_dashed else "line",
            "confidence": self.confidence_score,
            "estado": self.estado_aprobacion
        }


class SemanticGraphResponse(BaseModel):
    """Respuesta completa del grafo serializado para el frontend."""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    total_nodes: int
    total_edges: int
    cluster_mode: bool = False
