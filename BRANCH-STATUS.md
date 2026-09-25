# Estado de la Rama: `feature/ner-ontologia-mineria`

- **Última actualización:** 2026-09-25 14:15 CST
- **Rama base:** `origin/auth-local-networking` (`869c275`)
- **Último commit:** `0b28c7e` (`fix(frontend): trigger supabase fallback in FetchNoticias when backend returns 0 corpus features`)
- **Estado de sincronización:** Cambios locales listos para commit
- **Estado general:** Conmutadores de Privacidad PII (Hasheada vs Real) y Subrayado Semántico NER implementados en Hiper-Grafo de Contexto, con resolución de domicilios desde PiiHashRegistry y desglose ontológico completo.

---

## 1. Registro Cronológico de Commits

| Hash | Fecha | Autor | Mensaje |
| :--- | :---: | :---: | :--- |
| *Pendiente* | 2026-09-25 | abundis | `feat(context): implement PII hasheada/real and NER entity highlight toggles in context hyper-graph` |
| `0b28c7e` | 2026-09-24 | abundis | `fix(frontend): trigger supabase fallback in FetchNoticias when backend returns 0 corpus features` |
| `e6548fe` | 2026-09-24 | abundis | `fix(analysis): resolve corpus route order, fallback to supabase on empty data, and fix context timeline dates` |
| `2784d43` | 2026-09-24 | abundis | `feat(analysis): implement news graph timeline, link context fosas/domicilios, and isolate journalistic osint` |
| `29df1e1` | 2026-09-24 | abundis | `fix(backend): add beautifulsoup4 and trafilatura to requirements and make bs4 import resilient` |
| `3a1633d` | 2026-09-24 | abundis | `fix(backend): resolve module import alias and PYTHONPATH in Docker container` |
| `5273ade` | 2026-09-24 | abundis | `fix(backend): add psycopg binary dependency and postgresql dialect fallback in Docker` |
| `1b47358` | 2026-09-24 | abundis | `feat(frontend): reroute all data queries to FastAPI backend as primary with Supabase fallback` |
| `1371eff` | 2026-09-23 | abundis | `fix(frontend): paginate supabase queries to bypass 1000 limit and allow anonymous fetchers on notebook routes` |
| `32a4b09` | 2026-09-23 | abundis | `fix(frontend): remove 1000 records limit, restore news map layer and fix text and context properties` |
| `4f589d9` | 2026-09-23 | abundis | `feat(frontend): decouple from FastAPI with direct Supabase client queries and RLS support` |
| `ca79cfb` | 2026-09-23 | abundis | `feat(architecture): implement Abeja master and Supabase public replica schema with zero-knowledge sync` |
| `5565d4a` | 2026-09-23 | abundis | `feat(frontend): sitemap restructuring, light theme CSS homologation, and list views for news and ontology` |
| `5b309e3` | 2026-09-23 | abundis | `feat(frontend): rename findings to Cobertura Periodística, simplify filters, and add roadmap TODO-LIST` |
| `aeb4263` | 2026-09-23 | abundis | `fix(frontend): restore localization conditions, resilient stats fallback, and timeline sync for findings panel` |
| `c5cf358` | 2026-09-23 | abundis | `feat: add ontology matching, OSINT miners, NER pipelines, and frontend analysis views` |
| `730c15b` | 2026-09-21 | abundis | `chore: add INSTRUCCIONES_GPU.md to gitignore` |
| `b723624` | 2026-09-21 | abundis | `feat(ner): setup dataset builder, query generator and GPU training plan` |

---

## 2. Bitácora Detallada de Cambios (Cambio a Cambio por Componente)

### CC. Conmutadores de Privacidad PII (Hasheada vs Real) y Subrayado Semántico NER en Hiper-Grafo de Contexto
- **Justificación técnica:**
  1. **Conmutador de Privacidad PII (`anonymized: bool`) en Backend (`backend/app/routes/ontology.py`):**
     - Se añadió el parámetro query `anonymized: bool = Query(default=True)` al endpoint `/ontology/context-graph`.
     - En modo anónimo (`anonymized=True`): Serializa los nodos `CASO_` utilizando la entidad pública `Caso` con hashes criptográficos HMAC-SHA256 (`[NOMBRE_HASH_xxxx]`), expedientes enmascarados `EXP-***-xxxxxx`, y domicilios hasheados `[DOMICILIO_HASH_xxxx]`.
     - En modo confidencial/auditoría (`anonymized=False`): Accede a `CedulaPrivada` para exponer el nombre real auditado de la persona desaparecida, su número de expediente judicial completo y teléfono de contacto.
     - **Resolución Canónica de Domicilios desde `PiiHashRegistry`:** Para los nodos de tipo inmueble / finca (`DOMICILIO_HASH_xxxx`), el backend consulta en lote la tabla `pii_hash_registry`. En modo desanonimizado, resuelve el hash directamente hacia su dirección postal real canónica (ej. `DOMICILIO_HASH_28feed03` $\rightarrow$ `OTHÓN BLANCO #189` o `DOMICILIO_HASH_5f4a8579` $\rightarrow$ `PRIVADA LÁZARO CÁRDENAS #326`), permitiendo análisis territorial auditable.
  2. **Controles Reactivos en Interfaz (`frontend/src/components/analysis/RedContextoPage.jsx`):**
     - Se agregaron las variables de estado reactivo `anonymized` (por defecto `true`) y `highlightEntities` (por defecto `true`).
     - **Botón Conmutador PII:** Botón interactivo con iconos `<Lock />` / `<Unlock />` y estilos condicionales (`graph-btn-lock-active` vs `graph-btn-lock-inactive`) para alternar entre `PII: Hasheada` y `PII: Real`.
     - **Botón Conmutador NER:** Botón interactivo con icono `<Sparkles />` para alternar entre `NER: Subrayado` y `Texto Plano`.
     - **Hook de Sincronización Reactiva:** Se incorporó un efecto secundario que mantiene sincronizado en tiempo real el nodo seleccionado en el panel lateral (`selectedNode`) al alternar entre modos, actualizando instantáneamente el nombre, etiquetas, descripción y credencial de auditoría sin necesidad de deseleccionar el nodo en el canvas.
  3. **Componente de Subrayado Semántico Forense (`HighlightedContextText`):**
     - Componente declarativo que parsea expresiones regulares y tokens PII:
       - Hashes de domicilio (`[DOMICILIO_HASH_...]`): Insignia violeta (`#8b5cf6`).
       - Hashes de nombre (`[NOMBRE_HASH_...]`): Insignia carmesí (`#e11d48`).
       - Hashes de teléfono/expediente: Insignia azul cian (`#0284c7`).
       - Patrones de violencia y modus operandi (`sujetos armados`, `levantón`, `privaron de la libertad`, etc.): Resaltado ámbar (`#d97706`).
       - Albergues e instituciones (`centro de rehabilitación`, `albergue`, `anexo`, `casa hogar`): Resaltado esmeralda (`#10b981`).
       - Vehículos (`camioneta`, `motocicleta`, `vehículo`): Resaltado celeste (`#38bdf8`).
       - Indicios forenses y cartas (`fosa clandestina`, `cuerpos`, `restos humanos`, `carta`, `recado`): Resaltado rojo y terracota.
  4. **Análisis de Blast Radius (`codebase-memory detect_changes`):**
     - Símbolos semilla modificados: 5. Total impactado: 0 módulos externos rotos.
- **Archivos Modificados:**
  - `backend/app/routes/ontology.py`
  - `frontend/src/components/analysis/RedContextoPage.jsx`
  - `BRANCH-STATUS.md`

