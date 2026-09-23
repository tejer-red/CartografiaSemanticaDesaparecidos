# Estado de la Rama: `feature/ner-ontologia-mineria`

- **Última actualización:** 2026-09-23 17:11 CST
- **Rama base:** `origin/auth-local-networking` (`869c275`)
- **Último commit:** `32a4b09` (`fix(frontend): remove 1000 records limit, restore news map layer and fix text and context properties`)
- **Estado de sincronización:** Cambios locales listos para commit
- **Estado general:** Apertura pública del mapa (acceso libre sin contraseña), homologación integral del tema claro en grafos y controles, y corrección multi-grafo en Graphology (`UsageGraphError`) verificados con Vite build exitoso

---

## 1. Registro Cronológico de Commits

| Hash | Fecha | Autor | Mensaje |
| :--- | :---: | :---: | :--- |
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

### Modificados (`[MODIFY]`):
- `backend/app/models.py` (incorporación de `NoticiaCorpus`, `VinculoEntidad`, `CasoPatronForense`, `PiiHashRegistry`, `CedulaPrivada`)
- `backend/app/schemas.py`
- `backend/app/database.py`
- `backend/app/main.py`
- `backend/app/routes/casos.py`, `noticias.py`
- `frontend/src/App.jsx`, `config.js`
- `frontend/src/components/analysis/RedContextoPage.jsx`, `RedNoticiasPage.jsx`
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

- **Extracción OSINT de Corpus:**
  - Total de notas aprobadas por Gatekeeper LLM y geocodificadas en `noticias_corpus`: **307 noticias**.
  - Rango temporal validado: **2020 – 2024** (con 219+ notas estrictamente dentro del periodo histórico).
  - Georreferenciación: 100% de registros con lat/lng (131 a nivel colonia/cruce exacto, 144 a nivel municipal).
- **Vinculación Espacio-Temporal:**
  - Total de cédulas evaluadas con coordenadas: **5,542 casos**.
  - Total de aristas de afinidad generadas y persistidas en `vinculos_entidades`: **1,290 vínculos** (`relation_type = 'POSIBLE_HALLAZGO_RELACIONADO'`).
  - Coincidencias de certeza máxima detectadas: 5 casos con Score $1.0$ ($\le 1.13\text{ km}$ y $\le 80$ días de diferencia).
- **Control de Versiones y Autenticación:**
  - Configuración de autenticación mediante `gh auth login` y sincronización exitosa de la rama contra GitHub.
- **Auditoría de Seguridad y Cero Secretos:**
  - Eliminación total de contraseñas de BD y API keys en texto plano en 9 scripts de `backend/scripts/`.
  - Verificación de conexión limpia a PostgreSQL local y lectura exitosa de variables desde `.env`.

---

## 5. Tareas Pendientes en la Rama

- [ ] **Cruce contra Catálogo Oficial `fosas`:** Extender `linker_noticias_casos.py` con parámetro `--source fosas` para evaluar correlaciones contra los 71 registros oficiales de fosas de Jalisco además de las notas de prensa.
- [ ] **Endpoint `POST /api/v1/ontology/edges`:** Implementar en `backend/app/routes/ontology.py` las rutas REST para creación y validación manual de aristas por parte de investigadores.
- [ ] **Fusión/PR hacia rama principal:** Preparar pull request una vez completadas las pruebas forenses.
