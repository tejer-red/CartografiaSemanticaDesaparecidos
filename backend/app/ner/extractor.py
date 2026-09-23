#!/usr/bin/env python3
"""
extractor.py: Extractor y normalizador estructurado de entidades geográficas y operativas.
Toma los resultados del NER (o texto crudo con offsets) y produce entidades canónicas
optimizadas para el Generador de Consultas OSINT, la Base de Datos y la Ontología.
"""

import re
from typing import Dict, List, Any, Optional

# Meses en español para parseo determinista de fechas
MESES = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
    "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
    "septiembre": "09", "setiembre": "09", "octubre": "10",
    "noviembre": "11", "diciembre": "12"
}

# Municipios principales del Área Metropolitana de Guadalajara y Jalisco
MUNICIPIOS_JALISCO = [
    "GUADALAJARA", "ZAPOPAN", "SAN PEDRO TLAQUEPAQUE", "TLAQUEPAQUE",
    "TONALA", "TONALÁ", "TLAJOMULCO DE ZUÑIGA", "TLAJOMULCO DE ZÚÑIGA", "TLAJOMULCO",
    "EL SALTO", "IXTLAHUACAN DE LOS MEMBRILLOS", "JUANACATLAN", "JUANACATLÁN",
    "ZAPOTLANEJO", "CHAPALA", "PUERTO VALLARTA", "LAGOS DE MORENO", "TEPATITLAN", "TEPATITLÁN"
]


class EntityExtractor:
    """Extractor y limpiador de entidades para ingesta y minería."""

    @staticmethod
    def normalize_date(text: str) -> Optional[str]:
        """
        Normaliza expresiones de fecha a formato ISO-8601 (YYYY-MM-DD).
        Ejemplos:
          '30 de octubre del 2024' -> '2024-10-30'
          '2024-10-30' -> '2024-10-30'
          '15/05/2023' -> '2023-05-15'
        """
        if not text:
            return None
        text_clean = text.strip().lower()

        # Caso ISO: YYYY-MM-DD
        iso_match = re.search(r'\b(\d{4})-(\d{2})-(\d{2})\b', text_clean)
        if iso_match:
            return f"{iso_match.group(1)}-{iso_match.group(2)}-{iso_match.group(3)}"

        # Caso texto: '30 de octubre de(l) 2024' o 'dia 30 de octubre...'
        textual_match = re.search(r'(?:día\s+)?(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de(?:l)?\s+(\d{4})', text_clean)
        if textual_match:
            dia = textual_match.group(1).zfill(2)
            mes_str = textual_match.group(2)
            anio = textual_match.group(3)
            mes = MESES.get(mes_str, "01")
            return f"{anio}-{mes}-{dia}"

        # Caso slash: DD/MM/YYYY
        slash_match = re.search(r'\b(\d{1,2})/(\d{1,2})/(\d{4})\b', text_clean)
        if slash_match:
            dia = slash_match.group(1).zfill(2)
            mes = slash_match.group(2).zfill(2)
            anio = slash_match.group(3)
            return f"{anio}-{mes}-{dia}"

        return None

    @staticmethod
    def normalize_time(text: str) -> Optional[str]:
        """Estandariza expresiones de hora a formato militar HH:MM."""
        if not text:
            return None
        match = re.search(r'\b([01]?\d|2[0-3]):([0-5]\d)\b', text)
        if match:
            return f"{match.group(1).zfill(2)}:{match.group(2)}"
        return None

    @staticmethod
    def parse_address_components(address_text: str, context_text: str = "") -> Dict[str, Any]:
        """
        Descompone un texto de domicilio en Calle, Colonia y Municipio.
        Aísla la colonia para alimentar el Generador de Búsquedas OSINT.
        """
        result = {
            "calle_raw": address_text,
            "calle_limpia": None,
            "colonia": None,
            "municipio": None
        }

        full_context = f"{address_text} {context_text}".upper()

        # Buscar municipio conocido
        for mpio in MUNICIPIOS_JALISCO:
            if mpio in full_context:
                result["municipio"] = mpio
                break

        # Buscar colonia
        col_match = re.search(r'(?:COLONIA|COL\.?|FRACCIONAMIENTO|FRACC\.?|BARRIO)\s+([A-ZÁÉÍÓÚÑ0-9\s]+?)(?:,|\.|\s+EN\s+|\s+MUNICIPIO|\s+JALISCO|$)', full_context)
        if col_match:
            col_name = col_match.group(1).strip()
            # Limpiar ruidos
            col_name = re.sub(r'\s+(CP|C\.P\.|SECCION|SECCIÓN).*', '', col_name).strip()
            result["colonia"] = col_name

        # Extraer calle y número
        calle_limpia = address_text.strip()
        # Quitar prefijos 'CALLE', 'AVENIDA', 'AV.'
        calle_limpia = re.sub(r'^(?:CALLE|AVENIDA|AV\.?|PRIVADA|PRIV\.?)\s+', '', calle_limpia, flags=re.IGNORECASE)
        # Quitar número exterior para búsqueda semántica/OSINT
        calle_sin_numero = re.sub(r'\s*#?\s*\d+.*$', '', calle_limpia).strip()

        result["calle_limpia"] = calle_sin_numero if calle_sin_numero else calle_limpia

        return result

    @classmethod
    def extract_structured_case(cls, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extrae y estructura un caso completo a partir del JSON de ground-truth o registro crudo.
        """
        text = item.get("text_original", "")
        metadata = item.get("metadata", {})
        entities = item.get("entities", [])

        structured = {
            "id": item.get("id"),
            "municipio": metadata.get("municipio"),
            "fecha_desaparicion": metadata.get("fecha_desaparicion"),
            "nombre": metadata.get("nombre"),
            "domicilios": [],
            "colonias": [],
            "fechas": [],
            "horas": [],
            "telefonos": [],
            "expedientes": []
        }

        for ent in entities:
            lbl = ent["label"]
            ent_text = ent.get("text", "")

            if lbl == "DOMICILIO":
                comp = cls.parse_address_components(ent_text, text)
                structured["domicilios"].append(comp)
                if comp["colonia"] and comp["colonia"] not in structured["colonias"]:
                    structured["colonias"].append(comp["colonia"])
                if comp["municipio"] and not structured["municipio"]:
                    structured["municipio"] = comp["municipio"]

            elif lbl == "FECHA":
                iso_f = cls.normalize_date(ent_text)
                if iso_f and iso_f not in structured["fechas"]:
                    structured["fechas"].append(iso_f)

            elif lbl == "HORA":
                norm_h = cls.normalize_time(ent_text)
                if norm_h and norm_h not in structured["horas"]:
                    structured["horas"].append(norm_h)

            elif lbl == "TELEFONO":
                digits = re.sub(r'\D', '', ent_text)
                if len(digits) >= 10 and digits not in structured["telefonos"]:
                    structured["telefonos"].append(digits)

            elif lbl == "EXP":
                clean_exp = ent_text.strip(" ,;.:")
                if clean_exp not in structured["expedientes"]:
                    structured["expedientes"].append(clean_exp)

        return structured