### BB. Desglose Completo de Entidades Ontológicas y Resolución de Nombres en Catálogo de Contexto
- **Justificación técnica:**
  1. **Eliminación de Filtro Rígido en Backend (`backend/app/routes/ontology.py`):** El endpoint `/ontology/context-entities` limitaba el desglose `target_counts` con una cláusula `.filter(VinculoEntidad.relation_type.in_([...]))` que excluía relaciones válidas (`DESAPARECIO_JUNTO_A`, `REPORTO_MISMO_EVENTO`, `FAMILIAR_DE`, `MENCIONADO_EN_NOTICIA`, `POSIBLE_HALLAZGO_RELACIONADO`). Esto provocaba que en `/contexto` apareciera el aviso *"Sin desglose de entidades para esta categoría en la muestra"*. Se removió el filtro restrictivo para que el desglose estadístico cubra el 100% de categorías de la ontología.
  2. **Resolución y Precarga Batch de Metadatos (`ontology.py`):** Se implementó precarga en lote para:
     - `Caso` (`cedulas_anonimizadas`): Transforma `CASO_<uuid>` en `[NOMBRE_HASH_xxxx] (MUNICIPIO)` o nombre legible.
     - `NoticiaCorpus` y `Noticia`: Transforma `corpus_<id>` y `NOTICIA_<id>` en titulares reales de prensa.
     - `Fosa`: Mantiene el formato descriptivo con municipio y recuento de cuerpos recuperados.
  3. **Títulos e Iconografía Semántica (`ContextoListPage.jsx`):** Se añadieron títulos descriptivos e iconos especializados para las 5 categorías omitidas (`Desaparición Conjunta`, `Mismo Evento de Desaparición Coincidente`, `Parentesco Directo entre Víctimas Correlacionadas`, `Menciones Directas en Notas Periodísticas`, `Correlación Espacio-Temporal con Prensa`), y se mejoró el fallback de Supabase con formateo limpio de nombres.
  4. **Tipado de Nodos y Corrección de `X` en Hiper-Grafo (`RedContextoPage.jsx`):**
     - Se importó el componente `<X />` de `lucide-react`, eliminando la excepción `ReferenceError: X is not defined` que bloqueaba el renderizado del panel lateral de detalle al seleccionar cualquier nodo del grafo.
     - Se corrigió la asignación de tipos en el fallback de Supabase para evitar que nodos de casos o fosas se clasificaran erróneamente como `MODUS`.
  5. **Actualización de Documentación (`README.md`):** Se documentaron comandos de desarrollo local, despliegue en producción y funciones del modelo NER.
  6. **Análisis de Blast Radius (`codebase-memory detect_changes`):**
     - Símbolos semilla modificados: 0. Total impactado: 0 símbolos directos, 4 archivos modificados.
- **Archivos Modificados:**
  - `backend/app/routes/ontology.py`
  - `frontend/src/components/analysis/ContextoListPage.jsx`
  - `frontend/src/components/analysis/RedContextoPage.jsx`
  - `README.md`
  - `BRANCH-STATUS.md`

### Z. Desbloqueo de Rutas `/corpus`, Resiliencia de Fechas en Grafo de Contexto y Fallback a Supabase
- **Justificación técnica:**
  1. **Resolución de Conflicto de Rutas en FastAPI (`backend/app/routes/noticias.py`):** La ruta comodín `@router.get("/{id}")` estaba registrada antes de `@router.get("/corpus/geojson")` y `@router.get("/corpus/list")`. FastAPI interceptaba `/noticias/corpus/geojson` intentando convertir la cadena `"corpus"` a `int`, arrojando un error HTTP 422 (`int_parsing`) e impidiendo la descarga de noticias en `/cuaderno/nuevo`. Se reubicaron las rutas parametrizadas al final del archivo.
  2. **Activación de Fechas en Grafo de Contexto (`backend/app/routes/ontology.py`):** El endpoint `/context-graph` iteraba únicamente sobre `CedulaPrivada` para poblar metadatos. En entornos donde `CedulaPrivada` no está presente, los casos quedaban con `date: null`, provocando que el cálculo de límites temporales (`dateBounds`) fuera nulo y la barra flotante del Timeline no se renderizara. Se reescribió la población iterando sobre `caso_uuids` con fallback automático a `Caso` (`cedulas_anonimizadas`).
  3. **Fallback Robusto a Supabase en Listados y Grafos (`NoticiasListPage.jsx`, `RedNoticiasPage.jsx`):** La condición de éxito previa (`if (data && data.items)`) evaluaba arreglos vacíos `[]` como verdaderos, abortando el fallback a Supabase a pesar de que la base en la nube contiene 307 noticias y 12,268 vínculos. Se condicionó el retorno a `data.items.length > 0` y `data.nodes.length > 0`.
  4. **Enlace Simbólico de Scripts en Contenedor (`backend/Dockerfile`):** Se incorporó `ln -s /app/scripts /app/backend/scripts` para garantizar la ejecución directa de módulos con `python -m backend.scripts.*`.
- **Archivos Modificados:**
  - `backend/app/routes/noticias.py`
  - `backend/app/routes/ontology.py`
  - `backend/Dockerfile`
  - `frontend/src/components/analysis/NoticiasListPage.jsx`
  - `frontend/src/components/analysis/RedNoticiasPage.jsx`
  - `BRANCH-STATUS.md`

### Y. Separación Epistemológica de Redes, Timeline Dinámico en Grafo de Noticias y Correlación de Contexto
- **Justificación técnica:**
  1. **Separación Estricta de Dominios de Conocimiento:**
     - **Módulo de Noticias (`/noticias/grafo`):** Se restringió la consulta de `/ontology/graph` exclusivamente a tipos de vínculo periodístico (`POSIBLE_HALLAZGO_RELACIONADO`, `MENCIONADO_EN_NOTICIA`), eliminando la contaminación cruzada con fosas y domicilios y preservando la topología bipartita canónica (Cédulas ↔ Noticias Periodísticas Minadas).
     - **Matriz de Contexto (`/contexto/grafo` y `/contexto`):** Se enriquecieron los endpoints `/context-graph` y `/context-entities` con muestreo estratificado balanceado para reflejar todas las dimensiones estructurales del delito (`MODUS_OPERANDI`, `POSIBLE_HALLAZGO_EN_FOSA`, `DESAPARECIO_EN_DOMICILIO`, `INSTITUCION_LUGAR`, `VEHICULO_SOSPECHOSO`, `DESTINO_DECLARADO`, etc.).
  2. **Pipeline de Enlace de Contexto Forense (`link_contexto_fosas_domicilios.py`):**
     - Se correlacionaron 265 domicilios y fincas de desaparición compartidas mediante hashes criptográficos (`DESAPARECIO_EN_DOMICILIO`, 603 aristas).
     - Se correlacionaron 71 fosas clandestinas oficiales con casos basados en proximidad geográfica (Haversine $\le 10$ km), causalidad temporal ($\le 2$ años) y concordancia municipal (`POSIBLE_HALLAZGO_EN_FOSA`, 4,411 aristas).
  3. **Timeline Dinámico y Reproductor Temporal en Grafo de Noticias (`RedNoticiasPage.jsx`):**
     - Se calculó el espacio temporal global a partir de las marcas temporales (`date`) de casos y notas periodísticas (abarcando desde 2007 hasta 2024).
     - Se implementó una barra flotante con slider arrastrable (0 a 100), botón Play/Pausa (bucle a 350ms) y selector de ancho de ventana configurable (30, 90, 180, 365, 730 días).
     - Se preservó la coherencia relacional: al activarse el timeline, se conservan los nodos comprendidos en el intervalo temporal junto con sus vecinos inmediatos conectados, permitiendo ver la evolución secuencial de la cobertura de prensa a lo largo de los años.
- **Archivos Modificados:**
  - `backend/app/routes/ontology.py`
  - `backend/scripts/link_contexto_fosas_domicilios.py` (nuevo script)
  - `frontend/src/components/analysis/RedNoticiasPage.jsx`
  - `frontend/src/components/analysis/RedContextoPage.jsx`
  - `frontend/src/components/analysis/ContextoListPage.jsx`
  - `BRANCH-STATUS.md`

