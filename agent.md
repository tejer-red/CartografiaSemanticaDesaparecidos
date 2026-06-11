# Agent Guidelines — Cartografía Semántica Desaparecidos

## Principios de Desarrollo Frontend

Este proyecto sigue los principios **CUPID** y **KISS** para la organización del código frontend.

### CUPID

| Principio | Significado | Aplicación |
|-----------|-------------|------------|
| **C** — Composable | Se puede combinar con otros | Cada componente tiene una interfaz predecible con props mínimas. Usa hooks del contexto internamente en lugar de prop drilling. |
| **U** — Unix philosophy | Hace una sola cosa bien | Separar responsabilidades: un componente de fetching (`data/`) no renderiza UI visible. Un componente de UI (`filters/`) no hace fetching. |
| **P** — Predictable | Hace lo que esperas | Nombres de carpeta = dominio funcional. Nombres de archivo = responsabilidad del componente. |
| **I** — Idiomatic | Se siente natural al stack | React hooks, context API, barrel exports (`index.js`). Sin patrones exóticos. |
| **D** — Domain-based | Organizado por dominio | Carpetas por área funcional, no por tipo de archivo. |

### KISS

- **No código muerto**: Archivos deprecated van a `_deprecated/`. No dejar archivos `.useless` ni componentes sin imports.
- **Sin duplicaciones**: Una sola variante de cada componente (e.g., un solo `DateFormCompact`, no tres variantes de `DateForm`).
- **Prop drilling mínimo**: Si un componente necesita datos del contexto, usa `useData()` directamente en lugar de pasarlos como props a través de 3+ niveles.

---

## Estructura de Componentes

```
src/components/
├── _deprecated/     # Código muerto (no importar desde aquí)
├── analysis/        # Análisis y referencias cruzadas (CrossRef, SemanticGraph)
├── auth/            # Autenticación (PasswordCheck)
├── data/            # Fetching de datos — NO renderizan UI visible (FetchCedulas, FetchFosas, etc.)
├── filters/         # Filtros y controles (FilterForm, LayoutForm, FilteredStats)
├── forms/           # Formularios de entrada (DateFormCompact)
├── layout/          # Estructura de la app (AppLayout, HeaderCompact, LeftSideBar, BottomTimelinePanel)
├── map/             # Mapa (MapComponent)
├── notebook/        # Sistema de cuadernos/bitácora (Notebook, SideNotebook, NotebookLoad)
├── shared/          # Componentes compartidos entre dominios (TabsComponent)
└── timeline/        # Línea de tiempo y gráficas temporales (TimelineSlider, GlobalTimeGraph)
```

### Convenciones

1. **Cada subdirectorio tiene un `index.js`** con barrel exports.
2. **Nuevos componentes** deben ir en el subdirectorio que corresponda a su dominio.
3. **Si un componente se queda sin usar**, moverlo a `_deprecated/` — nunca dejarlo suelto.
4. **Imports entre dominios** usan rutas relativas al subdirectorio hermano (e.g., `../filters/FilterForm`).
5. **Imports desde `App.jsx`** usan barrel exports: `import { FetchCedulas } from './components/data'`.

---

## Contexto (State Management)

- **`DataContext.jsx`**: Contexto monolítico con el estado global de la aplicación (mapa, filtros, timeline, etc.).
- **`layerManager.js`**: Funciones puras para manejo de capas del mapa (caching, jitter, visibilidad).
- **`FilteredFeatures.jsx`**: Función utilitaria para consultar features filtrados del mapa.

> **Nota**: El `DataContext` es candidato a ser dividido en contextos más pequeños (`MapContext`, `FilterContext`, `TimelineContext`) en una fase futura.

---

## Utils

Los archivos en `src/utils/` contienen lógica extraída de componentes:

- `logger.js` — Sistema centralizado de logging con habilitación per-componente
- `filterForm.js` — Handlers y efectos para FilterForm
- `layoutForm.js` — Handlers y efectos para LayoutForm
- `notebook.js` — Hook `useNotebook` con lógica de CRUD de cuadernos
- `globalTimeGraph.js/.jsx` — Procesamiento de datos y handlers para gráficas temporales
- `filteredStats.jsx` — Cálculo de estadísticas filtradas
- `semanticGraphUtils.jsx` — Hook para grafo semántico
- `timeLineSlider.js` — Hook `useTimelineSlider`
- `useZIndex.js` — Hook para manejo de z-index entre paneles

---

## Reglas para Agentes AI

1. **Antes de crear un nuevo componente**, verificar que no exista ya uno similar en otra carpeta.
2. **Nunca importar desde `_deprecated/`**.
3. **Al mover o renombrar un componente**, actualizar:
   - El `index.js` barrel del subdirectorio correspondiente.
   - Todos los archivos que lo importen.
   - La config de `logger.js` si el componente tiene logging.
4. **Mantener los principios CUPID**: un componente = una responsabilidad clara.
5. **Tests**: Verificar con `npx vite build` que no haya imports rotos después de cambios estructurales.
