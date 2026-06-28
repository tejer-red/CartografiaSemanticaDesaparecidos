# Reporte Exhaustivo de Migración: Restauración de Interfaz Pública (rama `merge-notebook-api`)

**Fecha del Reporte:** 27 de junio de 2026
**Rama Activa:** `merge-notebook-api`

---

## 1. Contexto de la Migración

El objetivo central de esta iteración de trabajo fue estabilizar e integrar con éxito la funcionalidad de la vista pública (el "Cuaderno Compartido" o "Visible") heredada de la rama `2.0` hacia la nueva estructura modular de componentes y el ecosistema de gestión de datos (`DataContext`).

Durante el proceso, el nuevo frontend sufría fragmentación de lógica. Al intentar renderizar la vista compartida (`/visible/:id`), sucedían varios problemas críticos que bloqueaban la paridad con producción:
1.  **Problemas de Layout:** La pantalla no mantenía la proporción áurea 35% notas / 65% mapa, rompiendo la experiencia visual y colapsando el mapa.
2.  **Lógica Visual de Componentes:** El gráfico interactivo `GlobalTimeGraph` había perdido sus estilos y se mostraba como simples radio-botones genéricos; además, su renderizado principal colapsaba (sin altura aparente en el DOM).
3.  **Filtrado e Interactividad Rotos:** En la versión original de 2.0, interactuar con el *timeline* o restaurar una nota guardada filtraba automáticamente el mapa en pantalla y realizaba un acercamiento ("flyTo") a la zona afectada. En la arquitectura modular actual, esta reactividad desapareció en `/visible/` porque los *listeners* de los filtros estaban acoplados estrictamente a la vista de edición.
4.  **Bugs de Tipado Híbrido:** El selector universal de libretas ("Cuadernos Disponibles") renderizaba `[object Object]` debido a incompatibilidades al mezclar persistencia local (IndexedDB) con almacenamiento en la nube (Vite Backend).

---

## 2. Resumen de Cambios Estructurales

Con la intervención, garantizamos que el sistema cuenta con **código modular, reutilizable e inteligente**. En lugar de copiar repetidamente funciones dentro de `/visible/:id`, optamos por invocar a los *Wrappers* y herramientas de contexto, permitiendo que:
- El modal universal (`NotebookListModal`) detecte dinámicamente desde qué vista se solicita (Edición vs Público) para redirigir al link correcto de manera condicional.
- La pantalla pública recupere 100% de la funcionalidad de "Filtrado en vivo + Acercamiento Automático", implementando un contenedor de efectos ocultos (`FilterFormWrapper`) que sincroniza el `GlobalTimeGraph` y el botón de notas con los filtros vectoriales de Mapbox del backend.
- La interfaz visual cumpla con los lineamientos premium y estéticos exactos solicitados, simulando la experiencia pulida de botones *Pill-shape* interactivos de la línea de desarrollo 2.0.

---

## 3. Lista Exhaustiva de Modificaciones (Archivos y Rutas)

A continuación se enlistan los archivos alterados, acompañados por sus rutas relativas en el directorio de trabajo y la justificación técnica detrás de cada intervención.

### Estilización y Disposición (CSS)

*   **Ruta:** `frontend/src/styles/VisibleNotebook.css`
    *   **Acción:** Se impuso el layout de pantalla dividida con `display: flex`. Se forzó `flex: 0 0 35%` para la columna de contenido (`.visible-content-column`) y `flex: 0 0 65%` para el contenedor de la capa base (`.visible-map-column`).
*   **Ruta:** `frontend/src/index.css`
    *   **Acción:** En adición a ajustar anchos, se identificó un problema de solapamiento Z-Index. Dado que la columna que contiene el mapa posee `pointer-events: none` (para dejar traspasar clics a la vista de Mapbox en el fondo), el contenedor inferior del gráfico de fechas heredó esa falta de interacción. Se añadió explícitamente `pointer-events: all;` sobre `.visible-timeline-container` para devolver la interactividad al usuario.

### Componentes de Navegación y Gráficas (React)

*   **Ruta:** `frontend/src/components/notebook/VisibleNotebook.jsx`
    *   **Acción 1:** Eliminación de los *dummies* muertos (`GlobalTimeGraphData`) y reactivación del módulo productivo `<GlobalTimeGraph />`.
    *   **Acción 2 (CRÍTICA):** Se importó y renderizó `<FilterFormWrapper />`. Este componente, aunque invisible en pantalla, encapsula los `useEffect` necesarios que escuchan a la variable global `selectedDate` e invocan internamente `filterMarkersByDate()`. Sin esta línea, los botones de "Restaurar Vista" o los clics de la línea de tiempo lograban actualizar variables, pero fallaban catastróficamente al intentar accionar el comportamiento del mapa (Filtros + Zoom).