### X. Enrutamiento a Túnel Cloudflare (`api-carto.tejer.red`), Soporte MultiGrafo en Sigma y Resiliencia en Casos
- **Justificación técnica:**
  1. **Enrutamiento de Producción a través del Túnel Cloudflare y Auto-Sanitización (`config.js`):** El frontend desplegado en Vercel opera bajo `cartografia.tejer.red` o subdominios `*.vercel.app`. Debido a las reglas de reescritura de Single Page App (`rewrites: source: "/(.*)", destination: "/index.html"`), cualquier petición relativa a `cartografia.tejer.red/api/v1` retornaba el `index.html` de React en vez de JSON. Adicionalmente, existía una discrepancia entre el subdominio configurado en variables de entorno (`api.carto.tejer.red` con punto) y el túnel real activo en Cloudflare (`api-carto.tejer.red` con guión), lo cual causaba errores `ERR_NAME_NOT_RESOLVED`. Se incorporó auto-sanitización de `VITE_API_URL` (`.replace('api.carto.tejer.red', 'api-carto.tejer.red')`) y fallback canónico a `https://api-carto.tejer.red/api/v1`.
  2. **Resolución de Error Crítico en Sigma/Graphology (`UsageGraphError`):** Al fallar temporalmente el backend o recibir aristas paralelas de Supabase (`vinculos_entidades`), Sigma arrojaba `Graph.addDirectedEdgeWithKey: an edge linking A to B already exists...` congelando la interfaz. Esto ocurría porque `@react-sigma/core` inicializa un grafo simple por defecto (`multi: false`). Se actualizó tanto `RedNoticiasPage.jsx` como `RedContextoPage.jsx` pasando `<SigmaContainer graph={MultiDirectedGraph}>` y protegiendo el hook de carga `loadGraph` con `try/catch`.
  3. **Tolerancia a Fallos en Consulta de Casos (`casos.py`):** La consulta SQL unificada (`get_casos`) requería la presencia de la vista/tabla de inferencias `repd_vp_inferencia3`. En entornos o réplicas donde esta tabla auxiliar aún no está sincronizada, el endpoint arrojaba un `HTTP 500 Internal Server Error`. Se agregaron bloques defensivos `try/except` que degradan con elegancia a `cedulas_anonimizadas` limpia si las inferencias fallan.
  4. **Protección contra Desbordamiento de Parámetros (`casos.py`):** Para la extracción de señas y tatuajes (`repd_vp_cedulas_senas`), se implementó un recorte defensivo a los primeros 1,000 identificadores (`case_ids[:1000]`), evitando que listas de varios miles de casos sobrepasen el límite de binds de PostgreSQL en consultas `IN :ids`.
  5. **Análisis de Blast Radius (`codebase-memory detect_changes`):**
     - Símbolos semilla modificados: 2. Total impactado: 1 símbolo (`CartografiaSemanticaDesaparecidos.frontend.src.config`, 1 hop).
- **Archivos Modificados:**
  - `frontend/src/config.js`
  - `frontend/src/components/analysis/RedNoticiasPage.jsx`
  - `frontend/src/components/analysis/RedContextoPage.jsx`
  - `backend/app/routes/casos.py`
  - `README_DESPLIEGUE.md`

### W. Inclusión de Dependencias de Minería Web (`requirements.txt` y `miner_noticias.py`)
- **Justificación técnica:**
  1. **Error ModuleNotFoundError en Uvicorn (`bs4`):** Al importar las rutas de minería OSINT (`osint.py` ➔ `worker.py` ➔ `miner_noticias.py`), la importación estricta de `from bs4 import BeautifulSoup` fallaba porque `beautifulsoup4` no estaba en `requirements.txt`.
  2. **Inclusión de `beautifulsoup4` y `trafilatura`:** Se añadieron ambas librerías a `backend/requirements.txt` para garantizar la capacidad de parsing HTML y extracción ultrarrápida de notas periodísticas en producción.
  3. **Importación Resiliente:** Se envolvió la importación de `bs4` en un bloque `try/except ImportError` en `miner_noticias.py` para permitir que el backend levante y atienda endpoints generales aún si el parser web no estuviera disponible temporalmente.
- **Archivos Modificados:**
  - `backend/requirements.txt`
  - `backend/app/miners/miner_noticias.py`

### V. Resolución de Importación de Módulos en Contenedor Docker (`backend.app` y `PYTHONPATH`)
- **Justificación técnica:**
  1. **Error ModuleNotFoundError en Uvicorn (`backend`):** Al ejecutar el contenedor Docker construido con `context: ./backend`, el contenido de `backend/` se monta directamente en `/app`. Por ende, el paquete raíz dentro del contenedor es `app`, y las importaciones absolutas que usan `from backend.app...` fallaban con `ModuleNotFoundError: No module named 'backend'`.
  2. **Alias Dinámico en `__init__.py`:** Se añadió registro automático en `sys.modules['backend']` y `sys.modules['backend.app']` dentro de `backend/app/__init__.py` cuando el módulo es cargado como `app`.
  3. **Symlink y Variable de Entorno en `Dockerfile`:** Se incorporó `ENV PYTHONPATH="/app"` y la creación del symlink `/app/backend/app -> /app/app` en `backend/Dockerfile` para garantizar compatibilidad total e inmediata.
- **Archivos Modificados:**
  - `backend/Dockerfile`
  - `backend/app/__init__.py`

### U. Corrección de Driver PostgreSQL en Docker (`requirements.txt` y `database.py`)
- **Justificación técnica:**
  1. **Error ModuleNotFoundError en Uvicorn (`psycopg`):** En Python 3.12 con SQLAlchemy 2.0+, al crear el motor con `create_engine("postgresql://...")`, el dialecto predeterminado de SQLAlchemy intenta cargar la librería `psycopg` (Psycopg 3). En el contenedor de Docker de `abeja`, solo estaba instalado `psycopg2-binary`, lo que causaba el fallo fatal `ModuleNotFoundError: No module named 'psycopg'`.
  2. **Inclusión de `psycopg[binary]`:** Se agregó `psycopg[binary]` en `backend/requirements.txt` junto con `python-dotenv`, `pydantic` y `requests`.
  3. **Normalización y Resiliencia de Dialecto (`database.py`):** Se implementó normalización de URLs (`postgres://` ➔ `postgresql://`) y un mecanismo de reintento automático: si falla la conexión primaria con `psycopg` v3, el motor intenta automáticamente `postgresql+psycopg2://` antes de recurrir a cualquier fallback.
- **Archivos Modificados:**
  - `backend/requirements.txt`
  - `backend/app/database.py`

### T. Redirección Integral de Peticiones del Frontend al Backend FastAPI (`API_BASE_URL`)
- **Justificación técnica:**
  1. **Unificación Arquitectónica hacia FastAPI:** Se configuró el FastAPI Backend (`http://0.0.0.0:8008/api/v1` en desarrollo o `https://cartografia.tejer.red/api/v1` en producción) como la fuente primaria y central de datos para todas las operaciones del frontend, aprovechando los cálculos enriquecidos del backend (geocodificación por centroides municipales con jitter determinista, resolución de tatuajes, NER tags clasificados, grafos con clustering y super-nodos).
  2. **Persistencia del Fallback Resiliente a Supabase:** Para garantizar que el despliegue serverless (ej. en Vercel) nunca se interrumpa ante caídas de red o reinicios de backend, todas las llamadas a endpoints encapsulan su consulta en bloques `try/catch` con fallback automático e indoloro a las consultas cliente de Supabase (`@supabase/supabase-js`).
  3. **Seguridad Estricta y Eliminación de Credenciales:** Se eliminó la clave de API hardcodeada (`API_KEY: 'gNXGJ0h...'`) que existía en `FetchCedulas.jsx`.
  4. **Resolución Dinámica de Base URL (`config.js`):** Se adaptó `getApiBaseUrl` para detectar automáticamente hosts bajo `vercel.app` y redirigirlos a `https://cartografia.tejer.red/api/v1` cuando no exista una variable `VITE_API_URL` explícita.
  5. **Componentes y Vistas Actualizados a Backend Primario:**
     - `FetchCedulas.jsx`: Llama a `GET /api/v1/casos` con parámetros de fecha; procesa los registros con centroides y señas particulares.
     - `FetchFosas.jsx`: Llama a `GET /api/v1/fosas` con `limit=10000`, cubriendo la totalidad de fosas registradas.
     - `FetchNoticias.jsx`: Llama a `GET /api/v1/noticias/corpus/geojson` y `GET /api/v1/noticias`, cargando las notas del corpus GeoJSON directamente procesadas.
     - `NoticiasListPage.jsx`: Llama a `GET /api/v1/ontology/noticias-list` con paginación, filtros de municipio y búsqueda de texto.
     - `RedNoticiasPage.jsx`: Llama a `GET /api/v1/ontology/graph` para obtener el grafo semántico con nodos y aristas calculadas.
     - `RedContextoPage.jsx`: Llama a `GET /api/v1/ontology/context-graph` para la topología de modus operandi y eventos asociados.
     - `ContextoListPage.jsx`: Llama a `GET /api/v1/ontology/context-entities` recibiendo categorías agregadas y entidades top directamente del backend.
     - `NotebookListPage.jsx`: Llama a `GET /api/v1/notebooks` para listar cuadernos persistidos.
     - `notebook.js`: Persistencia (`POST /api/v1/notebooks`) y recuperación (`GET /api/v1/notebooks/{id}`) a través del backend.
  6. **Análisis de Blast Radius (`codebase-memory detect_changes`):**
     - Módulos impactados: `frontend/src` (6 símbolos directos / 2 hops: `DataContext.updateLayerData`, `VisibleNotebook.VisibleNotebook`, `config`, `NotebookListPage.handleDeleteNotebook`, `Notebook.Notebook`, `DataContext.avoidLayerOverlap`).
