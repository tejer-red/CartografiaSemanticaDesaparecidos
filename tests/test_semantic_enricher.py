import pytest
from backend.app.ontology.semantic_enricher import SemanticEnricher

def test_ambiguous_name_detection():
    enricher = SemanticEnricher()
    # Nombres de una sola palabra o comunes son ambiguos
    assert enricher.is_ambiguous_name("JUAN") is True
    assert enricher.is_ambiguous_name("El Chino") is True
    assert enricher.is_ambiguous_name("Carlos") is True
    # Nombres completos con apellidos son fuertes / no ambiguos
    assert enricher.is_ambiguous_name("Carlos Daniel Mendoza") is False
    assert enricher.is_ambiguous_name("Roberto Gómez Bolaños") is False

def test_contextual_hashing_prevents_false_convergence():
    enricher = SemanticEnricher()
    # Dos "JUAN" en diferentes casos deben generar hashes contextuales distintos
    hash_caso1 = enricher.compute_contextual_hash("JUAN", "NOMBRE", case_id="CASO-A")
    hash_caso2 = enricher.compute_contextual_hash("JUAN", "NOMBRE", case_id="CASO-B")
    assert hash_caso1 != hash_caso2, "Los nombres ambiguos en casos distintos deben tener hashes diferentes"

    # Dos personas con nombre completo único deben converger si coinciden
    hash_global1 = enricher.compute_contextual_hash("Roberto Gómez Bolaños", "NOMBRE", case_id="CASO-A")
    hash_global2 = enricher.compute_contextual_hash("Roberto Gómez Bolaños", "NOMBRE", case_id="CASO-B")
    assert hash_global1 == hash_global2, "Los nombres fuertes deben compartir hash global"
