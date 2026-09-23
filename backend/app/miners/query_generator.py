#!/usr/bin/env python3
"""
query_generator.py: Generador formal de consultas booleanas OSINT para prensa y hemerotecas.
Implementa la gramática booleana formal consensuada:
Q = (Geografía Canónica) ∧ (Localización Específica) ∧ (Términos Clave de Prensa)

Genera 3 niveles de precisión y soporta filtros de medios locales de Jalisco.
"""

import re
from typing import List, Dict, Any, Optional

# Normalización de variantes municipales de Jalisco
MUNICIPIO_VARIANTES = {
    "SAN PEDRO TLAQUEPAQUE": '("Tlaquepaque" OR "San Pedro Tlaquepaque")',
    "TLAQUEPAQUE": '("Tlaquepaque" OR "San Pedro Tlaquepaque")',
    "TLAJOMULCO DE ZUÑIGA": '("Tlajomulco" OR "Tlajomulco de Zúñiga")',
    "TLAJOMULCO DE ZÚÑIGA": '("Tlajomulco" OR "Tlajomulco de Zúñiga")',
    "TLAJOMULCO": '("Tlajomulco" OR "Tlajomulco de Zúñiga")',
    "GUADALAJARA": '"Guadalajara"',
    "ZAPOPAN": '"Zapopan"',
    "TONALA": '("Tonalá" OR "Tonala")',
    "TONALÁ": '("Tonalá" OR "Tonala")',
    "EL SALTO": '"El Salto"',
    "IXTLAHUACAN DE LOS MEMBRILLOS": '("Ixtlahuacán" OR "Ixtlahuacán de los Membrillos")',
    "LAGOS DE MORENO": '"Lagos de Moreno"',
    "PUERTO VALLARTA": '"Puerto Vallarta"'
}

# Diccionario especializado de términos policiales y notas rojas en Jalisco
TERMINOS_HALLAZGOS = [
    '"fosa clandestina"', '"hallazgo"', '"cuerpo"', '"restos óseos"',
    '"persona sin vida"', '"localizan"', '"osamenta"', '"embolsado"'
]

# Clusters temáticos para diccionario adaptativo / evolutivo
CLUSTERS_BUSQUEDA = {
    "GENERAL": ["hallazgo cuerpo", "cuerpo sin vida", "localizan cadáver"],
    "FOSAS": ["fosa clandestina", "fosas clandestinas", "predio fosa"],
    "MODUS_RESTOS": ["restos humanos embolsado", "en bolsas", "en maleta", "cuerpo calcinado"],
    "OSAMENTAS": ["restos óseos", "osamenta", "colectivo localiza"]
}

# Medios de prensa locales prioritarios en Jalisco
MEDIOS_JALISCO = [
    "site:informador.mx",
    "site:milenio.com/jalisco",
    "site:eloccidental.com.mx",
    "site:notisistema.com",
    "site:ntrguadalajara.com"
]