- **Archivos Modificados y Creados:**
  - `DEPLOY.md` (Creado: Guía universal de despliegue local y producción en Dockge y Vercel)
  - `MICROSERVICIOS.md` (Creado: Catálogo de microservicios, matriz de puertos y diagrama de topología Mermaid)
  - `frontend/src/config.js`
  - `frontend/src/components/data/FetchCedulas.jsx`
  - `frontend/src/components/data/FetchFosas.jsx`
  - `frontend/src/components/data/FetchNoticias.jsx`
  - `frontend/src/components/analysis/NoticiasListPage.jsx`
  - `frontend/src/components/analysis/RedNoticiasPage.jsx`
  - `frontend/src/components/analysis/RedContextoPage.jsx`
  - `frontend/src/components/analysis/ContextoListPage.jsx`
  - `frontend/src/components/notebook/NotebookListPage.jsx`
  - `frontend/src/utils/notebook.js`
  - `frontend/src/context/layerManager.js`
  - `.gitignore`

### S. Corrección de Ejecución y Visibilidad de Capa de Noticias (`FetchNoticias.jsx` y `layerManager.js`)
- **Justificación técnica:**
  1. **Corrección de ReferenceError Fatal (`FetchNoticias.jsx`):** En `FetchNoticias.jsx`, la variable para noticias de casos se definió como `recordsCasos`, pero en el filtro de coordenadas se utilizaba `records.filter(...)`. Esto provocaba una excepción `ReferenceError: records is not defined` que caía en el bloque catch y abortaba el procesamiento de la capa de noticias. Se corrigió a `(recordsCasos || []).filter(...)`.
  2. **Corrección de Bandera de Visibilidad en Capa de Noticias (`layerManager.js`):** `DataContext.jsx` asigna a `markerType` las cadenas `'noticiasLayer_active'` o `'noticiasLayer_inactive'` para la capa de noticias. Sin embargo, `layerManager.applyVisibility` validaba `selectedMarkerTypes.includes(markerType)`, y al buscar `'noticiasLayer_active'` dentro de los tipos de marcadores (`['cedula_busqueda', 'fosa', 'noticia_caso', 'noticia_corpus']`), retornaba `false` y forzaba `visibility: 'none'`. Se actualizó `applyVisibility` para reconocer explícitamente los estados booleanos y las banderas `'noticiasLayer_active'` / `'noticiasLayer_inactive'`.
- **Frontend - Archivos Modificados:**
  - `frontend/src/components/data/FetchNoticias.jsx`
  - `frontend/src/context/layerManager.js`

### R. Paginación por Lotes en Supabase (.range) y Montaje de Fetchers para Rutas Públicas de Cuaderno
- **Justificación técnica:**
  1. **Desbloqueo de Descarga en Cuaderno (`App.jsx`):** En `App.jsx`, `shouldRenderMapAndFetchers` estaba condicionado a `(isNotebookRoute && user)`. Al ser el mapa público y no requerir login, `user` es `null` para visitantes sin sesión en `/cuaderno/nuevo` y `/cuaderno/:id`. Esto provocaba que los componentes `<FetchCedulas>`, `<FetchFosas>`, `<FetchNoticias>` y `<MapComponent>` nunca se montaran en el DOM, congelando la pantalla en "Descargando Datos...". Se corrigió la condición a `!isIndependentView && (isVisibleRoute || isNotebookRoute)` para que los fetchers y el mapa se monten siempre.
  2. **Superación del Límite Estricto de 1,000 Registros de Supabase/PostgREST (`FetchCedulas.jsx`, `FetchFosas.jsx`, `FetchNoticias.jsx`):** Supabase y PostgREST imponen un tope rígido de `max-rows = 1000` por respuesta HTTP, ignorando llamadas directas a `.limit(10000)`. Se implementó un ciclo de paginación por rangos (`.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)`) en lotes de 1,000 registros que continúa iterando hasta que `data.length < PAGE_SIZE`. Esto permite descargar la totalidad de los datos (por ejemplo, los 4,073 casos del período 2020-2024 o los 5,542 casos históricos completos).
  3. **Carga y Renderizado Resiliente de Capa de Prensa (`FetchNoticias.jsx`):** Se aseguró que si el estilo del mapa aún no ha terminado de cargar al momento de procesar los datos de noticias, se registre un listener preventivo `map.once('style.load')` (idéntico al de cédulas) para garantizar que `noticiasLayer` y sus contadores se actualicen sin bloqueos ni descartes.
- **Frontend - Archivos Modificados:**
  - `frontend/src/App.jsx`
  - `frontend/src/components/data/FetchCedulas.jsx`
  - `frontend/src/components/data/FetchFosas.jsx`
  - `frontend/src/components/data/FetchNoticias.jsx`


### Q. Apertura Pública del Mapa (Sin Contraseña) y Homologación Integral de Tema Claro en Grafos
- **Justificación técnica:**
  1. **Acceso Libre y Abierto al Mapa Cartográfico (`App.jsx`):** Las rutas `/cuaderno/nuevo` y `/cuaderno/:id` exigían autenticación previa redirigiendo a `<LoginScreen />`. Se removió dicha barrera de acceso para permitir exploración pública universal e inmediata sin requerir credenciales ni contraseñas.
  2. **Homologación de Estilos y Selects Oscuros (`RedContextoPage.jsx`):** Se eliminaron los contenedores e inputs con fondo negro (`#090d16`, `#1e293b`, `#131d31`, `#0f172a`), reemplazándolos con la clase unificada `.graph-select-filter` y el sistema de diseño claro del proyecto (`#ffffff`, bordes `#cbd5e1`/`#e2e8f0`, textos `#0f172a`/`#334155`).
  3. **Barra Temporal y Sidebar de Detalle Forense en Grafo:** La barra flotante del reproductor histórico de eventos y el panel lateral de detalle forense ahora se integran visualmente con fondo claro semitransparente, leyendas legibles y tarjetas de atributos forenses estructurados de alto contraste.
- **Frontend - Archivos Modificados:**
  - `frontend/src/App.jsx`
  - `frontend/src/components/analysis/RedContextoPage.jsx`

