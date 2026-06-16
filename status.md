# Estado: Fase 2 (Gestión de Sesión y Persistencia Local de Cuadernos)

## Cambios Realizados
- **[MODIFY] `frontend/src/context/DataContext.jsx`**:
  - Implementación de `resetContext()` para restablecer filtros y capas al cargar la raíz `/dist`.
  - Integración de `useLocation` para detectar cambio de rutas y actualizar el estado de sesión (`sesión vacía` vs `sesión de cuaderno`).
  - Filtrado de registros locales (IndexedDB) por `notebook_id` según la ruta activa para aislamiento completo de datos.
  - Resolución de fuga de memoria / bucle infinito en `updateLayerData` usando `mapRef` para abortar reintentos encolados cuando cambia el mapa.
- **[MODIFY] `frontend/src/utils/logger.js`**:
  - Inclusión de prefijos dinámicos en la consola según el estado de sesión actual.
- **[MODIFY] `frontend/src/utils/notebook.js`**:
  - Guardado unificado de notas y filtros (fechas, mapas y selecciones) en `localStorage` con control de estado `isLoaded` para evitar sobrescritura por carrera.
- **[MODIFY] `frontend/src/components/layout/HeaderCompact.jsx`**:
  - Eliminación de la duplicación de eventos de guardado (`onBlur`) que causaban errores `AbortError` en MapLibre.

## Resultado
Se logró un flujo offline-first completo: la raíz de la aplicación siempre inicia limpia y la navegación a cuadernos específicos restaura automáticamente su contexto completo de fechas y filtros desde el almacenamiento local, con trazabilidad clara en la consola de depuración y sin bucles infinitos en el renderizado del mapa.

# Estado: Fase 5 (Optimización de Sincronización y Consulta de Casos)

## Cambios Realizados
- **[MODIFY] `backend/app/routes/casos.py`**:
  - Se optimizó el endpoint `get_casos` reemplazando las consultas ORM de SQLAlchemy (con `joinedload` recursivos y bucles de mapeo en Python) por una consulta SQL pura mediante `text()`.
  - Se dividió la carga de relaciones complejas consultando la tabla principal y de inferencia en un solo query plano y recuperando las señas particulares (tatuajes) agrupadas mediante `IN` en un segundo query optimizado, eliminando el producto cartesiano.
- **[MODIFY] `backend/app/models.py`**:
  - Se declaró el atributo `index=True` sobre el campo `fecha_desaparicion` en el modelo SQLAlchemy `Caso` para sincronizar el esquema del ORM con la optimización de base de datos.
- **[DATABASE] Índice de Base de Datos**:
  - Se creó un índice físico `idx_fecha_desaparicion` sobre `cedulas_anonimizadas(fecha_desaparicion)` en la base de datos PostgreSQL de Supabase.
- **[MODIFY] Frontend Component Lifecycle (`utils/notebook.js`, `DataContext.jsx`, `Fetch*.jsx`)**:
  - Corrección de descargas duplicadas / automáticas al cargar `/dist` previniendo la inicialización errática de variables.
  - Sincronización automática e inmediata de conteos de marcadores en UI y actualización del gráfico `GlobalTimeGraph` al completarse las descargas.

## Resultado
Se redujo el tiempo de respuesta del endpoint de casos de un rango promedio de **62 segundos a solo 15 segundos** (una mejora de más del 300% / 4x en velocidad) para peticiones masivas (1999-2024, ~4,500 registros y 6.7MB de payload). La base de datos ahora procesa las búsquedas en milisegundos usando índices, y el frontend tiene un ciclo de vida limpio y predecible.


# Estado: Fase 6 (Resolución de Conflictos de Contexto WebGL MapLibre y Sigma)

## Cambios Realizados
- **[MODIFY] `frontend/src/utils/semanticGraphUtils.jsx`**:
  - Se modificó el hook `useMemo` de generación del grafo para que solo se ejecute cuando `showSigma` es `true`.
  - Se previno el bloqueo del hilo principal (main thread) que ocurría al ejecutar iteraciones síncronas de ForceAtlas2 en segundo plano durante cambios de filtros en el mapa.
  - Se añadió lógica para renderizar limpiamente cuando el grafo es nulo.
- **[MODIFY] `frontend/src/components/shared/MiniNetworkModal.jsx`**:
  - Se implementó un retorno anticipado (`early return`) en el `useMemo` del grafo para evitar su procesamiento computacional pesado cuando el modal está cerrado (`!isOpen`).
  - Se añadió `isOpen` al arreglo de dependencias para controlar estrictamente el ciclo de vida de Sigma.

## Resultado
Se eliminó la pérdida de contexto WebGL en MapLibre y los congelamientos de interfaz que ocurrían al interactuar con el mapa. Los cálculos pesados de renderizado de red (ForceAtlas2) ahora solo se ejecutan cuando el usuario abre explícitamente las visualizaciones de grafos semánticos, garantizando que los marcadores del mapa y las interacciones de filtrado permanezcan 100% fluidas y responsivas.
