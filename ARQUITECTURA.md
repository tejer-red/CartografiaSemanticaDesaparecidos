# Arquitectura del Proyecto: Cartografía Semántica de Desaparecidos

Este documento proporciona una visión integral de la arquitectura del proyecto, un sistema diseñado para la geolocalización y análisis semántico de reportes de personas desaparecidas en Jalisco.

## 🏗️ Topología del Monorepo

El proyecto está organizado en un monorepo altamente desacoplado que separa claramente las responsabilidades:

- **`frontend/`**: Aplicación Single Page Application (SPA) en React compilada con Vite. Optimizada para despliegues modernos (ej. Vercel) y funciona bajo un paradigma offline-first.
- **`backend/`**: API RESTful robusta y de alto rendimiento basada en FastAPI y Python, empaquetada en Docker.
- **`api/` (Legacy)**: Scripts originales en PHP que se mantienen por motivos de compatibilidad histórica y transicional.

---

## ⚙️ Backend (Capa de Servicios y API)

El backend está construido bajo una arquitectura limpia y orientada a micro-servicios, utilizando tecnologías de vanguardia en el ecosistema Python.

### Stack Tecnológico
- **Framework Web**: FastAPI corriendo sobre el servidor ASGI Uvicorn.
- **ORM**: SQLAlchemy.
- **Base de Datos**: PostgreSQL (hospedado en Supabase), interactuando mediante el driver `psycopg2-binary`. Adicionalmente, cuenta con soporte para migraciones desde MySQL (`pymysql`).

### Modelos de Dominio y Esquemas
La capa de datos está estrictamente tipada y validada utilizando Pydantic (`schemas.py`) y SQLAlchemy (`models.py`). Las entidades principales son:
- `Caso` / `Inferencia3` / `Sena`
- `PersonaFallecidaSinIdentificar`
- `Etiqueta`
- `Fosa`
- `Noticia`
- `Notebook` (para la gestión de estados de análisis guardados).

### Rutas (Endpoints API)
El sistema expone una API bajo el prefijo `/api/v1/` con endpoints RESTful tales como:
- `/api/v1/casos`
- `/api/v1/personasdesaparecidas`
- `/api/v1/personasfallecidassinidentificar`
- `/api/v1/fosas`
- `/api/v1/notebooks`

> [!TIP]
> **Optimización Crítica de Base de Datos**
> El endpoint principal de extracción de casos (`get_casos`) fue refactorizado para evadir los cuellos de botella del ORM. Sustituyendo operaciones recursivas `joinedload` por consultas SQL planas (`text()`) y aprovechando índices físicos (`idx_fecha_desaparicion`), el tiempo de respuesta masiva se redujo de ~62 a ~15 segundos.

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