### P. Corrección de Aristas Dirigidas Duplicadas en Grafos de Relaciones (`UsageGraphError`)
- **Justificación técnica:**
  1. **Excepción Fatal en Graphology (`addDirectedEdgeWithKey` / `addEdge`):** Al existir casos con múltiples eventos compartidos hacia la misma entidad o entre casos vinculados, Graphology lanzaba `Uncaught UsageGraphError: Graph.addDirectedEdgeWithKey: an edge linking A to B already exists`.
  2. **Configuración Multi-Grafo Completa:** Se actualizaron las instancias de Graph en `RedNoticiasPage.jsx`, `RedContextoPage.jsx` y `semanticGraphUtils.jsx` para admitir explícitamente aristas múltiples dirigidas (`type: 'directed', multi: true, allowSelfLoops: true`).
  3. **Generación Determinista de Llaves de Arista:** Se implementó verificación preventiva (`hasEdge(edgeKey)`, `hasDirectedEdge`) y captura de errores por clave duplicada para garantizar un renderizado fluido del grafo sin romper la ejecución de React.
- **Frontend - Archivos Modificados:**
  - `frontend/src/components/analysis/RedNoticiasPage.jsx`
  - `frontend/src/components/analysis/RedContextoPage.jsx`
  - `frontend/src/utils/semanticGraphUtils.jsx`

### O. Corrección de Límites de Consulta, Carga de Prensa en Mapa y Renderizado de Texto y Vínculos
- **Justificación técnica:**
  1. **Tope de 1,000 Registros de Supabase:** Por defecto, Supabase API trunca a 1,000 registros si no se especifica `.limit()`. Se fijó `.limit(10000)` en `FetchCedulas.jsx` para permitir cargar los 1,428 casos del año 2023 o los 5,542 casos históricos completos según el filtro.
  2. **Noticias del Corpus en Mapa (Prensa 0):** En `FetchNoticias.jsx`, el array de noticias del corpus generado desde Supabase (`corpusFeatures`) no se estaba conectando al array de salida `allFeatures`, provocando que el contador de prensa mostrara 0. Se restauró el mapeo unificado con timestamps válidos para el timeline.
  3. **Texto Completo en Catálogo de Noticias (`NoticiasListPage.jsx`):** Las notas no mostraban el texto porque el mapeo enviaba `cuerpo_completo` mientras el renderizador esperaba `cuerpo_texto`. Se homologaron ambos campos con fallback al `resumen_hallazgo`.
  4. **Excepción Fatal en Catálogo de Contexto (`ContextoListPage.jsx`):** El componente lanzaba `Uncaught TypeError: can't access property "toLocaleString", g.total_vinculos is undefined`. Se normalizó la estructura del objeto de respuesta para incluir `total_vinculos` y `entities: [...]` con sus repeticiones correspondientes.
- **Frontend - Archivos Modificados:**
  - `frontend/src/components/data/FetchCedulas.jsx`
  - `frontend/src/components/data/FetchNoticias.jsx`
  - `frontend/src/components/analysis/NoticiasListPage.jsx`
  - `frontend/src/components/analysis/ContextoListPage.jsx`

### N. Desacoplamiento Total de Backend: Frontend 100% Serverless con Consultas Directas a Supabase
- **Justificación técnica:**
  1. **Independencia Operativa y Cero Servidores:** Eliminar la dependencia obligatoria de FastAPI, túneles de Cloudflare o servidores intermedios para la visualización pública en Vercel.
  2. **Arquitectura Zero-Backend en Nube:** El frontend en React interactúa directamente con la réplica hasheada de Supabase vía `@supabase/supabase-js`, aprovechando las políticas de Row Level Security (RLS) habilitadas para lectura anónima y autenticada.
  3. **Resiliencia con Fallback:** Todos los componentes mantienen un fallback transparente hacia `API_BASE_URL` en caso de que se requiera alternar a una API local o privada.
- **Frontend - Componentes Migrados a Supabase Directo:**
  - `frontend/src/components/data/FetchCedulas.jsx`: Consulta `cedulas_anonimizadas` con join a `repd_vp_inferencia3(*)` para cargar los 5,542 casos con sus coordenadas y sum_score sin tocar FastAPI.
  - `frontend/src/components/data/FetchFosas.jsx`: Consulta directamente la tabla pública `fosas` en Supabase.
  - `frontend/src/components/data/FetchNoticias.jsx`: Obtiene las notas del corpus directamente de `noticias_corpus` mapeándolas a GeoJSON en memoria.
  - `frontend/src/components/analysis/NoticiasListPage.jsx`: Paginación y búsqueda de texto completo con operadores nativos de Supabase (`ilike`, `or`).
  - `frontend/src/components/analysis/ContextoListPage.jsx`: Agrupación y conteo relacional sobre `vinculos_entidades` directamente en el navegador.
  - `frontend/src/components/analysis/RedNoticiasPage.jsx`: Construcción autónoma del grafo Sigma.js (nodos y aristas) a partir de `vinculos_entidades`.
  - `frontend/src/components/analysis/RedContextoPage.jsx`: Generación del grafo de contexto y eventos criminales directamente desde Supabase.
  - `frontend/src/utils/notebook.js` & `NotebookListPage.jsx`: Persistencia y lectura remota de libretas de investigación directamente contra la tabla `notebooks`.
- **Backend / Scripts:**
  - `backend/scripts/publish_to_supabase.py`: Se añadió el adaptador `psycopg2.extras.Json` para serializar diccionarios JSONB automáticamente durante la sincronización Abeja ➔ Supabase.

### M. Arquitectura Master-Réplica (Abeja-Supabase) y Pipeline de Publicación Zero-Knowledge
- **Justificación técnica:**
  1. **Privacidad Extrema (Zero-Knowledge en la Nube):** Garantizar que ninguna PII real escape del servidor local (`Abeja`). La nube (`Supabase`) se rediseña como una réplica de sólo lectura que aloja únicamente datos criptográficamente hasheados, los cuales son consumidos por la aplicación en Vercel.
  2. **Independencia Operativa y Retrocompatibilidad:** Permitir que los analistas en la intranet consulten la base cruda con todos los metadatos forenses, mientras la versión pública mantiene la compatibilidad de esquemas para los mapas y grafos en React.
- **Backend - Archivos Modificados/Creados:**
  - `backend/scripts/supabase_schema_clean.sql` **[NEW]**: Script DDL que define el esquema canónico estrictamente público para inicializar la nueva base de datos en Supabase (incluyendo `fosas`, `cedulas_anonimizadas`, `repd_vp_inferencia3`, `noticias_corpus`, `vinculos_entidades`, y `notebooks`). Omite deliberadamente cualquier tabla privada.
  - `backend/scripts/publish_to_supabase.py` **[NEW]**: Pipeline ETL de publicación unidireccional. Se conecta simultáneamente a PostgreSQL local (`DATABASE_URL`) y Supabase (`SUPABASE_DATABASE_URL`), realizando _Batch Upserts_ (`ON CONFLICT DO UPDATE`) de las 5 tablas públicas garantizando sincronía.
- **Documentación - Archivos Modificados:**
  - `ARQUITECTURA.md` **[MODIFY]**: Refactorización de la sección de Topología para explicar el modelo de datos crudo en Abeja vs hasheado en Supabase, así como la separación en 4 capas lógicas.
  - `MICROSERVICIOS_CARTOGRAFIA.md` **[MODIFY]**: Actualización del diagrama Mermaid para reflejar el rol del script `publish_to_supabase.py` como orquestador de sincronización hacia la nube.
  - `README_DESPLIEGUE.md` **[MODIFY]**: Se reemplazó la sección de `migrate_data.py` (legacy) por los nuevos pasos de aprovisionamiento de la base de datos limpia en Supabase y la ejecución del sincronizador.

---

### L. Reestructuración Canónica del Sitemap, Homologación Visual (Tema Claro) y Vistas en Lista de Noticias y Contexto Ontológico
- **Justificación técnica:**
  1. **Arquitectura de Información Coherente (Sitemap):** Se reorganizó la jerarquía de rutas para separar claramente la visualización en lista (catálogos de consulta rápida y lectura asistida) de la visualización en grafo de relaciones (análisis de redes Sigma.js), con redirecciones transparentes para preservar compatibilidad con enlaces existentes.
  2. **Homologación de Estilos (Design System):** Se eliminaron los fondos oscuros inline (`#090d16`, `#0f172a`) de los grafos para alinearse con la identidad global de `index.css` (fondos blancos `#ffffff`, grises `#f8fafc`, bordes `#e2e8f0` y tipografía de alto contraste).
  3. **Navegación Ligera (Breadcrumb):** Se implementó un componente unificado de migas de pan con enlace rápido de retorno a Inicio, visible en todas las rutas públicas.
