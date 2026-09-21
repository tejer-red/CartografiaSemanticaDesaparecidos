#!/usr/bin/env python3
"""
query_generator.py: Generador de búsquedas dirigidas (OSINT) a partir de entidades extraídas.
Toma entidades geográficas (municipio, colonia, cruces), temporales y señas,
y formula consultas booleanas optimizadas para hemerotecas, motores de búsqueda y RSS.
"""

from typing import List, Dict, Any, Optional


def build_news_search_queries(
    municipio: Optional[str] = None,
    colonia: Optional[str] = None,
    domicilio: Optional[str] = None,
    ano_fecha: Optional[str] = None,
    terminos_extra: Optional[List[str]] = None
) -> List[Dict[str, str]]:
    """
    Construye variantes de queries para localizar notas periodísticas relacionadas.
    """
    queries = []
    base_terms = '("desaparecido" OR "hallazgo" OR "restos" OR "fosa" OR "operativo")'

    # Query 1: Alta precisión geográfica (Colonia + Municipio)
    if colonia and municipio:
        q = f'"{colonia}" "{municipio}" {base_terms}'
        if ano_fecha:
            q += f' "{ano_fecha}"'
        queries.append({
            "tipo": "ALTA_PRECISION_LOCAL",
            "query": q,
            "objetivo": "Buscar notas de prensa en la colonia y municipio específicos"
        })

    # Query 2: Cruce de vialidades o domicilio específico
    if domicilio and municipio:
        # Extraer nombres de calles o avenidas si existen
        q = f'"{domicilio}" "{municipio}"'
        queries.append({
            "tipo": "DIRECCION_ESPECIFICA",
            "query": q,
            "objetivo": "Verificar reportes policiales en la vía o predio exacto"
        })

    # Query 3: Municipio + Hallazgos recientes / fosas
    if municipio:
        q = f'"{municipio}" ("fosa clandestina" OR "restos humanos" OR "cuerpo localizado")'
        if ano_fecha:
            q += f' "{ano_fecha}"'
        queries.append({
            "tipo": "HALLAZGOS_MUNICIPIO",
            "query": q,
            "objetivo": "Mapear hallazgos de fosas en el municipio que coincidan temporalmente"
        })

    return queries


if __name__ == "__main__":
    test_queries = build_news_search_queries(
        municipio="SAN PEDRO TLAQUEPAQUE",
        colonia="NUEVA SANTA MARIA",
        domicilio="CALLE OTHÓN BLANCO",
        ano_fecha="2024"
    )
    for q in test_queries:
        print(f"[{q['tipo']}] -> {q['query']}")