class OSINTQueryGenerator:
    """Motor de formulación de queries booleanas estructuradas para minería de prensa."""

    @classmethod
    def get_canonical_municipio_query(cls, municipio: Optional[str]) -> str:
        """Devuelve la expresión booleana con variantes del municipio."""
        if not municipio:
            return ""
        norm = municipio.strip().upper()
        return MUNICIPIO_VARIANTES.get(norm, f'"{municipio.title()}"')

    @classmethod
    def clean_street_name(cls, street: Optional[str]) -> Optional[str]:
        """Elimina prefijos de vialidad y números exteriores para maximizar coincidencias de prensa."""
        if not street:
            return None
        clean = re.sub(r'^(?:CALLE|AVENIDA|AV\.?|PRIVADA|PRIV\.?|CALZADA|CALZ\.?|PASEO)\s+', '', street.strip(), flags=re.IGNORECASE)
        clean = re.sub(r'\s*#?\s*\d+.*$', '', clean).strip()
        return clean if len(clean) >= 3 else None

    @classmethod
    def generate_queries_for_case(cls, case_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Genera el conjunto de consultas booleanas (Niveles 1, 2 y 3) para un caso estructurado.
        """
        queries = []
        municipio = case_data.get("municipio")
        colonias = case_data.get("colonias", [])
        domicilios = case_data.get("domicilios", [])
        fecha = case_data.get("fecha_desaparicion")

        mpio_query = cls.get_canonical_municipio_query(municipio)
        press_terms_query = f"({' OR '.join(TERMINOS_HALLAZGOS[:4])})"

        # Extraer calle limpia
        calle_limpia = None
        for d in domicilios:
            raw = d.get("calle_limpia") or d.get("calle_raw")
            cand = cls.clean_street_name(raw)
            if cand:
                calle_limpia = cand
                break

        colonia = colonias[0] if colonias else None

        # Nivel 0: Consulta Natural para motores de noticias (Bing / DuckDuckGo / SearXNG)
        # Formato: Municipio Colonia hallazgo fosa
        mpio_nombre = municipio.title().replace("San Pedro Tlaquepaque", "Tlaquepaque") if municipio else ""
        if mpio_nombre and (colonia or calle_limpia):
            loc_str = f'"{colonia}"' if colonia else f'"{calle_limpia}"'
            q0 = f'{mpio_nombre} {loc_str} hallazgo cuerpo'
            queries.append({
                "nivel": 0,
                "tipo": "NOTICIAS_MOTOR_NATURAL",
                "query": q0,
                "municipio": municipio,
                "colonia": colonia,
                "prioridad": "ALTA"
            })

        # Nivel 1: Alta precisión Booleana (Calle + Colonia + Municipio)
        if mpio_query and (colonia or calle_limpia):
            loc_parts = []
            if colonia:
                loc_parts.append(f'"{colonia}"')
            if calle_limpia:
                loc_parts.append(f'"{calle_limpia}"')
            loc_query = f"({' OR '.join(loc_parts)})"

            q1 = f"{mpio_query} AND {loc_query} AND {press_terms_query}"
            queries.append({
                "nivel": 1,
                "tipo": "ALTA_PRECISION_LOCAL",
                "query": q1,
                "municipio": municipio,
                "colonia": colonia,
                "prioridad": "ALTA"
            })

        # Nivel 2: Búsqueda por Colonia y Palabras Clave
        if mpio_query and colonia:
            q2 = f'{mpio_query} AND "{colonia}" AND ("fosa clandestina" OR "cadáver" OR "localizan")'
            queries.append({
                "nivel": 2,
                "tipo": "COLONIA_HALLAZGO",
                "query": q2,
                "municipio": municipio,
                "colonia": colonia,
                "prioridad": "MEDIA"
            })

        # Nivel 3: Filtro Dirigido a Medios Locales de Jalisco
        if mpio_query and (colonia or calle_limpia):
            site_filter = f"({' OR '.join(MEDIOS_JALISCO[:3])})"
            target_loc = f'"{colonia}"' if colonia else f'"{calle_limpia}"'
            q3 = f"{site_filter} {mpio_query} {target_loc} (\"hallazgo\" OR \"cuerpo\")"
            queries.append({
                "nivel": 3,
                "tipo": "PRENSA_LOCAL_DIRIGIDA",
                "query": q3,
                "municipio": municipio,
                "colonia": colonia,
                "prioridad": "MEDIA"
            })

        return queries

    @classmethod
    def generate_adaptive_queries(cls, case_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Genera consultas adaptativas en cascada rotando clusters temáticos:
        1. Cluster General ("hallazgo cuerpo")
        2. Cluster Fosas ("fosa clandestina")
        3. Cluster Modus / Restos ("restos humanos embolsado OR maleta")
        """
        adaptive_list = []
        municipio = case_data.get("municipio")
        colonias = case_data.get("colonias", [])
        domicilios = case_data.get("domicilios", [])

        colonia = colonias[0] if colonias else None
        calle_limpia = None
        for d in domicilios:
            raw = d.get("calle_limpia") or d.get("calle_raw")
            cand = cls.clean_street_name(raw)
            if cand:
                calle_limpia = cand
                break

        mpio_nombre = municipio.title().replace("San Pedro Tlaquepaque", "Tlaquepaque") if municipio else ""
        loc_str = f'"{colonia}"' if colonia else (f'"{calle_limpia}"' if calle_limpia else "")
        if not mpio_nombre or not loc_str:
            return []

        # 1. Consulta Primaria General
        adaptive_list.append({
            "cluster": "GENERAL",
            "query": f'{mpio_nombre} {loc_str} hallazgo cuerpo',
            "tipo": "ADAPTIVE_PRIMARIO"
        })

        # 2. Consulta Secundaria: Fosas Clandestinas
        adaptive_list.append({
            "cluster": "FOSAS",
            "query": f'{mpio_nombre} {loc_str} fosa clandestina',
            "tipo": "ADAPTIVE_FOSAS"
        })

        # 3. Consulta Terciaria: Restos / Modus
        adaptive_list.append({
            "cluster": "MODUS_RESTOS",
            "query": f'{mpio_nombre} {loc_str} restos humanos embolsado',
            "tipo": "ADAPTIVE_RESTOS"
        })

        return adaptive_list


def build_news_search_queries(
    municipio: Optional[str] = None,
    colonia: Optional[str] = None,
    domicilio: Optional[str] = None,
    ano_fecha: Optional[str] = None,
    terminos_extra: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Función de conveniencia para invocar el generador con parámetros aislados."""
    case_data = {
        "municipio": municipio,
        "colonias": [colonia] if colonia else [],
        "domicilios": [{"calle_raw": domicilio}] if domicilio else [],
        "fecha_desaparicion": ano_fecha
    }
    return OSINTQueryGenerator.generate_queries_for_case(case_data)


if __name__ == "__main__":
    sample_case = {
        "municipio": "SAN PEDRO TLAQUEPAQUE",
        "colonias": ["NUEVA SANTA MARIA"],
        "domicilios": [{"calle_raw": "CALLE OTHÓN BLANCO #189"}],
        "fecha_desaparicion": "2024-10-30"
    }
    qs = OSINTQueryGenerator.generate_queries_for_case(sample_case)
    print("\n--- CONSULTAS OSINT GENERADAS ---")
    for q in qs:
        print(f"\n[Nivel {q['nivel']} - {q['tipo']}]")
        print(f"Query: {q['query']}")