- **Backend (`backend/app/routes/ontology.py`):**
  - **Endpoint `GET /api/v1/ontology/noticias-list`:** Entrega el corpus periodístico paginado con filtros por municipio y búsqueda de texto completo, adjuntando entidades NER extraídas para el resaltador del frontend.
  - **Endpoint `GET /api/v1/ontology/context-entities`:** Agrupa y cuenta las relaciones ontológicas de `vinculos_entidades`, ordenándolas por frecuencia descendente con desglose de entidades destino para alimentar la vista en lista sin exponer PII.
- **Frontend - Nuevos Componentes y Estilos:**
  - `frontend/src/styles/GraphPage.css`: Hoja de estilos compartida para las vistas de red Sigma, con toolbar modular, badges de conteo y panel lateral de detalle en tema claro.
  - `frontend/src/components/layout/Breadcrumb.jsx` & `Breadcrumb.css`: Barra de navegación contextual dinámica con botón `← Volver al Inicio`.
  - `frontend/src/components/analysis/NoticiasListPage.jsx` & `NoticiasListPage.css`: Catálogo de noticias con buscador, filtro por municipio, badges de hallazgos (cuerpos/restos), texto completo expandible y resaltador semántico NER (`HighlightedArticleText`) adaptado a fondo claro.
  - `frontend/src/components/analysis/ContextoListPage.jsx` & `ContextoListPage.css`: Vista tabular de convenciones del registro ontológico agrupadas por tipo de relación, con barras de distribución porcentual y botón para saltar al hiper-grafo.
- **Frontend - Archivos Modificados:**
  - `frontend/src/App.jsx`:
    - Redirección canónica: `/cuaderno` → `/cuaderno/lista`.
    - Redirecciones de compatibilidad: `/red-noticias` → `/noticias/grafo` y `/red-contexto` → `/contexto/grafo`.
    - Rutas nuevas: `/contexto` (lista), `/contexto/grafo` (red), `/noticias` (lista), `/noticias/grafo` (red).
    - Inserción global del `<Breadcrumb />`.
    - Optimización `isIndependentView` para evitar instanciar el mapa WebGL en las nuevas rutas.
  - `frontend/src/components/analysis/RedNoticiasPage.jsx`: Migrado a tema claro con `GraphPage.css`, enlace bidireccional hacia `/noticias` (catálogo lista).
  - `frontend/src/components/analysis/RedContextoPage.jsx`: Topbar modular en tema claro y enlaces de navegación hacia `/contexto` y `/noticias/grafo`.
  - `frontend/src/components/layout/LandingPage.jsx`: Botones de acción actualizados para apuntar a `/contexto` y `/noticias`.


---

## 1. Registro Cronológico de Commits

| Hash | Fecha | Autor | Mensaje |
| :--- | :---: | :---: | :--- |
| `5c4f436` | 2026-09-23 | abundis | `feat(frontend): rename findings to Cobertura Periodística, simplify filters, and add roadmap TODO-LIST` |
| `aeb4263` | 2026-09-23 | abundis | `fix(frontend): restore localization conditions, resilient stats fallback, and timeline sync for findings panel` |
| `c5cf358` | 2026-09-23 | abundis | `feat: add ontology matching, OSINT miners, NER pipelines, and frontend analysis views` |
| `730c15b` | 2026-09-21 | abundis | `chore: add INSTRUCCIONES_GPU.md to gitignore` |
| `b723624` | 2026-09-21 | abundis | `feat(ner): setup dataset builder, query generator and GPU training plan` |

---

## 2. Bitácora Detallada de Cambios (Cambio a Cambio por Componente)

### K. Privacidad Criptográfica de Cédulas (PII Hasheada vs Real), Resaltado Semántico NER de Prensa y Tarea 6 en TODO-LIST
- **Justificación técnica:**
  1. **Privacidad de Víctimas y Denunciantes:** Las cédulas de búsqueda contienen PII protegida por la ley. En el visualizador ontológico y en todo el sitio, las personas y domicilios deben mostrarse bajo hashes (`[NOMBRE_HASH_...]`, `[DOMICILIO_HASH_...]`) de forma predeterminada, ofreciendo un conmutador explícito para auditores forenses en red local (`anonymized=false`).
  2. **Análisis Hemerográfico Completo:** Los analistas requieren leer la nota de prensa íntegra sin recortes arbitrarios, con identificación visual inmediata (subrayado) de municipios, colonias, términos forenses (`fosa`, `cuerpos`, `restos`, `calcinados`) y colectivos de búsqueda.
- **Backend (`backend/app/routes/ontology.py`):**
  - Se incorporó el parámetro `anonymized: bool = Query(default=True)` a `GET /api/v1/ontology/graph`.
  - Cuando `anonymized=True`: Consulta la tabla pública `Caso` (`cedulas_anonimizadas`), extrae los hashes de nombres y domicilios, y oculta expedientes (`EXP-***-UUID`).
  - Cuando `anonymized=False`: Consulta `CedulaPrivada`, suministrando el nombre real y la narrativa original completa para usuarios autorizados.
  - Para nodos `NOTICIA`: Envía el `cuerpo_completo` íntegro y genera dinámicamente un arreglo `entidades_ner` (`UBICACION`, `FORENSE`, `KEYWORD`).
- **Frontend (`frontend/src/components/analysis/RedNoticiasPage.jsx`):**
  - **Componente `HighlightedArticleText`:** Motor regex de reemplazo que envuelve menciones de municipios/colonias en ámbar (`#fde68a`), términos forenses en rojo suave (`#fca5a5`) y colectivos en violeta (`#d8b4fe`).
  - **Conmutador de Anonimización en Toolbar:** Botón interactivo `[🔒 PII: Hasheada / 🔓 PII: Real (Confidencial)]` que consulta dinámicamente al backend según el modo elegido.
  - **Conmutador de Subrayado NER:** Botón interactivo `[✨ NER: Subrayado / NER: Texto Plano]` para alternar entre el texto periodístico anotado y el texto plano.
  - **Fosas y Domicilios en Cédulas:** Se añadieron badges de visualización para `fosa_id` vinculada y `domicilio_hasheado` en el cajón de detalle del nodo.
- **Roadmap (`TODO-LIST.md`):** Se formalizó la **Tarea 6: Sistema Global de Anonimización de Cédulas PII y Control Granular de Accesos (RBAC)** en todo el ecosistema de la plataforma.

---

## 2. Bitácora Detallada de Cambios (Cambio a Cambio por Componente)

### J. Homologación Visual de Paneles (Fondo Blanco y Botón Azul), Renombre y Hoja de Ruta
- **Justificación técnica:** `PanelHallazgosCorpus.jsx` y su disparador de acordeón en `LeftSideBar.jsx` presentaban un fondo oscuro (`#0f172a`, `#020617`) discordante con el diseño minimalista de la plataforma (fondos blancos `#ffffff`, bordes `#e2e8f0` y botones primarios en azul `#007bff` / `--primary-color`).
- **Renombre a "Cobertura Periodística":** Se actualizó la nomenclatura del acordeón en `LeftSideBar.jsx` y de la capa en `FilterForm.jsx` de *"Fosas y Hallazgos Colectivos (Corpus)"* a *"Cobertura Periodística"*, reflejando con mayor precisión el origen hemerográfico de los datos.
- **Simplificación de Controles:** Se removieron los selectores de *"Colectivo"* y *"Mín. cuerpos"* en `PanelHallazgosCorpus.jsx`, dejando una barra limpia de búsqueda por municipio o palabra clave y el conmutador de sincronización con el timeline.
- **LeftSideBar.jsx:** El acordeón adoptó la clase estándar compartida con *"Filtros"* y *"Estadísticas"* (`accordionStyles.trigger` con fondo azul y contenido en blanco).
- **PanelHallazgosCorpus.jsx:**
  - Controles de filtrado y tarjetas de notas refactorizados a fondo blanco con sombra sutil (`box-shadow: 0 1px 3px rgba(0,0,0,0.05)`).
  - Tipografía oscura de alto contraste (`#0f172a` para titulares, `#334155` para resúmenes).
  - Botón *"Vincular"* homologado a `var(--primary-color, #007bff)` con texto blanco.
  - Botón *"Centrar"* adaptado a estilo secundario neutral (`#f1f5f9` con borde `#cbd5e1`).
