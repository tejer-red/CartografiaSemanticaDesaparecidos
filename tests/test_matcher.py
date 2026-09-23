import pytest
from backend.app.ontology.matcher import OntologyMatcher


def test_temporal_distance_days():
    """Verifica el cálculo de días entre dos fechas ISO."""
    dias = OntologyMatcher.calculate_temporal_distance_days("2024-10-30", "2024-11-15")
    assert dias == 16

    dias_inv = OntologyMatcher.calculate_temporal_distance_days("2024-11-15", "2024-10-30")
    assert dias_inv == 16


def test_exact_hash_match():
    """Verifica que coincidencia de hashes produzca arista sólida (confianza 1.0, APROBADO)."""
    case = {"id": "caso-1", "hashes": ["HASH_DOM_a8f3b", "HASH_NOM_7f8a"]}
    news = {"id": "noticia-1", "hashes": ["HASH_DOM_a8f3b"]}

    edge = OntologyMatcher.match_case_with_news(case, news)
    assert edge is not None
    assert edge.confidence_score == 1.0
    assert edge.estado_aprobacion == "APROBADO"
    assert edge.relation_type == "COINCIDENCIA_HASH_EXACTA"


def test_spatial_temporal_match():
    """Verifica coincidencias geográficas y temporales sin hash exacto."""
    case = {
        "id": "caso-2",
        "municipio": "SAN PEDRO TLAQUEPAQUE",
        "colonia": "NUEVA SANTA MARIA",
        "fecha_desaparicion": "2024-10-30"
    }
    news = {
        "id": "noticia-2",
        "municipio": "TLAQUEPAQUE",
        "colonia": "NUEVA SANTA MARIA",
        "fecha": "2024-11-10"
    }

    edge = OntologyMatcher.match_case_with_news(case, news)
    assert edge is not None
    assert edge.confidence_score == 0.90
    assert edge.estado_aprobacion == "APROBADO"


def test_lazy_subgraph_builder():
    """Verifica la construcción del sub-grafo perezoso centrado en un nodo."""
    nodes = [
        {"id": "c1", "label": "Caso 1", "type": "PERSONA"},
        {"id": "h1", "label": "Hash 1", "type": "HASH_DOMICILIO"},
        {"id": "n1", "label": "Noticia 1", "type": "NOTICIA"},
        {"id": "c_aislado", "label": "Caso Aislado", "type": "PERSONA"}
    ]
    edges = [
        {"id": "e1", "source": "c1", "target": "h1"},
        {"id": "e2", "source": "h1", "target": "n1"}
    ]

    subgraph = OntologyMatcher.build_subgraph_lazy("c1", depth=1, nodes_pool=nodes, edges_pool=edges)
    node_ids = [n["id"] for n in subgraph.nodes]

    assert "c1" in node_ids
    assert "h1" in node_ids
    assert "c_aislado" not in node_ids, "Nodos inconexos no deben cargarse en modo lazy"
