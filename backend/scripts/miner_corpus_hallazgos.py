#!/usr/bin/env python3
"""
miner_corpus_hallazgos.py: Minador de Corpus de Hallazgos Colectivos, Fosas y Búsqueda v0.0.3.
Estrategia:
 1. Pool dinámico de palabras clave (semillas + extracción LLM + convergencia).
 2. Búsqueda temática focalizada por municipio en DuckDuckGo con filtros temporales (<= 2024).
 3. Extracción de contenido periodístico con pool de workers multihilo.
 4. Gatekeeper y Extractor Geoespacial con LLM Local (Qwen 14B AWQ) con extracción y validación de fecha.
 5. Pipeline de Geocodificación en cascada (Cache PostgreSQL -> LocationIQ -> Nominatim -> Centroides).
 6. Ingesta estructurada en PostgreSQL (tabla `noticias_corpus`).
 7. Deduplicación inter-medios asignando identificadores de evento (`evento_hallazgo_id`).
"""

import os
import re
import sys
import json
import time
import math
import uuid
import random
import urllib.parse
import urllib.request
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple, Set
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

import psycopg2
from psycopg2.extras import Json
from bs4 import BeautifulSoup

# Configuración Base de Datos y Modelo LLM
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ.get("DB_USER", "postgres")
    pwd = os.environ.get("DB_PASSWORD", "")
    name = os.environ.get("DB_NAME", "cartografia_semantica_db")
    DB_URL = f"postgresql://{user}:{pwd}@{host}:{port}/{name}" if pwd else f"postgresql://{user}@{host}:{port}/{name}"

LLM_API_URL = os.environ.get("LLM_API_URL", "http://localhost:8000/v1/chat/completions")
MODEL_NAME = os.environ.get("MODEL_NAME", "qwen-coder")
LOCATIONIQ_API_KEY = os.environ.get("LOCATIONIQ_API_KEY", "")
KEYWORDS_FILE = os.path.join(os.path.dirname(__file__), "keywords_pool.json")

# Rango temporal por defecto alineado con cédulas de búsqueda (hasta 2024)
MAX_YEAR_DEFAULT = 2024
MIN_YEAR_DEFAULT = 2010

# User-Agents para evitar rate-limit o bloqueos en scraping
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0"
]

# Centroides municipales de Jalisco (fallback de alta fidelidad)
CENTROIDES_MUNICIPIOS = {
    "GUADALAJARA": (20.6767, -103.3475),
    "ZAPOPAN": (20.7225, -103.3928),
    "SAN PEDRO TLAQUEPAQUE": (20.6408, -103.3125),
    "TLAQUEPAQUE": (20.6408, -103.3125),
    "TONALA": (20.6244, -103.2422),
    "TONALÁ": (20.6244, -103.2422),
    "TLAJOMULCO DE ZUÑIGA": (20.4744, -103.4475),
    "TLAJOMULCO DE ZÚÑIGA": (20.4744, -103.4475),
    "TLAJOMULCO": (20.4744, -103.4475),
    "EL SALTO": (20.5186, -103.1814),
    "LAGOS DE MORENO": (21.3558, -101.9333),
    "PUERTO VALLARTA": (20.6534, -105.2253),
    "TEPATITLAN DE MORELOS": (20.8167, -102.7667),
    "TEPATITLÁN DE MORELOS": (20.8167, -102.7667),
    "TEPATITLAN": (20.8167, -102.7667),
    "SAN JUAN DE LOS LAGOS": (21.2464, -102.3353),
    "ENCARNACION DE DIAZ": (21.5261, -102.2411),
    "ENCARNACIÓN DE DÍAZ": (21.5261, -102.2411),
    "TALA": (20.6542, -103.7028),
    "ARANDAS": (20.7061, -102.3086),
    "IXTLAHUACAN DE LOS MEMBRILLOS": (20.3861, -103.1936),
    "IXTLAHUACÁN DE LOS MEMBRILLOS": (20.3861, -103.1936),
    "CHAPALA": (20.2917, -103.1917),
    "ATOTONILCO EL ALTO": (20.5500, -102.5167),
    "ZAPOTLANEJO": (20.6231, -103.0672),
    "ZAPOTLAN EL GRANDE": (19.7042, -103.4619),
    "ZAPOTLÁN EL GRANDE": (19.7042, -103.4619),
    "LA BARCA": (20.2903, -102.5481),
    "OJUELOS DE JALISCO": (21.8667, -101.5833),
    "OCOTLAN": (20.3542, -102.7750),
    "OCOTLÁN": (20.3542, -102.7750),
    "JOCOTEPEC": (20.2833, -103.4333),
    "AMECA": (20.5500, -104.0333),
    "AUTLAN DE NAVARRO": (19.7725, -104.3644),
    "AUTLÁN DE NAVARRO": (19.7725, -104.3644),
    "PONCITLAN": (20.3800, -102.9242),
    "PONCITLÁN": (20.3800, -102.9242),
    "EL ARENAL": (20.7739, -103.6931),
    "SAN MIGUEL EL ALTO": (21.0306, -102.4042),
    "JUANACATLAN": (20.5064, -103.1706),
    "JUANACATLÁN": (20.5064, -103.1706),
    "TEQUILA": (20.8833, -103.8333),
    "JALISCO": (20.6597, -103.3496)
}