- **TODO-LIST.md:** Creación del archivo de hoja de ruta en la raíz del proyecto, detallando la importancia metodológica y arquitectónica de cada una de las tareas prioritarias.

---

## 2. Bitácora Detallada de Cambios (Cambio a Cambio por Componente)

### G. Corrección de Condición de Localización y Discrepancias de BD
- **Justificación técnica:** En la BD local (`192.168.1.64`), todas las 5,542 cédulas figuraban con el valor `'NO_LOCALIZADO'`, perdiendo los atributos reales (`CON VIDA`, `SIN VIDA`, `NO APLICA`) presentes en Supabase y rompiendo los filtros visuales del mapa.
- **Sincronización:** Se ejecutó migración masiva por `id_cedula_busqueda` desde Supabase hacia la BD local en `192.168.1.64`:
  - `NO APLICA`: 2,953 registros.
  - `CON VIDA`: 2,281 registros.
  - `SIN VIDA`: 308 registros.
- **Ajuste en Backend (`backend/app/routes/casos.py`):** Modificación del fallback en la línea 100 de `row["condicion_localizacion"] or "NO_LOCALIZADO"` a `row["condicion_localizacion"] or "NO APLICA"`, alineándolo con los filtros y esquemas oficiales.

### H. Corrección y Resiliencia del Panel de Estadísticas (`FilteredStats.jsx` / `FilteredFeatures.jsx`)
- **Justificación técnica:** El panel "Selección Actual" permanecía en blanco porque MapLibre GL no retornaba features vía `querySourceFeatures` si las teselas no estaban cargadas en el viewport o si el filtro descartaba registros desfasados.
- **Soporte Fallback en Memoria:** Se modificó `frontend/src/context/FilteredFeatures.jsx` y `frontend/src/utils/filteredStats.jsx` para admitir `fallbackRecords` (`fetchedRecords` de `DataContext`). Si `querySourceFeatures` retorna 0 elementos, el sistema filtra directamente sobre el GeoJSON en memoria respetando rango temporal, sexo, condición, edad y sum_score.
- **Integración UI:** `frontend/src/components/filters/FilteredStats.jsx` ahora suministra `fetchedRecords`, garantizando renderizado inmediato de gráficas de barras y pastel.

### I. Sincronización del Panel de Hallazgos y Fosas con el Timeline (`PanelHallazgosCorpus.jsx`)
- **Justificación técnica:** La lista de hallazgos del corpus en el panel lateral no respondía a los cambios de fecha del slider/reproductor del timeline.
- **Ventana Dinámica:** Se integró `selectedDate` y `daysRange` de `DataContext`. Cada hallazgo se valida para que su fecha (`timestamp`, `timestamp_start` / `timestamp_end`) intersecte el intervalo `[selectedDate, selectedDate + daysRange]`.
- **Control UI:** Se incorporó un toggle interactivo ("Sincronizar con Timeline") que indica el tamaño de la ventana en días y permite activar o desactivar la sincronización según la conveniencia del analista.

---

## 2. Bitácora Detallada de Cambios (Cambio a Cambio por Componente)

### A. Pipeline OSINT y Motor de Búsqueda de Corpus (`backend/scripts/miner_corpus_hallazgos.py`)
- **Justificación técnica:** Los motores previos (DuckDuckGo HTML y Bing) presentaban saturación de IP (*rate-limiting*) arrojando resultados vacíos o redirecciones no pertinentes.
- **Función `search_gnews_rss_corpus()`:** Sustitución del scraper anterior por un lector directo de feeds RSS de Google News con parsing XML.
- **Decodificación Protobuf:** Integración de la biblioteca `googlenewsdecoder` (`GoogleDecoder().decode_google_news_url()`) para resolver la ofuscación binaria base64 de Google y extraer la URL canónica final del medio periodístico.
- **Filtro Temporal Estricto (2020–2024):** Inyección de operadores nativos de búsqueda en las consultas (`after:YYYY-01-01 before:YYYY-12-31`), acotando las noticias recuperadas al periodo de las cédulas de búsqueda.
- **Deduplicación Inter-Medios:** Agrupación automática de notas periodísticas independientes que reportan un mismo evento geográfico/temporal mediante un identificador compartido `evento_hallazgo_id`, preservando las notas de cada diario por separado.

### B. Algoritmo de Vinculación Espacio-Temporal (`backend/scripts/linker_noticias_casos.py`)
- **Justificación técnica:** Necesidad de correlacionar matemáticamente las desapariciones individuales contra hallazgos de fosas comunes y restos óseos reportados por medios.
- **Fórmula de Afinidad Ponderada:**
  $$\text{Score} = (S_{\text{espacial}} \times 0.50) + (S_{\text{temporal}} \times 0.30) + (S_{\text{contexto}} \times 0.20)$$
- **Métricas:**
  - `haversine_km()`: Distancia geodésica entre el punto de desaparición (`repd_vp_inferencia3`) y el sitio del hallazgo (`noticias_corpus`).
  - `compute_temporal_score()`: Veto causal estricto ($\Delta t < 0$ produce Score 0.0) y decaimiento exponencial según el lapso entre desaparición y descubrimiento.
  - `compute_context_score()`: Validación de consistencia demográfica y vocabulario en la nota.
- **Persistencia en Grafo:** Inserción de aristas con metadatos completos (`metadata_relacion`) en la tabla `vinculos_entidades`.

### C. Sincronización de Coordenadas de Cédulas (`backend/scripts/sync_inferencia3.py`)
- **Justificación técnica:** La base local de PostgreSQL no contaba con las inferencias espaciales de las cédulas almacenadas en Supabase.
- **Resultado:** Migración e inserción de 5,542 registros geocodificados a la tabla local `repd_vp_inferencia3`, habilitando el cruce geoespacial de toda la base histórica.

### D. Endpoints REST y Grafo Semántico (`backend/app/routes/ontology.py`)
- **Endpoints de Visualización:**
  - `GET /ontology/subgraph`: Carga perezosa (*lazy-load*) centrada en nodos con grados de separación parametrizables.
  - `GET /ontology/supernodes`: Agrupamiento y clustering de casos por municipio.
  - `GET /ontology/graph`: Grafo semántico consolidado para Sigma.js con enriquecimiento de metadatos de casos, fosas y noticias.
  - `GET /ontology/context-graph`: Hiper-grafo forense de patrones criminales (modus operandi, vehículos, parentescos).

### E. Frontend y Paneles de Análisis
- **Componentes Creados:**
  - `RedContextoPage.jsx`: Vista integral del grafo de contexto criminal y relaciones forenses.
  - `RedNoticiasPage.jsx`: Visualizador de grafo de notas de prensa conectadas a cédulas.
  - `PanelHallazgosCorpus.jsx` y `DrawerHallazgosCorpus.jsx`: Cajones interactivos y paneles para consultar noticias geocodificadas desde el mapa.

### F. Blindaje de Seguridad y Parametrización de Secretos (Auditoría AGENTS.md)
- **Justificación técnica:** Cumplimiento estricto de la regla global de seguridad de Antigravity (prohibición de secretos o contraseñas en texto plano).
- **Refactorización:** Extracción de contraseñas de PostgreSQL, credenciales de Supabase y API Key de LocationIQ desde 9 scripts hacia variables de entorno (`.env` local ignorado por Git) y actualización de `.env.example` con placeholders.
- **Archivos saneados:** `miner_corpus_hallazgos.py`, `linker_noticias_casos.py`, `sync_inferencia3.py`, `extract_case_forensic_patterns.py`, `miner_osint_v2.py`, `audit_pilot_with_local_llm.py`, `run_all_night_miner.py`, `run_news_miner_batch.py`, `generate_news_around_fosas.py`, `jitter_db_noticias.py`.

