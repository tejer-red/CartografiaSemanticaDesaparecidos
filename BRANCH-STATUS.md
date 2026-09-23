# Estado de la Rama: `feature/ner-ontologia-mineria`

- **Última actualización:** 2026-09-23 12:51 CST
- **Rama base:** `origin/auth-local-networking` (`869c275`)
- **Último commit:** `d556a7e` (`fix(frontend): restore localization conditions, resilient stats fallback, and timeline sync for findings panel`)
- **Estado de sincronización:** 1 commit adelante de remoto (`origin/feature/ner-ontologia-mineria`)
- **Estado general:** En desarrollo activo (Corrección de Filtros, Condición de Localización y Estadísticas)

---

## 1. Registro Cronológico de Commits

| Hash | Fecha | Autor | Mensaje |
| :--- | :---: | :---: | :--- |
| `d556a7e` | 2026-09-23 | abundis | `fix(frontend): restore localization conditions, resilient stats fallback, and timeline sync for findings panel` |
| `c5cf358` | 2026-09-23 | abundis | `feat: add ontology matching, OSINT miners, NER pipelines, and frontend analysis views` |
| `730c15b` | 2026-09-21 | abundis | `chore: add INSTRUCCIONES_GPU.md to gitignore` |
| `b723624` | 2026-09-21 | abundis | `feat(ner): setup dataset builder, query generator and GPU training plan` |

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
- `reports/*` (Reportes de metodología, despliegue y entrenamiento)
- `tests/*` (Pruebas unitarias de anonimizador, API, matcher y enriquecedor)

### Modificados (`[MODIFY]`):
- `backend/app/models.py` (incorporación de `NoticiaCorpus`, `VinculoEntidad`, `CasoPatronForense`, `PiiHashRegistry`, `CedulaPrivada`)
- `backend/app/schemas.py`
- `backend/app/database.py`
- `backend/app/main.py`
- `backend/app/routes/casos.py`, `noticias.py`
- `frontend/src/App.jsx`, `config.js`
- `frontend/src/context/AuthContext.jsx`, `DataContext.jsx`, `FilteredFeatures.jsx`
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
