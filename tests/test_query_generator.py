import pytest
from backend.app.miners.query_generator import OSINTQueryGenerator


def test_canonical_municipio_query():
    """Verifica que los municipios se expandan a sus variantes booleanas."""
    tlaq = OSINTQueryGenerator.get_canonical_municipio_query("SAN PEDRO TLAQUEPAQUE")
    assert '"Tlaquepaque"' in tlaq
    assert '"San Pedro Tlaquepaque"' in tlaq

    tlajo = OSINTQueryGenerator.get_canonical_municipio_query("TLAJOMULCO DE ZÚÑIGA")
    assert '"Tlajomulco"' in tlajo


def test_clean_street_name():
    """Verifica la eliminación de prefijos y números en calles."""
    c1 = OSINTQueryGenerator.clean_street_name("CALLE OTHÓN BLANCO #189 INT 4")
    assert c1 == "OTHÓN BLANCO"

    c2 = OSINTQueryGenerator.clean_street_name("AVENIDA SIERRA LEONA 2171")
    assert c2 == "SIERRA LEONA"


def test_generate_queries_for_case():
    """Verifica la generación de los 3 niveles de queries booleanas."""
    case_data = {
        "municipio": "SAN PEDRO TLAQUEPAQUE",
        "colonias": ["NUEVA SANTA MARIA"],
        "domicilios": [{"calle_raw": "CALLE OTHÓN BLANCO #189"}],
        "fecha_desaparicion": "2024-10-30"
    }

    queries = OSINTQueryGenerator.generate_queries_for_case(case_data)
    assert len(queries) == 3, "Deben generarse 3 niveles de consulta"

    niveles = [q["nivel"] for q in queries]
    assert 1 in niveles
    assert 2 in niveles
    assert 3 in niveles

    q1 = next(q for q in queries if q["nivel"] == 1)
    assert "Tlaquepaque" in q1["query"]
    assert "NUEVA SANTA MARIA" in q1["query"]
    assert "OTHÓN BLANCO" in q1["query"]
    assert "fosa clandestina" in q1["query"]