---

## 3. Inventario de Archivos Afectados (Diff vs `origin/auth-local-networking`)

### Nuevos (`[NEW]`):
- `backend/scripts/miner_corpus_hallazgos.py`
- `backend/scripts/linker_noticias_casos.py`
- `backend/scripts/sync_inferencia3.py`
- `backend/scripts/audit_pilot_with_local_llm.py`
- `backend/scripts/benchmark_ontology_300.py`
- `backend/scripts/extract_case_forensic_patterns.py`
- `backend/scripts/init_cartografia_db.sql`
- `backend/scripts/init_db.py`
- `backend/scripts/keywords_pool.json`
- `backend/scripts/miner_osint_v2.py`
- `backend/scripts/pipeline_completo_forense_osint.py`
- `backend/scripts/populate_database_pipeline.py`
- `backend/scripts/run_all_night_miner.py`
- `backend/scripts/run_cluster_analysis.py`
- `backend/scripts/run_daemon_continuous_miner.sh`
- `backend/scripts/run_news_miner_batch.py`
- `backend/scripts/verify_gpu.py`
- `backend/app/centroides_jalisco.json`
- `backend/app/miners/*` (`batch_miner.py`, `miner_fosas.py`, `miner_noticias.py`, `query_generator.py`, `worker.py`)
- `backend/app/ner/*` (`anonymizer.py`, `cli.py`, `dataset_builder.py`, `extractor.py`, `train_ner.py`)
- `backend/app/ontology/*` (`cluster_correlator.py`, `hypothesis.py`, `matcher.py`, `models.py`, `semantic_enricher.py`)
- `backend/app/routes/anonymize.py`, `ontology.py`, `osint.py`
- `frontend/src/components/analysis/*` (`PanelHallazgosCorpus.jsx`, `RedContextoPage.jsx`, `RedNoticiasPage.jsx`)
- `frontend/src/components/map/DrawerHallazgosCorpus.jsx`
- `TODO-LIST.md` (Hoja de ruta priorizada y justificación metodológica)
- `reports/*` (Reportes de metodología, despliegue y entrenamiento)
- `tests/*` (Pruebas unitarias de anonimizador, API, matcher y enriquecedor)
- `backend/scripts/link_contexto_fosas_domicilios.py` (Vinculador contextual de fosas estatales y domicilios/fincas PII compartidas)

### Modificados (`[MODIFY]`):
- `backend/app/models.py` (incorporación de `NoticiaCorpus`, `VinculoEntidad`, `CasoPatronForense`, `PiiHashRegistry`, `CedulaPrivada`)
- `backend/app/schemas.py`
- `backend/app/database.py`
- `backend/app/main.py`
- `backend/app/routes/casos.py`, `noticias.py`, `ontology.py`
- `frontend/src/App.jsx`, `config.js`
- `frontend/src/components/analysis/RedContextoPage.jsx`, `RedNoticiasPage.jsx`, `ContextoListPage.jsx`
- `frontend/src/utils/semanticGraphUtils.jsx`
- `frontend/src/context/AuthContext.jsx`, `DataContext.jsx`, `FilteredFeatures.jsx`
- `frontend/src/components/layout/LeftSideBar.jsx`
- `frontend/src/components/filters/FilterForm.jsx`
- `frontend/src/components/analysis/PanelHallazgosCorpus.jsx`
- `frontend/src/components/filters/FilteredStats.jsx`
- `frontend/src/utils/filteredStats.jsx`
- `docker-compose.yml`, `.env.example`, `.gitignore`

---

## 4. Pruebas y Validaciones Ejecutadas

- **Conmutadores de Privacidad PII y Subrayado Semántico NER en Hiper-Grafo de Contexto:**
  - Endpoint `/api/v1/ontology/context-graph?anonymized=true`: Comprobado con `curl` y `jq` (`limit_edges=20`); serializa cédulas bajo hashes criptográficos (`Caso [NOMBRE_HASH_ba0502fa]`, `anon: true`, expedientes `EXP-***-xxxxxx`).
  - Endpoint `/api/v1/ontology/context-graph?anonymized=false`: Comprobado con `curl` y `jq`; serializa cédulas exponiendo nombres reales auditados de `CedulaPrivada` (`Caso: FELIPE DE JESUS ALCALA JARAMILLO`, `anon: false`, expedientes completos).
  - Resolución canónica de domicilios en `pii_hash_registry`: Comprobado con nodo `DOMICILIO_HASH_5f4a8579`; en modo anónimo entrega `🏠 DOMICILIO_HASH_5f4a857` (`is_anonymized: true`), mientras que en modo desanonimizado resuelve la dirección canónica `🏠 PRIVADA LÁZARO CÁRDENAS #326` (`is_anonymized: false`).
  - Compilación frontend de producción: `npm run build` ejecutado limpiamente en Vite en 5.34s (0 errores, 0 advertencias críticas).
  - Renderizado de subrayado semántico: Componente `HighlightedContextText` probado con marcado dinámico para hashes PII, instituciones, modus operandi y vehículos.
- **Separación Epistemológica de Grafos:**
  - Endpoint `/api/v1/ontology/graph`: Verificado con `curl` y `jq` (`limit_edges=100`) confirmando retorno estricto de nodos `NOTICIA` (20) y `PERSONA` (68), sin contaminación cruzada con fosas ni domicilios.
  - Endpoint `/api/v1/ontology/context-graph`: Verificado con 134 nodos y 248 vínculos balanceados estratificadamente (`PERSONA`, `FOSA`, `HASH_DOMICILIO`, `MODUS`, `INSTITUCION`, `DESTINO`, `VEHICULO_SOSPECHOSO`).
- **Timeline Temporal y Animación en Grafo de Noticias:**
  - Slider dinámico interactivo (0 a 100) y ventana móvil configurable (30d a 730d).
  - Reproductor con bucle a 350ms y auto-pausa al 100%.
  - Preservación de vecindad de 1-hop en el grafo bipartito (Caso ↔ Noticia).
  - Compilación exitosa en producción: `npm run build` ejecutado limpiamente en Vite (0 errores, bundle generado para producción).
- **Correlación de Contexto Forense (`link_contexto_fosas_domicilios.py`):**
  - Domicilios hasheados: 265 fincas de desaparición compartidas vinculando 603 aristas `DESAPARECIO_EN_DOMICILIO`.
  - Fosas oficiales: 71 fosas correlacionadas espacio-temporalmente generando 4,411 aristas `POSIBLE_HALLAZGO_EN_FOSA`.
- **Extracción OSINT de Corpus:**
  - Total de notas aprobadas por Gatekeeper LLM y geocodificadas en `noticias_corpus`: **307 noticias**.
  - Rango temporal validado: **2020 – 2024** (con 219+ notas estrictamente dentro del periodo histórico).
  - Georreferenciación: 100% de registros con lat/lng.
- **Auditoría de Seguridad y Cero Secretos:**
  - Eliminación total de contraseñas de BD y API keys en texto plano en todos los scripts de `backend/scripts/`.
  - Verificación de conexión limpia a PostgreSQL local y lectura exitosa de variables desde `.env`.

---

## 5. Tareas Pendientes en la Rama

- [x] **Cruce contra Catálogo Oficial `fosas`:** Completado mediante `link_contexto_fosas_domicilios.py` (4,411 aristas con $\le 10$ km y $\le 2$ años).
- [ ] **Endpoint `POST /api/v1/ontology/edges`:** Implementar en `backend/app/routes/ontology.py` las rutas REST para creación y validación manual de aristas por parte de investigadores.
- [ ] **Fusión/PR hacia rama principal:** Preparar pull request una vez completadas las pruebas forenses.
