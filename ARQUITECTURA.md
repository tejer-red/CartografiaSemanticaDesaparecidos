# Arquitectura del Proyecto: Cartografía Semántica de Desaparecidos

Este documento proporciona una visión integral de la arquitectura del proyecto, un sistema diseñado para la geolocalización y análisis semántico de reportes de personas desaparecidas en Jalisco.

## 🏗️ Topología del Sistema: Abeja Master y Supabase Replica

La arquitectura actual implementa un ecosistema desacoplado que garantiza la privacidad de los datos sensibles (PII) mediante un modelo Master-Réplica estricto:

1. **Servidor `Abeja` (Master On-Premise):** Funciona como la única fuente de verdad (Single Source of Truth). Almacena los registros originales crudos (`cedulas_privadas`), opera el modelo de inferencia (vLLM / GPU), extrae entidades (NER) y posee el diccionario criptográfico (`pii_hash_registry`).
2. **Supabase (Nube Pública / Réplica Hasheada):** Es una base de datos pública en la nube que **solo recibe datos anonimizados/hasheados**. Se alimenta a través del script unidireccional `publish_to_supabase.py`.
3. **Frontend SPA (Vercel):** Aplicación React/Vite (`carto.tejer.red`) que consume los datos públicos de Supabase y ofrece la visualización de MapLibre y Sigma.js a los usuarios, manteniendo la PII protegida.

---

## ⚙️ Backend (Capa de Servicios y Pipeline)

El backend está construido bajo una arquitectura limpia y orientada a micro-servicios, utilizando tecnologías de vanguardia en el ecosistema Python.

### Stack Tecnológico
- **Framework Web**: FastAPI corriendo sobre el servidor ASGI Uvicorn.
- **ORM**: SQLAlchemy.
- **Base de Datos Master**: PostgreSQL local en el servidor `Abeja` (`192.168.1.64`).
- **Base de Datos Réplica (Auth/Pública)**: PostgreSQL alojado en **Supabase**, que expone los datos hasheados.
- **Procesamiento NLP/OSINT**: Playwright, SearXNG, GLiNER y Transformers para minería y anonimización de prensa.

### Modelos de Dominio (Arquitectura de 4 Capas)
La capa de datos está estrictamente estructurada en 4 niveles de protección y análisis (`models.py`):
1. **Capa Privada (Master):** `CedulaPrivada` (Cédulas completas con PII)
2. **Capa Criptográfica (Master):** `PiiHashRegistry` (Diccionario HMAC-SHA256)
3. **Capa Pública Hasheada (Supabase):** `Caso` (`cedulas_anonimizadas`), `Inferencia3`, `Notebook`
4. **Capa Hemerográfica y Ontológica (Supabase):** `Fosa`, `NoticiaCorpus`, `VinculoEntidad`

### Endpoints y API
El sistema expone la API bajo el prefijo `/api/v1/` para uso de intranet o analistas mediante Cloudflare Tunnel. Las tablas públicas suelen consultarse de forma directa desde Supabase en la versión de Vercel.

> [!TIP]
> **Pipeline Unidireccional y Zero-Knowledge**
> Ningún nombre real o domicilio (PII) cruza hacia Supabase o Vercel. Si un investigador con altos privilegios requiere desanonimizar, su frontend debe consultar directamente la API local privada en `Abeja` a través de una VPN o túnel seguro, el cual resuelve el hash criptográfico.

---

## 💻 Frontend (Capa de Presentación e Interacción)

El frontend está diseñado para manejar visualizaciones complejas de datos geoespaciales y de grafos sin comprometer el rendimiento en el hilo principal (Main Thread).

### Componentes Principales y Estructura
El grafo de componentes (`useData`, `TimelineSlider`, `MobileActionBar`, `HeaderCompact`, `Notebook`, `VisibleNotebook`, etc.) indica una arquitectura fuertemente orientada a módulos.
- **Contexto y Estado Global**: Manejado a través de `DataContext.jsx` con persistencia offline.
- **Gestión Offline-First**: Las notas, selecciones del mapa, y filtros de fecha utilizan `localStorage` e IndexedDB, logrando un aislamiento de datos estricto por `notebook_id`.

### Visualización y Renderizado
- **Mapas Geoespaciales**: Se apoya en **MapLibre (WebGL)** para el renderizado fluido de miles de marcadores geolocalizados.
- **Grafos Semánticos**: Implementa **Sigma.js** junto con el algoritmo **ForceAtlas2**.
  
> [!WARNING]
> **Prevención de Pérdida de Contexto WebGL**
> Los cálculos intensivos del algoritmo ForceAtlas2 para Sigma.js se mantienen controlados bajo estados de ciclo de vida (`isOpen`, `showSigma`) mediante hooks reactivos. Esto previene bucles o pérdida de contexto de WebGL con MapLibre cuando los modales están ocultos.

### Prevención de Fugas de Memoria
- El ciclo de vida (`utils/notebook.js`, `DataContext.jsx`) tiene prevenciones estrictas contra descargas automáticas redundantes o infinitas al cargar la ruta base (`/dist`).
- Las promesas pendientes o retries de MapLibre en `updateLayerData` se abortan proactivamente usando referencias del mapa (`mapRef`) para mantener estable la memoria del navegador.

---

## 🔄 Flujo de Migración de Datos

En el lado del backend (`scripts/migrate_data.py`), se integra un flujo ETL automatizado que toma datos estructurados desde una base de datos antigua MySQL (`OLD_DB`) e inyecta cargas masivas optimizadas hacia PostgreSQL (`NEW_DATABASE_URL`). Este script resuelve de manera autónoma las colisiones de índices.
