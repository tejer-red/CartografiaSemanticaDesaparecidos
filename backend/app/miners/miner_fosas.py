#!/usr/bin/env python3
"""
miner_fosas.py: Ingestor y estructurador de registros de fosas clandestinas y hallazgos.
Permite vincular reportes oficiales de la Fiscalía, colectivos de búsqueda y notas forenses.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

# Coordenadas centroides aproximadas por municipio para georreferenciación de fallback
CENTROIDES_MUNICIPIOS = {
    "GUADALAJARA": (20.6767, -103.3475),
    "ZAPOPAN": (20.7225, -103.3928),
    "SAN PEDRO TLAQUEPAQUE": (20.6408, -103.3125),
    "TLAQUEPAQUE": (20.6408, -103.3125),
    "TONALA": (20.6244, -103.2422),
    "TONALÁ": (20.6244, -103.2422),
    "TLAJOMULCO DE ZÚÑIGA": (20.4744, -103.4475),
    "TLAJOMULCO": (20.4744, -103.4475),
    "EL SALTO": (20.5186, -103.1814),
    "IXTLAHUACÁN DE LOS MEMBRILLOS": (20.3861, -103.1936),
    "LAGOS DE MORENO": (21.3558, -101.9333),
    "PUERTO VALLARTA": (20.6534, -105.2253)
}


class GraveMiner:
    """Gestor de ingesta y normalización de hallazgos y fosas."""

    @staticmethod
    def parse_fosa_payload(data: Dict[str, Any]) -> Dict[str, Any]:
        """Estandariza un registro de fosa o hallazgo forense."""
        municipio = data.get("municipio", "").strip().upper()
        coords_raw = data.get("coordenadas", "")

        # Si no hay coordenadas, usar centroide del municipio
        if not coords_raw and municipio in CENTROIDES_MUNICIPIOS:
            lat, lon = CENTROIDES_MUNICIPIOS[municipio]
            coords = f"{lat:.6f}, {lon:.6f}"
        else:
            coords = coords_raw or "20.659698, -103.349609"

        return {
            "municipio": municipio,
            "coordenadas": coords,
            "fecha_hallazgo": data.get("fecha_hallazgo"),
            "total_fosas": int(data.get("total_fosas", 1)),
            "total_cuerpos": int(data.get("total_cuerpos", 0)),
            "total_restos_fragmentos": int(data.get("total_restos_fragmentos", 0)),
            "estado": data.get("estado", "JALISCO"),
            "fuente_reporte": data.get("fuente_reporte", "OFICIAL/COLECTIVO")
        }


grave_miner_service = GraveMiner()
