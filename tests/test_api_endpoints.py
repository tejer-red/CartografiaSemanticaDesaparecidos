import os
import pytest
from fastapi.testclient import TestClient

os.environ["TESTING"] = "true"
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verifica que el endpoint /api/v1/health responda 200 OK y estado healthy."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["ner_anonymizer"] == "active"
    assert data["osint_miners"] == "active"


def test_anonymize_endpoint():
    """Verifica el endpoint POST /api/v1/anonymize."""
    payload = {
        "text": "Refiere la reportante que el 15 de marzo del 2024 salio de calle Morelos 123",
        "store_in_registry": False
    }
    response = client.post("/api/v1/anonymize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "text_anonimizado" in data
    assert "hash_mappings" in data
    assert data["total_redactions"] >= 1


def test_osint_generate_queries_endpoint():
    """Verifica el endpoint POST /api/v1/osint/generate-queries."""
    payload = {
        "municipio": "SAN PEDRO TLAQUEPAQUE",
        "colonias": ["NUEVA SANTA MARIA"],
        "domicilios": [{"calle_raw": "OTHÓN BLANCO #189"}],
        "fecha_desaparicion": "2024-10-30"
    }
    response = client.post("/api/v1/osint/generate-queries", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "queries" in data
    assert len(data["queries"]) >= 1


def test_ontology_endpoints():
    """Verifica los endpoints de subgrafo y supernodos de la ontología."""
    resp_sub = client.get("/api/v1/ontology/subgraph?center_id=caso-123&depth=1")
    assert resp_sub.status_code == 200
    sub_data = resp_sub.json()
    assert "nodes" in sub_data
    assert "edges" in sub_data

    resp_super = client.get("/api/v1/ontology/supernodes")
    assert resp_super.status_code == 200
    super_data = resp_super.json()
    assert "nodes" in super_data
    assert super_data["cluster_mode"] is True
