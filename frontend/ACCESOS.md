# Reporte de Control de Accesos y Autenticación (Frontend)

Este documento describe la arquitectura y el estado actual del control de accesos (autenticación) en la aplicación frontend. 
La autenticación se basa en **Supabase** y se gestiona globalmente a través del contexto `AuthContext.jsx` y el hook `useAuth`.

## 1. Enrutamiento y Accesos Globales (`App.jsx`)

La aplicación implementa un sistema de rutas mixtas, divididas en accesos públicos y accesos privados orientados a la edición:

### Rutas Públicas (Sin Autenticación)
Estas rutas son accesibles para cualquier visitante sin necesidad de iniciar sesión (representan la versión libre al público).
- `/` (Página de inicio / Landing Page)
- `/cuaderno/lista` (Catálogo general de cuadernos disponibles)
- `/visible/:id` (Versión de visualización pública y lectura de un cuaderno interactivo)
- Redirecciones alias (`/dist/*`): Las variantes de URL con `/dist` se redirigen internamente a sus contrapartes limpias de forma transparente para soportar despliegues estáticos heredados.

### Rutas Privadas (Requieren Autenticación)
Rutas dedicadas a la investigación, edición y creación de cartografías semánticas. Si un usuario no autenticado intenta acceder, será interceptado e inevitablemente se le mostrará el componente `<LoginScreen />`.
- `/cuaderno/nuevo` (Creación de nuevos cuadernos interactivos)
- `/cuaderno/:id` (Edición y cruce de datos sobre cuadernos de investigación existentes)

*Nota Arquitectónica:* La ejecución de procesos pesados de fondo (como `FetchCedulas`, `FetchFosas`) y la inicialización de `MapComponent` ahora renderizan libremente para usuarios anónimos en rutas públicas, pero su ejecución se bloquea proactivamente si se detecta un usuario anónimo forzando una ruta privada.

---

## 2. Componentes Visuales Afectados

### `components/auth/LoginScreen.jsx`
Componente barrera. Su función principal es restringir el paso a las rutas privadas de trabajo. Integra:
- Pestañas duales de autenticación (Registro e Inicio de sesión).
- Información de contacto (`accesos_cartografia@tejer.red`) advirtiendo que los datos cartográficos crudos son de naturaleza sensible.

### `components/auth/GlobalAuthIndicator.jsx` (Nuevo)
Componente de estado de sesión unificado. Funciona como un "botón fantasma/secundario" integrado directamente en los encabezados principales de todas las vistas (`LandingPage`, `NotebookListPage`, `HeaderCompact`, `VisibleNotebook`):
- **Usuario Anónimo:** Muestra "Iniciar sesión". Al pulsarlo en una ruta pública, redirige forzosamente al inicio de sesión (mediante `/cuaderno/nuevo`).
- **Usuario Logueado:** Muestra el correo electrónico del analista. Despliega un menú flotante con la confirmación de sesión y el botón para cerrar sesión (`signOut`).

### `components/notebook/NotebookListPage.jsx`
La página del catálogo adapta dinámicamente sus botones de acción (en el pie de cada tarjeta de cuaderno) dependiendo del estado de sesión:
- **Con Sesión:** Ofrece dos rutas de acción: "Editar" (redirige al espacio de trabajo privado `/cuaderno/:id`) y "Visible" (para ver la versión pública `/visible/:id`).
- **Sin Sesión:** Restringe la acción mostrando únicamente el botón "Visualización Pública", forzando el enrutamiento a `/visible/:id` y previniendo el acceso al entorno de edición.

### `components/layout/HeaderCompact.jsx`
- Integra el `GlobalAuthIndicator` en la parte superior derecha de las acciones.
- En el modal de información de la sesión ("Detalles de Sesión"), renderiza dinámicamente el correo electrónico del responsable activo (`user.email`). De no existir sesión, opera en degradación mostrando "Usuario Local".

### `components/notebook/LocalDataPanel.jsx` & `ImportContextModal.jsx` & `Notebook.jsx`
- Dependen de la sesión validada (`useAuth`) para firmar acciones locales o en red. 
- Vinculan la metadata al cargar archivos externos y la administración de cuadernos a la cuenta del analista que se encuentre en sesión. Adicionalmente, el panel local puede brindar controles de término de sesión (`signOut`).

---

## 3. Hooks de Datos y Lógica de Negocio

La capa de negocio intercepta la sesión global para segmentar el trabajo de los analistas:

- **`useLocalData.js`**: Interactúa con el almacenamiento IndexedDB (Dexie). Segmenta cachés y registros a nivel de cliente para no mezclar las modificaciones locales entre diferentes sesiones o perfiles en una misma máquina.
- **`useLinks.js`**: Administra la persistencia de relaciones topológicas (conexiones en el grafo de nodos). Garantiza que cada nueva relación tenga trazabilidad al investigador autenticado.
- **`useNavigationLog.js`**: Registra la bitácora de navegación, fundamental para conservar los pasos seguidos por el investigador en el mapa y la línea de tiempo.

---

**Conclusión del Estado Actual**: 
La plataforma implementa exitosamente un modelo **Híbrido de Acceso**: ofrece difusión pública y libre (sin fricción) en los entregables finales (`/visible`, `/lista`), a la vez que encierra las herramientas de ensamblaje, geolocalización intensiva y modelado relacional en una capa estrictamente validada bajo autenticación por tokens (Supabase).