def log_msg(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}", flush=True)

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula distancia en km entre dos coordenadas geográficas."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ==============================================================================
# 🔑 COMPONENTE 1: POOL DINÁMICO DE PALABRAS CLAVE CON CONVERGENCIA
# ==============================================================================

class DynamicKeywordPool:
    """Gestiona el conjunto de palabras clave de búsqueda con aprendizaje activo."""

    INITIAL_SEEDS = [
        "fosa clandestina",
        "fosas clandestinas",
        "restos óseos",
        "cuerpos embolsados",
        "cuerpos calcinados",
        "colectivo madres buscadoras",
        "brigada de búsqueda",
        "colectivo luz de esperanza",
        "rastreadoras",
        "guerreros buscadores",
        "comisión de búsqueda jalisco",
        "fiscalía cateo fosa",
        "semefo restos",
        "inhumación clandestina",
        "hallazgo fosa",
        "cadáveres fosa",
        "restos humanos predio",
        "fosa narcocampamento",
        "fosa zapopan",
        "fosa tlajomulco",
        "cuerpos encontrados jalisco",
        "colectivo desaparecidos hallazgo",
        "fosa clandestina recuperan cuerpos",
        "restos humanos bolsas jalisco"
    ]

    def __init__(self, storage_path: str = KEYWORDS_FILE):
        self.storage_path = storage_path
        self.pool: Set[str] = set()
        self.used_keywords: Set[str] = set()
        self.discovered_by_cycle: Dict[int, List[str]] = {}
        self.load()

    def load(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.pool = set(data.get("pool", []))
                    self.used_keywords = set(data.get("used_keywords", []))
                    self.discovered_by_cycle = {int(k): v for k, v in data.get("discovered_by_cycle", {}).items()}
                    
                    # INYECTAR NUEVAS SEMILLAS AUNQUE EXISTA EL ARCHIVO
                    for seed in self.INITIAL_SEEDS:
                        self.pool.add(seed)
                        
                    log_msg(f"[KeywordPool] Cargadas {len(self.pool)} palabras clave ({len(self.used_keywords)} exploradas).")
                    return
            except Exception as e:
                log_msg(f"[KeywordPool] Error cargando archivo: {e}. Usando semillas iniciales.")

        self.pool = set(self.INITIAL_SEEDS)
        self.discovered_by_cycle[0] = list(self.INITIAL_SEEDS)
        self.save()

    def save(self):
        try:
            data = {
                "pool": list(self.pool),
                "used_keywords": list(self.used_keywords),
                "discovered_by_cycle": self.discovered_by_cycle,
                "updated_at": datetime.now().isoformat()
            }
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            log_msg(f"[KeywordPool] Error guardando pool: {e}")

    def get_unexplored(self, limit: int = 15) -> List[str]:
        unexplored = list(self.pool - self.used_keywords)
        unexplored.sort(key=lambda k: 0 if ("fosa" in k or "restos" in k) else 1)
        return unexplored[:limit]

    def mark_used(self, keyword: str):
        self.used_keywords.add(keyword)
        self.save()

    def extract_new_keywords_via_llm(self, articles_text: str, cycle: int) -> List[str]:
        """Pide al LLM sugerir términos de jerga periodística y forense basados en las notas halladas."""
        system_prompt = (
            "Eres un Analista de Inteligencia OSINT especializado en prensa de seguridad en Jalisco México. "
            "Tu tarea es analizar fragmentos de noticias sobre hallazgos de fosas, cuerpos y operativos de búsqueda, "
            "y extraer de 3 a 6 términos o frases clave de búsqueda EXACTAS que los periodistas y colectivos usan localmente. "
            "Deben ser frases cortas de 2 a 4 palabras que sirvan para encontrar noticias similares en DuckDuckGo. "
            "Devuelve EXCLUSIVAMENTE un JSON: {\"nuevos_terminos\": [\"termino 1\", \"termino 2\"]}"
        )
        prompt = f"Analiza estas noticias recientes:\n\"\"\"{articles_text[:2000]}\"\"\"\n\n¿Qué frases clave de búsqueda periodística identificas para hallar más fosas y cuerpos en Jalisco?"

        payload = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 200
        }

        try:
            req = urllib.request.Request(
                LLM_API_URL,
                headers={"Content-Type": "application/json"},
                data=json.dumps(payload).encode("utf-8")
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"]["content"].strip()
                if content.startswith("```"):
                    lines = content.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    content = "\n".join(lines).strip()
                res_json = json.loads(content)
                new_terms = [t.strip().lower() for t in res_json.get("nuevos_terminos", []) if len(t.strip()) > 5]
                
                novel_terms = []
                for term in new_terms:
                    term = re.sub(r'["\']', '', term)
                    if term not in self.pool and len(term) < 50:
                        novel_terms.append(term)
                        self.pool.add(term)

                if novel_terms:
                    log_msg(f"[KeywordPool] Ciclo {cycle}: Añadidos {len(novel_terms)} nuevos términos al pool: {novel_terms}")
                    if cycle not in self.discovered_by_cycle:
                        self.discovered_by_cycle[cycle] = []
                    self.discovered_by_cycle[cycle].extend(novel_terms)
                    self.save()
                return novel_terms
        except Exception as e:
            log_msg(f"[KeywordPool] Error en extracción de términos vía LLM: {e}")
            return []


# ==============================================================================
# 🌍 COMPONENTE 2: PIPELINE DE GEOCODIFICACIÓN EN CASCADA CON CACHE POSTGRESQL
# ==============================================================================

class CascadeGeocoder:
    """
    Pipeline multinivel de georreferenciación:
    Nivel 0: Cache persistente en PostgreSQL (tabla `geocode_cache`).
    Nivel 1: LocationIQ API (con LOCATIONIQ_API_KEY).
    Nivel 2: Nominatim (OpenStreetMap) como fallback.
    Nivel 3: Centroide municipal de Jalisco.
    Nivel 4: Centroide estatal de Jalisco.
    """

    def __init__(self, db_url: str = DB_URL, locationiq_key: Optional[str] = LOCATIONIQ_API_KEY):
        self.db_url = db_url
        self.locationiq_key = locationiq_key
        self.last_nominatim_time = 0.0
        self.last_locationiq_time = 0.0
        self.nominatim_available = True
        self.locationiq_available = bool(locationiq_key)
        self.lock = threading.Lock()
        self._init_db_cache()

    def _init_db_cache(self):
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS geocode_cache (
                    cache_key VARCHAR(500) PRIMARY KEY,
                    lat DOUBLE PRECISION NOT NULL,
                    lng DOUBLE PRECISION NOT NULL,
                    precision VARCHAR(50) NOT NULL,
                    source VARCHAR(50) NOT NULL,
                    raw_response JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            log_msg(f"[Geocoder] Error inicializando geocode_cache en PostgreSQL: {e}")

    def _get_from_cache(self, key: str) -> Optional[Tuple[float, float, str]]:
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute("SELECT lat, lng, precision FROM geocode_cache WHERE cache_key = %s LIMIT 1;", (key,))
            row = cur.fetchone()
            conn.close()
            if row:
                return float(row[0]), float(row[1]), str(row[2])
        except Exception:
            pass
        return None

    def _save_to_cache(self, key: str, lat: float, lng: float, precision: str, source: str, raw: Optional[Any] = None):
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO geocode_cache (cache_key, lat, lng, precision, source, raw_response)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (cache_key) DO NOTHING;
            """, (key, lat, lng, precision, source, Json(raw) if raw else None))
            conn.commit()
            conn.close()
        except Exception as e:
            log_msg(f"[Geocoder] Error guardando en cache DB: {e}")

    def _query_locationiq(self, query: str) -> Optional[Tuple[float, float]]:
        if not self.locationiq_available or not self.locationiq_key:
            return None
        with self.lock:
            elapsed = time.time() - self.last_locationiq_time
            if elapsed < 0.6:
                time.sleep(0.6 - elapsed)
            self.last_locationiq_time = time.time()

        params = urllib.parse.urlencode({
            "key": self.locationiq_key,
            "q": query,
            "format": "json",
            "limit": 1,
            "countrycodes": "mx"
        })
        url = f"https://us1.locationiq.com/v1/search?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": random.choice(USER_AGENTS)})
        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                data = json.loads(response.read().decode("utf-8"))
                if data and len(data) > 0:
                    lat = float(data[0]["lat"])
                    lon = float(data[0]["lon"])
                    if 18.5 <= lat <= 23.0 and -106.0 <= lon <= -101.0:
                        return lat, lon
        except Exception as e:
            log_msg(f"[Geocoder] LocationIQ query '{query}' falló: {e}")
            if "429" in str(e) or "403" in str(e):
                self.locationiq_available = False
        return None

    def _query_nominatim(self, query: str) -> Optional[Tuple[float, float]]:
        if not self.nominatim_available:
            return None
        with self.lock:
            elapsed = time.time() - self.last_nominatim_time
            if elapsed < 1.1:
                time.sleep(1.1 - elapsed)
            self.last_nominatim_time = time.time()

        params = urllib.parse.urlencode({
            "q": query,
            "format": "json",
            "limit": 1,
            "countrycodes": "mx"
        })
        url = f"https://nominatim.openstreetmap.org/search?{params}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "TemporalNER-Ontologia-Research/1.0 (abundis@tejer.red)"
        })
        try:
            with urllib.request.urlopen(req, timeout=7) as response:
                data = json.loads(response.read().decode("utf-8"))
                if data and len(data) > 0:
                    lat = float(data[0]["lat"])
                    lon = float(data[0]["lon"])
                    if 18.5 <= lat <= 23.0 and -106.0 <= lon <= -101.0:
                        return lat, lon
        except Exception as e:
            log_msg(f"[Geocoder] Nominatim query '{query}' falló: {e}")
            if "429" in str(e):
                self.nominatim_available = False
        return None

    def geocode(self, municipio: Optional[str], colonia: Optional[str], referencia: Optional[str] = None) -> Tuple[Optional[float], Optional[float], str]:
        mun_clean = (municipio or "").strip().upper()
        col_clean = (colonia or "").strip().upper()

        cache_key = f"{col_clean}|{mun_clean}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        # 1. Geocodificar Colonia + Municipio
        if col_clean and len(col_clean) >= 3:
            query = f"Colonia {col_clean}, {mun_clean}, Jalisco, México"
            coords = self._query_locationiq(query)
            if coords:
                lat, lon = coords
                self._save_to_cache(cache_key, lat, lon, "colonia", "locationiq")
                return lat, lon, "colonia"

            coords = self._query_nominatim(query)
            if coords:
                lat, lon = coords
                self._save_to_cache(cache_key, lat, lon, "colonia", "nominatim")
                return lat, lon, "colonia"

        # 2. Geocodificar Municipio solo
        if mun_clean:
            mun_cache_key = f"|{mun_clean}"
            cached_mun = self._get_from_cache(mun_cache_key)
            if cached_mun:
                return cached_mun

            query = f"{mun_clean}, Jalisco, México"
            coords = self._query_locationiq(query)
            if coords:
                lat, lon = coords
                self._save_to_cache(mun_cache_key, lat, lon, "municipio", "locationiq")
                return lat, lon, "municipio"

            coords = self._query_nominatim(query)
            if coords:
                lat, lon = coords
                self._save_to_cache(mun_cache_key, lat, lon, "municipio", "nominatim")
                return lat, lon, "municipio"

        # 3. Fallback a Centroides Municipales
        if mun_clean in CENTROIDES_MUNICIPIOS:
            lat, lon = CENTROIDES_MUNICIPIOS[mun_clean]
            self._save_to_cache(cache_key, lat, lon, "centroide_municipio", "hardcoded")
            return lat, lon, "centroide_municipio"

        for k_mun, coords in CENTROIDES_MUNICIPIOS.items():
            if k_mun in mun_clean or mun_clean in k_mun:
                self._save_to_cache(cache_key, coords[0], coords[1], "centroide_municipio", "hardcoded")
                return coords[0], coords[1], "centroide_municipio"

        # 4. Fallback Centroide Jalisco
        lat, lon = CENTROIDES_MUNICIPIOS["JALISCO"]
        return lat, lon, "centroide_estatal"


# ==============================================================================
# 🧠 COMPONENTE 3: GATEKEEPER & EXTRACTOR ESTRUCTURADO CON LLM LOCAL
# ==============================================================================

llm_semaphore = threading.Semaphore(6)

def evaluate_and_extract_corpus_article(article: Dict[str, str], query_keywords: List[str]) -> Optional[Dict[str, Any]]:
    """Evalúa pertinencia de la nota, extrae fecha y entidades cuantitativas con concurrencia controlada."""
    system_prompt = (
        "Eres un Perito Criminólogo y Auditor de Fuentes Abiertas (OSINT) en Jalisco, México. "
        "Tu labor es evaluar notas periodísticas para un observatorio de búsqueda de personas y fosas. "
        "Debes DETERMINAR SI la nota reporta un HECHO REAL Y PERTINENTE (fosa clandestina, hallazgo de restos óseos, "
        "cuerpos abandonados/embolsados, cateos con cuerpos, o brigadas de búsqueda en Jalisco). "
        "DESCARTA notas de otros estados (Michoacán, Zacatecas, Guanajuato, Colima salvo que la fosa esté en Jalisco), "
        "accidentes de tránsito comunes, notas de opinión política abstracta o publicidad. "
        "EXTRAE la fecha exacta o aproximada del evento o publicación en formato YYYY-MM-DD. "
        "Responde EXCLUSIVAMENTE con un JSON con la siguiente estructura:\n"
        "{\n"
        "  \"es_hallazgo_pertinente\": true | false,\n"
        "  \"confidence_score\": 0.0 a 1.0,\n"
        "  \"fecha_hecho\": \"YYYY-MM-DD o null si no se deduce\",\n"
        "  \"municipio\": \"Nombre del municipio en Jalisco (ej: TLAJOMULCO, ZAPOPAN) o null\",\n"
        "  \"colonia\": \"Nombre de la colonia, poblado o fraccionamiento, o null\",\n"
        "  \"referencia_ubicacion\": \"Descripción de la ubicación (ej: brecha a El Mirador, predio rústico) o null\",\n"
        "  \"total_cuerpos\": int o null,\n"
        "  \"total_restos\": int o null,\n"
        "  \"resumen\": \"Síntesis objetiva de 1 o 2 frases del hallazgo.\",\n"
        "  \"razon_descarte\": \"Explicación si es_hallazgo_pertinente es false, o null\"\n"
        "}"
    )

    user_content = (
        f"TITULAR: {article.get('titular')}\n"
        f"FECHA DETECTADA PREVIAMENTE: {article.get('fecha', 'N/D')}\n"
        f"URL: {article.get('url')}\n"
        f"CONTENIDO:\n\"\"\"{article.get('cuerpo_texto', '')[:1400]}\"\"\"\n"
    )

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.1,
        "max_tokens": 400
    }

    with llm_semaphore:
        try:
            req = urllib.request.Request(
                LLM_API_URL,
                headers={"Content-Type": "application/json"},
                data=json.dumps(payload).encode("utf-8")
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"]["content"].strip()
                if content.startswith("```"):
                    lines = content.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    content = "\n".join(lines).strip()
                res_json = json.loads(content)

                if res_json.get("es_hallazgo_pertinente") and float(res_json.get("confidence_score", 0)) >= 0.70:
                    return res_json
                else:
                    return None
        except Exception as e:
            log_msg(f"[LLM Gatekeeper] Error evaluando artículo '{article.get('titular', '')[:40]}': {e}")
            return None


# ==============================================================================
# 🌐 COMPONENTE 4: SCRAPER DUCKDUCKGO Y ADQUISICIÓN DE CONTENIDO
# ==============================================================================

def search_gnews_rss_corpus(query: str, max_results: int = 7) -> List[Dict[str, str]]:
    """Ejecuta consulta en Google News RSS y extrae noticias usando googlenewsdecoder."""
    import xml.etree.ElementTree as ET
    from googlenewsdecoder import GoogleDecoder
    decoder = GoogleDecoder()
    
    # query_str ya incluye el año o fechas en el formato de run_mining_cycle
    url = f"https://news.google.com/rss/search?q={urllib.parse.quote_plus(query)}&hl=es-419&gl=MX&ceid=MX:es-419"
    articles = []

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36"})
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            items = root.findall(".//item")
            
            for item in items:
                title = item.findtext("title", "")
                link = item.findtext("link", "")
                pub_date = item.findtext("pubDate", "")
                source = item.findtext("source", "")
                
                final_url = link
                if "news.google.com/rss/articles" in link:
                    try:
                        decoded = decoder.decode_google_news_url(link)
                        if decoded.get("success") and decoded.get("decoded_url"):
                            final_url = decoded["decoded_url"]
                    except Exception:
                        pass
                
                # Filtrar dominios indeseados o nulos
                if not final_url or any(x in final_url.lower() for x in ["amazon.", "mercadolibre.", "facebook.com", "twitter.com", "instagram.com", "youtube.com", "tiktok.com", "wikipedia.org", "tripadvisor."]):
                    continue
                    
                # Formatear la fecha aproximada si existe (aunque el LLM/extractor la afinará)
                date_str = None
                if pub_date:
                    try:
                        # pubDate ej: Wed, 08 Jan 2020 08:00:00 GMT
                        dt = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %Z")
                        date_str = dt.strftime("%Y-%m-%d")
                    except Exception:
                        pass
                        
                articles.append({
                    "url": final_url,
                    "titular": title,
                    "cuerpo_texto": f"{title}. Publicado por {source} el {pub_date}.",
                    "fecha": date_str
                })
                
                if len(articles) >= max_results:
                    break
    except Exception as e:
        log_msg(f"[GNEWS] Error en búsqueda RSS '{query}': {e}")
        
    return articles


def fetch_article_full_text(article: Dict[str, str]) -> Dict[str, str]:
    """Descarga el cuerpo completo del artículo y extrae la fecha desde metadatos o URL."""
    url = article["url"]
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    req = urllib.request.Request(url, headers=headers)
    try:
        # Intentar extraer fecha desde la propia URL si tiene estructura /YYYY/MM/DD/ o /YYYY/MM/
        url_match = re.search(r"/(\d{4})/(\d{2})/(\d{2})/", url)
        if url_match:
            article["fecha"] = f"{url_match.group(1)}-{url_match.group(2)}-{url_match.group(3)}"
        else:
            url_match_month = re.search(r"/(\d{4})/(\d{2})/", url)
            if url_match_month:
                article["fecha"] = f"{url_match_month.group(1)}-{url_match_month.group(2)}-01"

        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, "html.parser")
            for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                tag.decompose()
            paras = [p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 25]
            if paras:
                article["cuerpo_texto"] = " ".join(paras[:10])

            if not article.get("fecha"):
                date_meta = soup.find("meta", property=lambda x: x and any(k in str(x).lower() for k in ["published", "date", "time"]))
                if not date_meta:
                    date_meta = soup.find("meta", attrs={"name": lambda x: x and any(k in str(x).lower() for k in ["published", "date", "time"])})
                
                if date_meta and date_meta.get("content"):
                    date_str = date_meta["content"][:10]
                    if re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
                        article["fecha"] = date_str
    except Exception:
        pass
    return article


# ==============================================================================
# 💾 COMPONENTE 5: ORQUESTADOR PRINCIPAL, DEDUPLICACIÓN E INGESTA
# ==============================================================================

class CorpusMinerOrchestrator:

    # 20 Municipios prioritarios de Jalisco para la versión 0.0.3
    TOP_MUNICIPIOS = [
        "Guadalajara", "Zapopan", "San Pedro Tlaquepaque", "Tonalá",
        "Tlajomulco de Zúñiga", "El Salto", "Lagos de Moreno", "Puerto Vallarta",
        "Tepatitlán de Morelos", "San Juan de los Lagos", "Encarnación de Díaz", "Tala",
        "Arandas", "Ixtlahuacán de los Membrillos", "Chapala", "Zapotlanejo",
        "Zapotlán el Grande", "Ocotlán", "Jocotepec", "Ameca"
    ]

    def __init__(self, db_url: str = DB_URL, max_workers: int = 6, max_year: int = MAX_YEAR_DEFAULT, min_year: int = MIN_YEAR_DEFAULT):
        self.db_url = db_url
        self.max_workers = max_workers
        self.max_year = max_year
        self.min_year = min_year
        self.keyword_pool = DynamicKeywordPool()
        self.geocoder = CascadeGeocoder(db_url=db_url)

    def get_existing_urls(self) -> Set[str]:
        """Obtiene URLs ya indexadas para evitar reprocesamiento."""
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute("SELECT url FROM noticias_corpus UNION SELECT url FROM noticias;")
            rows = cur.fetchall()
            conn.close()
            return {r[0] for r in rows}
        except Exception as e:
            log_msg(f"[DB] Error consultando URLs previas: {e}")
            return set()

    def persist_corpus_article(self, article_data: Dict[str, Any]) -> bool:
        """Inserta el hallazgo validado y geocodificado en `noticias_corpus`."""
        sql = """
        INSERT INTO noticias_corpus (
            url, titular, fecha, municipio_extraido, colonia_extraida,
            referencia_ubicacion, coordenadas, lat, lng, geocode_precision,
            cuerpo_texto, resumen_hallazgo, total_cuerpos_estimado, total_restos_estimado,
            keywords_matched, ciclo_expansion, confidence_score, metadata_extraccion
        ) VALUES (
            %(url)s, %(titular)s, %(fecha)s, %(municipio_extraido)s, %(colonia_extraida)s,
            %(referencia_ubicacion)s, %(coordenadas)s, %(lat)s, %(lng)s, %(geocode_precision)s,
            %(cuerpo_texto)s, %(resumen_hallazgo)s, %(total_cuerpos_estimado)s, %(total_restos_estimado)s,
            %(keywords_matched)s, %(ciclo_expansion)s, %(confidence_score)s, %(metadata_extraccion)s
        ) ON CONFLICT (url) DO UPDATE SET
            coordenadas = EXCLUDED.coordenadas,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            fecha = EXCLUDED.fecha,
            geocode_precision = EXCLUDED.geocode_precision,
            resumen_hallazgo = EXCLUDED.resumen_hallazgo;
        """
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute(sql, article_data)
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            log_msg(f"[DB] Error insertando noticia corpus: {e}")
            return False

    def cluster_events_deduplication(self):
        """
        Agrupa noticias independientes bajo el mismo evento_hallazgo_id si:
        - Tienen coordenadas válidas con distancia Haversine < 1.5 km
        - Fechas dentro de una ventana de <= 30 días (o una de ellas sin fecha específica)
        - Mismo municipio_extraido
        """
        log_msg("[Deduplicador] Ejecutando detección de eventos inter-medios...")
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute("""
                SELECT id, municipio_extraido, lat, lng, fecha, evento_hallazgo_id
                FROM noticias_corpus
                ORDER BY fecha DESC NULLS LAST, id ASC;
            """)
            rows = cur.fetchall()
            if not rows:
                conn.close()
                return

            articles = []
            for r in rows:
                articles.append({
                    "id": r[0],
                    "municipio": (r[1] or "").upper().strip(),
                    "lat": r[2],
                    "lng": r[3],
                    "fecha": r[4],
                    "evento_id": r[5]
                })

            clusters_updated = 0
            for i in range(len(articles)):
                art_a = articles[i]
                if not art_a["lat"] or not art_a["lng"]:
                    continue

                if not art_a["evento_id"]:
                    art_a["evento_id"] = uuid.uuid4().hex[:12]
                    cur.execute("UPDATE noticias_corpus SET evento_hallazgo_id = %s WHERE id = %s;", (art_a["evento_id"], art_a["id"]))
                    clusters_updated += 1

                for j in range(i + 1, len(articles)):
                    art_b = articles[j]
                    if not art_b["lat"] or not art_b["lng"]:
                        continue

                    # 1. Mismo municipio
                    if art_a["municipio"] and art_b["municipio"] and art_a["municipio"] != art_b["municipio"]:
                        continue

                    # 2. Distancia Haversine < 1.5 km
                    dist_km = haversine_km(art_a["lat"], art_a["lng"], art_b["lat"], art_b["lng"])
                    if dist_km >= 1.5:
                        continue

                    # 3. Ventana temporal <= 30 días si ambas tienen fecha
                    if art_a["fecha"] and art_b["fecha"]:
                        days_diff = abs((art_a["fecha"] - art_b["fecha"]).days)
                        if days_diff > 30:
                            continue

                    # Coincidencia confirmada: asociar al mismo evento
                    if art_b["evento_id"] != art_a["evento_id"]:
                        art_b["evento_id"] = art_a["evento_id"]
                        cur.execute("UPDATE noticias_corpus SET evento_hallazgo_id = %s WHERE id = %s;", (art_a["evento_id"], art_b["id"]))
                        clusters_updated += 1

            conn.commit()
            conn.close()
            log_msg(f"[Deduplicador] Eventos agrupados/actualizados: {clusters_updated}")
        except Exception as e:
            log_msg(f"[Deduplicador] Error en agrupamiento: {e}")

    def _process_candidate(self, cand: Dict[str, str], kw: str, mun: str) -> Optional[Dict[str, Any]]:
        """Descarga texto completo, evalúa con LLM Gatekeeper, valida fecha y geocodifica."""
        cand = fetch_article_full_text(cand)
        if len(cand.get("cuerpo_texto", "")) < 60:
            return None

        eval_result = evaluate_and_extract_corpus_article(cand, [kw])
        if not eval_result:
            return None

        # Priorizar fecha extraída por el LLM si la de metadatos falló o parece errónea
        fecha_val = eval_result.get("fecha_hecho") or cand.get("fecha")
        if fecha_val:
            try:
                dt = datetime.strptime(fecha_val[:10], "%Y-%m-%d")
                # Filtro temporal estricto: descartar noticias posteriores al rango permitido (ej. > 2024)
                if dt.year > self.max_year or dt.year < self.min_year:
                    log_msg(f"  [DESCARTADO POR FECHA] Año {dt.year} fuera del rango ({self.min_year}-{self.max_year}): {cand.get('titular')[:50]}")
                    return None
                fecha_val = dt.strftime("%Y-%m-%d")
            except ValueError:
                fecha_val = None

        mun_ext = eval_result.get("municipio") or mun
        col_ext = eval_result.get("colonia")
        ref_ext = eval_result.get("referencia_ubicacion")

        lat, lng, precision = self.geocoder.geocode(mun_ext, col_ext, ref_ext)
        coords_str = f"{lat:.6f}, {lng:.6f}" if (lat and lng) else None

        payload = {
            "url": cand["url"],
            "titular": cand.get("titular", "")[:500],
            "fecha": fecha_val,
            "municipio_extraido": mun_ext.upper() if mun_ext else None,
            "colonia_extraida": col_ext.upper() if col_ext else None,
            "referencia_ubicacion": ref_ext,
            "coordenadas": coords_str,
            "lat": lat,
            "lng": lng,
            "geocode_precision": precision,
            "cuerpo_texto": cand.get("cuerpo_texto"),
            "resumen_hallazgo": eval_result.get("resumen"),
            "total_cuerpos_estimado": eval_result.get("total_cuerpos"),
            "total_restos_estimado": eval_result.get("total_restos"),
            "keywords_matched": [kw],
            "confidence_score": float(eval_result.get("confidence_score", 0.8)),
            "metadata_extraccion": Json(eval_result)
        }
        return payload

    def run_mining_cycle(self, cycle: int, max_queries: int = 15, municipios: Optional[List[str]] = None, target_years: Optional[List[int]] = None) -> int:
        """Ejecuta una ronda de minería del corpus para el ciclo indicado con concurrencia controlada y filtro de años."""
        target_municipios = municipios or self.TOP_MUNICIPIOS
        keywords = self.keyword_pool.get_unexplored(limit=max_queries)
        years_to_search = target_years or [2024, 2023, 2022]

        if not keywords:
            log_msg(f"[Ciclo {cycle}] No hay palabras clave inexploradas. Fin o convergencia alcanzada.")
            return 0

        existing_urls = self.get_existing_urls()
        log_msg(f"=== INICIANDO CICLO {cycle} DE MINERÍA DE CORPUS (RANGO TEMPORAL <= {self.max_year}) ===")
        log_msg(f"Palabras clave a explorar: {keywords}")
        log_msg(f"Municipios objetivo ({len(target_municipios)}): {target_municipios}")
        log_msg(f"Años objetivo para consultas temáticas: {years_to_search}")
        log_msg(f"URLs ya indexadas en el sistema: {len(existing_urls)}")

        total_aprobados = 0
        accepted_articles_texts = []

        for kw in keywords:
            self.keyword_pool.mark_used(kw)
            for mun in target_municipios:
                # Usar GNews con operadores after y before para estrictez temporal
                year_tag = random.choice(years_to_search)
                query_str = f'{kw} {mun} Jalisco after:{year_tag}-01-01 before:{year_tag}-12-31'
                log_msg(f"-> Buscando: '{query_str}'")

                candidates = search_gnews_rss_corpus(query_str, max_results=7)
                time.sleep(random.uniform(2.5, 4.0))

                fresh_candidates = [c for c in candidates if c["url"] not in existing_urls]
                if not fresh_candidates:
                    continue

                with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                    futures = {
                        executor.submit(self._process_candidate, cand, kw, mun): cand
                        for cand in fresh_candidates
                    }
                    for future in as_completed(futures):
                        try:
                            payload = future.result()
                            if payload:
                                payload["ciclo_expansion"] = cycle
                                if self.persist_corpus_article(payload):
                                    existing_urls.add(payload["url"])
                                    total_aprobados += 1
                                    accepted_articles_texts.append(f"{payload.get('titular')}. {payload.get('resumen_hallazgo')}")
                                    log_msg(
                                        f"  [APROBADO #{total_aprobados}] {payload.get('titular')[:65]} | "
                                        f"Fecha: {payload.get('fecha')} | "
                                        f"Geo: {payload.get('municipio_extraido')}, {payload.get('colonia_extraida') or 'N/D'} "
                                        f"({payload.get('geocode_precision')}) -> [{payload.get('lat')}, {payload.get('lng')}]"
                                    )
                        except Exception as e:
                            log_msg(f"[Worker] Error en procesamiento de candidato: {e}")

        # Agrupación deduplicada de eventos
        self.cluster_events_deduplication()

        # Expansión del pool mediante LLM con el corpus acumulado en este ciclo
        if accepted_articles_texts:
            corpus_block = "\n".join(accepted_articles_texts)
            self.keyword_pool.extract_new_keywords_via_llm(corpus_block, cycle=cycle + 1)

        log_msg(f"=== FIN DE CICLO {cycle}: {total_aprobados} NOTICIAS APROBADAS Y GEOCODIFICADAS ===")
        return total_aprobados


# ==============================================================================
# 🚀 ENTRADA PRINCIPAL (CLI)
# ==============================================================================

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Minador de Corpus de Hallazgos Colectivos y Fosas en Jalisco v0.0.3")
    parser.add_argument("--ciclos", type=int, default=3, help="Número de ciclos de expansión a ejecutar (default 3)")
    parser.add_argument("--max-queries", type=int, default=15, help="Máximo de palabras clave por ciclo")
    parser.add_argument("--workers", type=int, default=6, help="Hilos concurrentes para extracción y LLM (default 6)")
    parser.add_argument("--municipios", nargs="+", default=None, help="Municipios específicos a rastrear")
    parser.add_argument("--max-year", type=int, default=2024, help="Año máximo de hallazgos a aceptar (default 2024)")
    parser.add_argument("--min-year", type=int, default=2010, help="Año mínimo de hallazgos a aceptar (default 2010)")
    parser.add_argument("--years", nargs="+", type=int, default=[2024, 2023, 2022, 2021, 2020], help="Años a incluir en las búsquedas")
    args = parser.parse_args()

    orchestrator = CorpusMinerOrchestrator(
        max_workers=args.workers,
        max_year=args.max_year,
        min_year=args.min_year
    )
    for c in range(args.ciclos):
        total = orchestrator.run_mining_cycle(
            cycle=c,
            max_queries=args.max_queries,
            municipios=args.municipios,
            target_years=args.years
        )
        if total == 0 and len(orchestrator.keyword_pool.get_unexplored()) == 0:
            log_msg("El pool ha convergido sin nuevas palabras clave.")
            break
        if c < args.ciclos - 1:
            log_msg(f"Pausa estratégica inter-ciclo de 60 segundos antes de comenzar ciclo {c+1}...")
            time.sleep(60)
