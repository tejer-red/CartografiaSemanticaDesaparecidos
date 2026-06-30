# Reporte de Estado: Marcadores y Relaciones en Bitácora

**Fecha de Generación:** 30 de Junio de 2026
**Objetivo del Feature:** Permitir el registro de vínculos (relaciones entre entidades) en la Bitácora de Navegación, dotando a la interfaz de una capacidad bidireccional donde la visualización del mapa responde dinámicamente al estado de los apuntes (líneas de conexión).

---

## ✅ Aciertos y Funcionalidades Completadas

1. **Arquitectura de Eventos Desacoplada:**
   - La interacción entre los modales de búsqueda (`LinkModal`, `ImportContextModal`), el Gestor de Cuadernos (`useNotebook`) y el Renderizador del Mapa (`MapComponent`) se comunican sin saturar el Contexto Principal de React, usando `window.dispatchEvent`. Esto mantiene la modularidad del SDK.

2. **UI Reactiva "Destacar Relación":**
   - Integración nativa del botón en `Notebook.jsx` y `VisibleNotebook.jsx`. Las notas cambian su estructura de CSS para resaltar de forma visual e intuitiva la entidad que se está enfocando.

3. **Geometría Dinámica en WebGL:**
   - Al escuchar el evento de Highlight, `MapComponent` inyecta instantáneamente un GeoJSON `LineString` dibujando una conexión visual entre `sourceCoords` y `targetCoords`, apoyándose de un `easeTo` o `fitBounds` suave para enfocar el vínculo relacional. 

4. **Integridad de Datos en Persistencia Local:**
   - Conservación del objeto `original` en los procesos de búsqueda, permitiendo la extracción automática de coordenadas geográficas (`lat`, `lng`) sin disparar requests extra al servidor o al `useLocalData`.
   - Se resolvió un error asíncrono fatal de persistencia con IndexedDB (Dexie) al inicializar nuevas instancias en la ruta `/cuaderno/nuevo`.

5. **Hotfixes del Workflow de Usuario:**
   - Solucionado el problema de reactividad (`useCallback`) que impedía escribir notas manuales ignorando el título.
   - Solucionado el bug por limpieza prematura de estado en el buscador que causaba "undefined -> undefined" al intentar imprimir nombres y metadatos.

---

## ⚠️ Fallas y Riesgos Identificados

1. **Entidades sin Geolocalización:**
   - **Riesgo:** Si una entidad importada o vinculada carece de propiedades de latitud/longitud en la estructura de datos local (ej. una entidad que no pudo ser geocodificada), el `MapComponent` falla silenciosamente (no dibuja nada pero el botón UI reacciona).
   - **Falla detectada:** No hay _feedback_ visual si la línea no pudo ser dibujada por falta de coordenadas.

2. **Divergencia de Objetos de Mapa:**
   - El ecosistema tiene la data fragmentada: algunas coordenadas viven en `.lat` / `.lng`, y otras están anidadas en `.geometry.coordinates` o `.properties.lat`. Se usó _defensive programming_ para leer cualquiera, pero no es la forma ideal de modelar un GeoJSON estricto dentro de la UI.

3. **La Asincronía de la Creación (Nuevo Cuaderno):**
   - El sistema sufre de 'Race Conditions' al inicializar un nuevo cuaderno (`/cuaderno/nuevo`) a la par que inyecta los `navigation_logs`. Hubo que puentear explícitamente el `notebook_id` hacia el evento porque el custom hook podía conservar un `id` vacío temporalmente.

---

## 🚀 Pendientes y Próximos Pasos (Hoja de Ruta)

Para que el proyecto en la parte de relaciones funcione fluidamente al 100%, se recomienda lo siguiente:

### 1. Robustecer la Interfaz de Cuadernos (Frontend)
- [ ] **Manejo Explicito de Nulos (Falta de Mapa):** Mostrar un icono / mensaje en el apunte del Cuaderno cuando se trate de un vínculo puramente semántico (ej. Cédula - Noticia) que carece de posición geográfica en origen o destino. El botón no debería decir "Destacar Relación en Mapa" si no es posible dibujarlo.
- [ ] **Hover Interactions:** Implementar que el _hover_ del mouse sobre el texto de las entidades dentro de la nota, levante un _Tooltip_ o resalte el pin en el mapa temporalmente.

### 2. Sincronización Remota (Backend)
- [ ] **Auditoría de Esquemas Backend:** Validar que al ejecutar `saveNotesToBackend()`, el servidor Python pueda digerir el nuevo anidamiento de `.relation` en el array de `navigation_logs`. Si el backend espera un objeto estricto sin metadata de relaciones, va a detonar un HTTP 422 (Validation Error).

### 3. Migración y Limpieza Técnica (Tech Debt)
- [ ] **Limpieza de "Logger":** Retirar o segmentar el exceso de `logger.log` integrados durante la sesión de debugging, activando el modo `debug` solo bajo demanda.
- [ ] **Depuración del Contexto:** Asegurar que `globalLinkModal` y los modales locales actúen como un único patrón estandarizado (eliminar lógicas redundantes de UI para el modal de Vínculos).

### 4. Pruebas Funcionales Requeridas
- [ ] Validar que al cambiar entre "Modo Público" (VisibleNotebook) y "Modo Analista" (Notebook) las notas relacionales rendericen el botón correctamente y no rompan la vista aislada.
- [ ] Verificar que la interpolación de color del mapa (`layerManager`) no choca con el color brillante (`#6366f1`) utilizado para dibujar la línea temporal `LineString` de las relaciones.
### 5. Asuntos Críticos Reportados (Prioridad Alta)
- [ ] **Bug en Creación de Notas:** Se reporta que al crear notas, el sistema sigue solicitando el título obligatoriamente "aunque tenga caracteres". (Posible problema remanente de caché en React o validación en `addNote`/`addTextOnlyNote`).
- [ ] **Rendimiento/Errores en Importación:** El modal de `+ Importar a Local` tarda demasiado tiempo en responder o lanza un error subyacente que bloquea la experiencia de usuario. Requiere profiling y revisión de logs.
- [ ] **Unificación de Modales y Base de Datos:** Existen dos flujos paralelos (`ImportContextModal` y `LinkModal`). Se debe revisar la base de datos de notas de ambos modales y unificarlos en una sola experiencia fluida para "Importar a Local" y "Añadir Relación / Etiqueta".
- [ ] **Lógica de Marcadores:** Retomar y consolidar la lógica diferenciada entre un **marcador de relación** (vínculo semántico entre entidades) y un **marcador de navegación** (estado de mapa/tiempo tradicional).
