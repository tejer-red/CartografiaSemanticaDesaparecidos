import pytest
from backend.app.ner.anonymizer import PIIAnonymizer, compute_entity_hash, normalize_entity_text


def test_compute_entity_hash_determinism():
    """Verifica que el hash sea determinista y sensible a la sal."""
    h1 = compute_entity_hash("Othón Blanco 189", "DOMICILIO", salt="sal_alpha")
    h2 = compute_entity_hash("Othón Blanco 189", "DOMICILIO", salt="sal_alpha")
    h3 = compute_entity_hash("Othón Blanco 189", "DOMICILIO", salt="sal_beta")

    assert h1 == h2, "El hash debe ser idéntico para la misma entidad y sal"
    assert h1 != h3, "Diferentes sales deben producir diferentes hashes"
    assert len(h1) == 8, "El token hash debe tener 8 caracteres hex"


def test_normalize_entity_text():
    """Verifica la limpieza de espacios y mayúsculas en entidades."""
    raw = "   calle othon blanco #189,   "
    clean = normalize_entity_text(raw)
    assert clean == "CALLE OTHON BLANCO #189"


def test_anonymize_text_exact_replacement():
    """Verifica que el texto sensible se sustituya por tokens sin alterar offsets previos."""
    anonymizer = PIIAnonymizer(salt="test_salt_123")
    sample_text = "Juan Perez salio de Calle Othon Blanco 189 el 30 de octubre del 2024"
    entities = [
        {"start": 0, "end": 10, "label": "NOMBRE", "text": "Juan Perez"},
        {"start": 20, "end": 42, "label": "DOMICILIO", "text": "Calle Othon Blanco 189"},
        {"start": 46, "end": 68, "label": "FECHA", "text": "30 de octubre del 2024"}
    ]

    result = anonymizer.anonymize_text(sample_text, entities=entities)
    anon_text = result["text_anonimizado"]

    # Ningún dato sensible debe permanecer en el texto final
    assert "Juan Perez" not in anon_text
    assert "Calle Othon Blanco" not in anon_text
    assert "30 de octubre del 2024" not in anon_text

    # Deben existir los tokens correspondientes
    assert "[NOMBRE_HASH_" in anon_text
    assert "[DOMICILIO_HASH_" in anon_text
    assert "[FECHA_HASH_" in anon_text

    # Total de reemplazos
    assert result["total_redactions"] == 3
    assert len(result["hash_mappings"]) == 3