*   **Ruta:** `frontend/src/components/timeline/GlobalTimeGraph.jsx`
    *   **Acción 1:** Reingeniería visual completa de la cabecera. Se mapearon los valores `[Diario, Semanal, Mensual...]` en un array interno para generar componentes tipo `<label>` estilizados (Bordes redondeados, relleno dinámico, transición de hover) idénticos al prototipo 2.0.
    *   **Acción 2:** Prevención de colapso de renderizado (Recharts). Se envolvió el nodo `<ResponsiveContainer>` dentro de un `<div style={{ flex: 1, minHeight: '100px' }}>`. Esto corrigió el error donde el DOM calculaba erróneamente un alto nulo.

### Módulos Utilitarios y Formularios de Listado (Modals)

*   **Ruta:** `frontend/src/components/notebook/NotebookListModal.jsx`
    *   **Acción 1:** Soporte Dual Híbrido. La renderización del array mapeaba erróneamente objetos. Se agregó una evaluación condicional de tipo: `const notebookName = typeof notebook === 'string' ? notebook : notebook.name;`
    *   **Acción 2:** Etiquetado Local. Si el tipo de dato es un objeto detectado de IndexedDB, ahora la UI despliega un distintivo dinámico: `<span className="badge">Local</span>` para que el usuario conozca la fuente del cuaderno temporal.
    *   **Acción 3:** Enrutamiento Dinámico. Se restauró el soporte para la *prop* opcional `onSelectNotebook`. Si está definida, el modal permite delegar la navegación a su padre (redirigiendo a `/visible/` en lugar del `/cuaderno/` hardcodeado por defecto).

*   **Ruta:** `frontend/src/utils/notebook.js`
    *   **Acción:** Se corrigió un error de lógica de deduplicación que existía en el hook `listNotebooks()`. El sistema intentaba filtrar choques entre libretas locales y alojadas en red pidiendo la propiedad `m.name` sobre *strings* que llegaban vía Fetch HTTP, produciendo falsos positivos. Se adaptó la búsqueda a evaluar con `(typeof m === 'string' ? m : m.name) === l.name`, saneando por completo la lista proyectada al usuario final.

---

## 4. Tareas Pendientes (TODO List) comparado con el Plan Original (2.0)

Al contrastar la rama original `2.0` y el plan de migración con el estado actual, quedan los siguientes elementos por finalizar o verificar rigurosamente:

*   [ ] **Integración de `MobileActionBar` en `VisibleNotebook.jsx`:** 
    *   *Ruta Actual:* `frontend/src/components/layout/AppLayout.jsx` ya lo implementa (`{isMobile && <MobileActionBar />}`).
    *   *Faltante:* `VisibleNotebook.jsx` calcula `const isMobile = useIsMobile()` pero aún no muestra una barra de navegación móvil específica o los modales móviles (como `MobileTimelineModal` o `FullscreenModal`) para cuando un usuario abra el cuaderno público desde un celular.
*   [ ] **Verificación Rigurosa de Lógica de Parseo de Tiempo:**
    *   *Faltante:* Revisar a fondo las funciones en `utils/globalTimeGraph.js` y `utils/notebook.js` para asegurar que las fechas se interpretan sin desfase de zonas horarias locales al aplicar el filtro de "Acercarse".
*   [ ] **Adaptación a `useLocalData` hook:**
    *   *Faltante:* El plan original dictaba "adaptar la obtención de datos para usar el nuevo hook `useLocalData` basado en Dexie". Actualmente, `utils/notebook.js` accede directamente a la instancia `db`. Conviene refactorizarlo para que dependa exclusivamente del hook estandarizado para manejar el estado y la sincronización de manera más coherente.
*   [ ] **Migración/Verificación de Componentes Huérfanos de 2.0:**
    *   *Faltante:* En la rama `2.0` existían componentes como `FilteredStats.jsx`, `SideNotebook.jsx` o modales auxiliares (`DateFormModal.jsx`) que deben ser auditados para confirmar si fueron descartados intencionalmente por el rediseño modular, o si aún restan por acoplarse a la nueva arquitectura.
