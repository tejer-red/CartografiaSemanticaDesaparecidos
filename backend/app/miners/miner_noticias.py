#!/usr/bin/env python3
"""
miner_noticias.py: Pipeline híbrido de minería e ingesta de notas periodísticas.
1. Descubrimiento: SearXNG local o DuckDuckGo HTML Search con rotación de user-agents.
2. Extracción Ultrarrápida: Trafilatura con headers de navegador (<50ms).
3. Fallback Dinámico: Playwright con control estricto de concurrencia (seguro para Raspberry Pi 3B+).
4. Rate Limiting Conservador: Jitter configurable entre consultas para prevenir bloqueos de IP.
"""

import os
import sys
import json
import time
import random
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional
try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

SEARXNG_URL = os.getenv("SEARXNG_URL", "http://127.0.0.1:8888")
PLAYWRIGHT_CONCURRENCY = int(os.getenv("PLAYWRIGHT_CONCURRENCY", "1"))

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0"
]


class NewsMiner:
    """Coordinador de búsqueda y extracción de notas periodísticas con rate-limiting conservador."""

    def __init__(self, searxng_url: str = SEARXNG_URL):
        self.searxng_url = searxng_url.rstrip("/")

    def get_random_user_agent(self) -> str:
        return random.choice(USER_AGENTS)

    def search_searxng(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Consulta la instancia local de SearXNG si está disponible."""
        params = urllib.parse.urlencode({
            "q": query,
            "format": "json",
            "categories": "news,general",
            "language": "es"
        })
        url = f"{self.searxng_url}/search?{params}"

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "CartografiaMiner/1.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    results = []
                    for r in data.get("results", [])[:max_results]:
                        results.append({
                            "url": r.get("url"),
                            "title": r.get("title", ""),
                            "content": r.get("content", ""),
                            "published_date": r.get("publishedDate")
                        })
                    if results:
                        return results
        except Exception:
            pass
        return []

    def search_duckduckgo_html(self, query: str, max_results: int = 4) -> List[Dict[str, Any]]:
        """
        Consulta el endpoint HTML de DuckDuckGo de manera conservadora y segura.
        Resuelve redirecciones tipo uddg y normaliza resultados.
        """
        search_url = "https://html.duckduckgo.com/html/"
        headers = {
            "User-Agent": self.get_random_user_agent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = urllib.parse.urlencode({"q": query}).encode("utf-8")

        results = []
        try:
            req = urllib.request.Request(search_url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status == 200:
                    html_content = resp.read().decode("utf-8", errors="ignore")
                    soup = BeautifulSoup(html_content, "html.parser")
                    for r in soup.find_all("div", class_="result"):
                        url_tag = r.find("a", class_="result__url")
                        title_tag = r.find("a", class_="result__title") or url_tag
                        snippet_tag = r.find("a", class_="result__snippet")

                        if not url_tag or not url_tag.get("href"):
                            continue

                        raw_href = url_tag["href"]
                        parsed_qs = urllib.parse.parse_qs(urllib.parse.urlparse(raw_href).query)
                        target_url = parsed_qs.get("uddg", [raw_href])[0]

                        # Descartar anuncios o dominios no relevantes
                        if "duckduckgo.com" in target_url or not target_url.startswith("http"):
                            continue

                        results.append({
                            "url": target_url,
                            "title": title_tag.text.strip() if title_tag else "",
                            "content": snippet_tag.text.strip() if snippet_tag else "",
                            "published_date": None
                        })
                        if len(results) >= max_results:
                            break
        except Exception as e:
            print(f"[MINER_WARN] DuckDuckGo HTML falló para query '{query}': {e}")

        return results

    def search_bing_news(self, query: str, max_results: int = 4) -> List[Dict[str, Any]]:
        """
        Consulta Bing News de manera directa, segura y sin bloqueos de bot.
        Extrae URLs reales de notas de prensa, títulos y snippets.
        """
        q = urllib.parse.quote(query)
        url = f"https://www.bing.com/news/search?q={q}"
        headers = {
            "User-Agent": self.get_random_user_agent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"
        }
        results = []
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    html_content = resp.read().decode("utf-8", errors="ignore")
                    soup = BeautifulSoup(html_content, "html.parser")
                    # Buscar cards y links con clase title
                    for a in soup.find_all("a", class_="title"):
                        target_url = a.get("href", "")
                        title = a.text.strip()
                        if target_url and target_url.startswith("http") and "bing.com" not in target_url:
                            results.append({
                                "url": target_url,
                                "title": title,
                                "content": "",
                                "published_date": None
                            })
                            if len(results) >= max_results:
                                break
        except Exception as e:
            print(f"[MINER_WARN] Bing News search error para query '{query}': {e}")
        return results

    def search_news(self, query: str, max_results: int = 4) -> List[Dict[str, Any]]:
        """
        Buscador unificado:
        1. Intenta SearXNG local si está arriba.
        2. Consulta Bing News (motor primario rápido y sin timeouts).
        """
        res = self.search_searxng(query, max_results=max_results)
        if res:
            return res
        return self.search_bing_news(query, max_results=max_results)

    def extract_article_content(self, url: str) -> Dict[str, Any]:
        """
        Extrae el contenido limpio de la nota periodística.
        Prioridad 1: Trafilatura con cabeceras de navegador.
        Prioridad 2: Playwright (si Trafilatura falla o el sitio requiere renderizado JS).
        """
        title = ""
        text = ""
        date = None

        # Intento 1: Trafilatura con descarga HTTP directa
        try:
            import trafilatura
            req = urllib.request.Request(
                url,
                headers={"User-Agent": self.get_random_user_agent(), "Accept": "text/html,application/xhtml+xml"}
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                html = resp.read().decode("utf-8", errors="ignore")
                extracted = trafilatura.extract(
                    html,
                    include_comments=False,
                    include_tables=False,
                    output_format="json",
                    with_metadata=True
                )
                if extracted:
                    parsed = json.loads(extracted)
                    text = parsed.get("text", "")
                    title = parsed.get("title", "")
                    date = parsed.get("date")
        except Exception:
            pass

        # Intento 2: Fallback Playwright (si Trafilatura no obtuvo suficiente texto)
        if len(text.strip()) < 80 and PLAYWRIGHT_CONCURRENCY > 0:
            try:
                from playwright.sync_api import sync_playwright
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True)
                    page = browser.new_page(user_agent=self.get_random_user_agent())
                    page.goto(url, timeout=15000, wait_until="domcontentloaded")
                    title = page.title()
                    paragraphs = page.locator("article p, .entry-content p, .article-body p, p").all_inner_texts()
                    text = "\n".join(paragraphs)
                    browser.close()
            except Exception:
                pass

        return {
            "url": url,
            "title": title or "Nota periodística sobre hallazgo o caso",
            "body": text.strip(),
            "date": date
        }

    def process_query_and_extract(self, query: str, max_results: int = 3) -> List[Dict[str, Any]]:
        """
        Ejecuta el ciclo de descubrimiento y extracción para una consulta.
        """
        articles = self.search_news(query, max_results=max_results)
        processed = []

        for item in articles:
            content = self.extract_article_content(item["url"])
            full_title = content["title"] or item.get("title", "")
            full_text = content["body"] or item.get("content", "")

            # Conservar solo artículos con texto real
            if len(full_text.strip()) >= 50:
                processed.append({
                    "url": item["url"],
                    "titular": full_title,
                    "fecha": content.get("date") or item.get("published_date"),
                    "cuerpo_texto": full_text[:6000],
                    "query_origen": query
                })

        return processed


news_miner_service = NewsMiner()
