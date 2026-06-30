# Gestión de Metadatos de Cuadernos (Frontend)

Este documento describe cómo se almacenan, extraen y visualizan los metadatos de los "Cuadernos de Investigación" en la aplicación cliente.

## 1. Almacenamiento Local (IndexedDB)
Los cuadernos almacenados de forma local (en el navegador del usuario) se guardan a través de Dexie (`lib/localDatabase.js`) en la tabla `notebooks`.

La tabla contiene la estructura básica indexada:
- `id` (Auto-incrementable)
- `name` (Identificador principal / Título)
- `created_at` / `updated_at` (Marcas de tiempo)

### `configJSON`
Todo el contexto de la exploración (filtros aplicados, estado del mapa, capas visibles) se consolida y serializa en un único campo de texto llamado `configJSON`. Este incluye:
- `startDate` / `endDate`: Rango de fechas absoluto de la consulta al backend.
- `selectedDate`: Fecha exacta (o inicio) seleccionada en la línea de tiempo.
- `daysRange`: Rango de días alrededor de la `selectedDate`.
- `selectedSexo` / `selectedCondicion` / `edadRange` / `sumScoreRange`: Filtros demográficos y de calidad del dato.
- `mapType`: Tipo de visualización geoespacial (`heatmap`, `points`, etc.).
- `colorScheme`: Esquema de colores (`sexo`, `condicion`, etc.).
- `timeScale`: Escala de la línea de tiempo.
- `visibleComponents`: Ocultamiento o visibilidad de paneles.

---

## 2. Extracción y Presentación (`NotebookListPage.jsx`)

Para mejorar la experiencia de usuario y dotar de contexto inmediato al listado de cuadernos (`/cuaderno/lista`), se realiza un mapeo dual:

### A. Cuadernos Locales
Al iterar la base de datos local, la interfaz intercepta `configJSON` y realiza un parseo seguro (`JSON.parse` dentro de un bloque `try-catch`). Se extraen selectivamente los siguientes atributos:
- **Período**: `startDate` y `endDate`.
- **Vista Principal**: `mapType` (traduciendo "heatmap" a "Mapa de Calor" y "points" a "Puntos").
- **Total Notas**: Obtenido consultando la cantidad de registros en la tabla IndexedDB `navigation_logs` que coinciden con el `notebook_id`.
- **Autor**: Resuelto dinámicamente usando el correo del usuario (`user.email`) de la sesión activa en el `AuthContext`, asumiendo autoría local, o degradando a "Analista" si es público.

### B. Cuadernos Servidor (Remotos)
Al obtener cuadernos mediante la API del servidor (`API_BASE_URL/notebooks`), el backend procesa las instancias del modelo `Notebook` y devuelve un diccionario completo. El frontend mapea directamente:
- `startDate` y `endDate`.
- `notesCount`: Calculado en tiempo real en FastAPI extrayendo la longitud del arreglo JSON de `notes` (`len(n.notes)`).
- **Autor**: Evaluado usando las mismas reglas dinámicas de la sesión.

### C. Visualización de Tarjeta (Card)
Los metadatos extraídos se inyectan en un sub-componente CSS (`.notebook-metadata`) alojado en la tarjeta de cada cuaderno, lo que permite al analista identificar el rango temporal y la configuración visual del mapa sin tener que forzar la carga interactiva completa del cuaderno.

---

## 3. Beneficios Arquitectónicos
1. **Rendimiento:** Evita que el cliente tenga que indexar pesados diccionarios JSON en la IndexedDB o extraer metadatos iterando todos los registros de los logs de navegación.
2. **Contexto Anticipado:** Permite discernir cuadernos homónimos diferenciándolos por su temporalidad.
3. **Desacoplamiento:** El formato `configJSON` asegura que la base de datos no se rompa si se añaden nuevos filtros interactivos en iteraciones futuras de desarrollo.
