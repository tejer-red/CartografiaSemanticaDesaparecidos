#!/usr/bin/env python3
"""
matcher.py: Motor de Cruzamiento y Matching Híbrido de la Ontología Semántica.
Combina reglas duras deterministas (Hashes exactos = 1.0) con coincidencias
espacio-temporales y sugerencias probabilísticas de IA (0.5 - 0.8).
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.ontology.models import GraphNode, GraphEdge, SemanticGraphResponse, COLOR_MAP


class OntologyMatcher:
    """Motor de cálculo de aristas y matching relacional."""

    @staticmethod
    def calculate_temporal_distance_days(date_str_1: Optional[str], date_str_2: Optional[str]) -> Optional[int]:
        """Calcula la distancia absoluta en días entre dos fechas ISO (YYYY-MM-DD)."""
        if not date_str_1 or not date_str_2:
            return None
        try:
            d1 = datetime.strptime(date_str_1[:10], "%Y-%m-%d")
            d2 = datetime.strptime(date_str_2[:10], "%Y-%m-%d")
            return abs((d1 - d2).days)
        except Exception:
            return None

    @classmethod
    def match_case_with_news(cls, case_data: Dict[str, Any], news_data: Dict[str, Any]) -> Optional[GraphEdge]:
        """
        Evalúa el grado de vinculación entre un caso de persona y una nota periodística.
        Retorna una arista con el confidence_score y estado_aprobacion correspondiente.
        """
        caso_id = case_data.get("id") or case_data.get("id_cedula_busqueda")
        news_id = news_data.get("id") or news_data.get("url")

        if not caso_id or not news_id:
            return None

        # 1. Coincidencia dura por Hash Criptográfico
        case_hashes = set(case_data.get("hashes", []))
        news_hashes = set(news_data.get("hashes", []))
        common_hashes = case_hashes.intersection(news_hashes)

        if common_hashes:
            return GraphEdge(
                id=f"edge_exact_{caso_id}_{news_id}",
                source=str(caso_id),
                target=str(news_id),
                relation_type="COINCIDENCIA_HASH_EXACTA",
                confidence_score=1.0,
                estado_aprobacion="APROBADO",
                label=f"Hash Compartido ({len(common_hashes)})"
            )

        # 2. Coincidencia Espacio-Temporal
        mpio_caso = (case_data.get("municipio") or "").strip().upper()
        mpio_news = (news_data.get("municipio") or "").strip().upper()
        colonia_caso = (case_data.get("colonia") or "").strip().upper()
        colonia_news = (news_data.get("colonia") or "").strip().upper()

        mismo_mpio = mpio_caso and mpio_news and (mpio_caso in mpio_news or mpio_news in mpio_caso)
        misma_colonia = colonia_caso and colonia_news and (colonia_caso == colonia_news)

        dias = cls.calculate_temporal_distance_days(
            case_data.get("fecha_desaparicion"),
            news_data.get("fecha")
        )

        # Mismo municipio y misma colonia dentro de 30 días
        if mismo_mpio and misma_colonia and dias is not None and dias <= 30:
            return GraphEdge(
                id=f"edge_geo_{caso_id}_{news_id}",
                source=str(caso_id),
                target=str(news_id),
                relation_type="ALTA_PROXIMIDAD_LOCAL",
                confidence_score=0.90,
                estado_aprobacion="APROBADO",
                label=f"Misma Colonia (Δ {dias} días)"
            )

        # Mismo municipio y ventana temporal corta (<= 15 días)
        if mismo_mpio and dias is not None and dias <= 15:
            return GraphEdge(
                id=f"edge_temp_{caso_id}_{news_id}",
                source=str(caso_id),
                target=str(news_id),
                relation_type="VENTANA_TEMPORAL_CERCANA",
                confidence_score=0.75,
                estado_aprobacion="SUGERIDO",
                label=f"Mismo Municipio (Δ {dias} días)"
            )

        # Mismo municipio y ventana temporal extendida (<= 60 días)
        if mismo_mpio and dias is not None and dias <= 60:
            return GraphEdge(
                id=f"edge_sugg_{caso_id}_{news_id}",
                source=str(caso_id),
                target=str(news_id),
                relation_type="SUGERENCIA_HIPOTESIS",
                confidence_score=0.60,
                estado_aprobacion="SUGERIDO",
                label=f"Hipótesis Área (Δ {dias} días)"
            )

        return None

    @classmethod
    def build_subgraph_lazy(cls, center_id: str, depth: int = 1, nodes_pool: List[Dict[str, Any]] = None, edges_pool: List[Dict[str, Any]] = None) -> SemanticGraphResponse:
        """
        Construye el sub-grafo perezoso (Lazy-load) centrado en un nodo específico para Sigma.js.
        Solo incluye los vecinos a 1 o 2 grados de separación, garantizando fluidez visual.
        """
        nodes_pool = nodes_pool or []
        edges_pool = edges_pool or []

        visited_nodes = {center_id}
        result_edges = []

        # Buscar aristas incidentes al centro
        for edge in edges_pool:
            src = str(edge.get("source"))
            tgt = str(edge.get("target"))

            if src == center_id or tgt == center_id:
                result_edges.append(edge)
                visited_nodes.add(src)
                visited_nodes.add(tgt)

        # Si depth > 1, buscar aristas de segundo orden
        if depth > 1:
            second_order_nodes = set(visited_nodes)
            for edge in edges_pool:
                src = str(edge.get("source"))
                tgt = str(edge.get("target"))
                if src in second_order_nodes or tgt in second_order_nodes:
                    if edge not in result_edges:
                        result_edges.append(edge)
                    visited_nodes.add(src)
                    visited_nodes.add(tgt)

        # Filtrar nodos resultantes
        result_nodes = [n for n in nodes_pool if str(n.get("id")) in visited_nodes]

        return SemanticGraphResponse(
            nodes=result_nodes,
            edges=result_edges,
            total_nodes=len(result_nodes),
            total_edges=len(result_edges),
            cluster_mode=False
        )

    @classmethod
    def build_cluster_supernodes(cls, cases: List[Dict[str, Any]]) -> SemanticGraphResponse:
        """
        Genera la vista agregada de Red Global con Súper-Nodos / Clustering Semántico por Municipio.
        Permite explorar miles de casos agrupados sin saturar el WebGL ni la GPU del navegador.
        """
        clusters: Dict[str, List[Dict[str, Any]]] = {}

        for c in cases:
            mpio = (c.get("municipio") or "SIN_MUNICIPIO").strip().upper()
            if mpio not in clusters:
                clusters[mpio] = []
            clusters[mpio].append(c)

        nodes = []
        edges = []

        # Crear súper-nodos municipales
        angle_step = 6.28318 / max(len(clusters), 1)
        import math

        for idx, (mpio, cluster_cases) in enumerate(clusters.items()):
            count = len(cluster_cases)
            node_id = f"supernode_{mpio}"
            # Disposición circular inicial
            x = 300.0 * math.cos(idx * angle_step)
            y = 300.0 * math.sin(idx * angle_step)
            size = min(max(count * 0.5, 15.0), 50.0)

            node = GraphNode(
                id=node_id,
                label=f"{mpio} ({count} casos)",
                type="MUNICIPIO",
                x=x,
                y=y,
                size=size,
                color=COLOR_MAP["MUNICIPIO"],
                metadata={"municipio": mpio, "casos_count": count}
            )
            nodes.append(node.to_sigma_dict())

        return SemanticGraphResponse(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=0,
            cluster_mode=True
        )


ontology_matcher_service = OntologyMatcher()
