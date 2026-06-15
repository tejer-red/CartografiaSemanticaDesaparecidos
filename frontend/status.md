# Estado: Fase 1 (Autenticación)

## Cambios Realizados
- **[MODIFY] `package.json` / `package-lock.json`**: Se instaló la dependencia `@supabase/supabase-js`.
- **[MODIFY] `src/main.jsx`**: Se envolvió toda la aplicación `<App />` (y el `DataProvider`) dentro de `<AuthProvider>`.
- **[MODIFY] `src/App.jsx`**: 
  - Se eliminó la dependencia local/hardcodeada `isAuthenticated` y `USE_PASSWORD`.
  - Se reemplazó el uso de `<PasswordCheck />` por la verificación del estado `user` expuesto por `useAuth`.
  - Si el usuario no ha iniciado sesión, se renderiza el nuevo componente `<LoginScreen />`.
- **[MODIFY] `src/config.js`**: Se removió la variable exportada `USE_PASSWORD` que quedó obsoleta tras esta migración.

## Resultado
La aplicación React ahora integra exitosamente la capa global de Supabase. El flujo de arranque se bloquea correctamente hasta resolver la sesión de usuario o mostrar el formulario de registro/ingreso.

# Estado: Fase 4 (Ingesta de Datos y Red Semántica Local)

## Cambios Realizados
- **[MODIFY] `DataContext.jsx`**:
  - Se añadieron botones de inyección HTML directamente a los *popups* de los marcadores del mapa ("Importar a Local" y "Añadir Relación / Etiqueta").
  - Se implementó `window.handlePopupAction` globalmente para comunicar el mapa MapLibre con el contexto de React.
  - Refactorización de la búsqueda de marcadores (`allFeatures.find`) para soportar de manera robusta estructuras de `Array` o `FeatureCollection`, y conversiones de ID a String.
- **[MODIFY] `LinkModal.jsx`**:
  - Se transformó de un simple formulario de creación a un gestor de "Relaciones y Etiquetas", cargando mediante `useLinks.getLinksForEntity` las relaciones existentes y permitiendo eliminarlas.
- **[MODIFY] `useLocalData.js`**:
  - Se agregó la función `clearAllLocalData` para vaciar las tablas de `IndexedDB` asociadas al usuario actual sin necesidad de desloguear (`signOut`).
- **[MODIFY] `LocalDataPanel.jsx`**:
  - Se integró el botón "Borrar base local" invocando `clearAllLocalData` para vaciar el contenido puramente local, manteniendo viva la sesión de Supabase.
- **[MODIFY] `logger.js`**:
  - Configuración depurada: Se desactivaron registros innecesarios y se activaron únicamente los registros relacionados con `LinkModal`, `LocalDataPanel`, `MiniNetworkModal`, `useLinks`, y `useLocalData`.
- **[MODIFY] `App.jsx`**:
  - Promoción del `LinkModal` a un componente global administrado por `globalLinkModal` dentro de `DataContext`.

## Resultado
Se logró consolidar una infraestructura "Local-First" donde los usuarios pueden interactuar directamente con elementos remotos en el mapa, importarlos instantáneamente a su base de datos local y tejer redes relacionales (nodos y etiquetas) de manera eficiente. La vinculación entre el mapa estático de MapLibre y el estado dinámico de React funciona perfectamente, manteniendo interfaces de gestión visual claras y un registro en consola limpio para depuración de redes semánticas.

# Estado: Fase 5 (Optimización de Sincronización y Ciclo de Vida Local-First)

## Cambios Realizados
- **[MODIFY] `utils/notebook.js`**:
  - Se corrigió la persistencia local de cuadernos. Ahora se guarda un objeto completo de configuración en `localStorage` (`datades-notebook-${id}`) que unifica las notas, el rango de fechas (`startDate`/`endDate`), el slider temporal (`selectedDate`), el rango de edad, género, condición de localización y estados de visualización de layouts.
  - Al cargar un cuaderno, se prioriza este estado síncrono de `localStorage` para evitar latencias de red, cayendo en la base de datos remota solo como fallback.
  - Se añadió una guarda estricta para evitar que la sesión vacía de la raíz (`/dist`) intente cargar datos previos de cuadernos genéricos o incremente `fetchId` prematuramente.
- **[MODIFY] `DataContext.jsx`**:
  - Se modificó `resetContext()` para establecer `fetchId` en `0`, limpiar los marcadores residuales de memoria y remover explícitamente las capas y fuentes del mapa base al cambiar de ruta, evitando descargas automáticas no deseadas.
  - Se implementó un efecto centralizado que restablece todos los conteos de datos (`dataCounts`) a `0` y pone el estado de descarga (`loadingStatus`) en `true` cada vez que se inicia un ciclo de búsqueda real (`fetchId > 0`).
- **[MODIFY] `FetchCedulas.jsx` / `FetchFosas.jsx`**:
  - Se desacopló la actualización del conteo del estado de inicialización del mapa. El conteo se actualiza de inmediato al finalizar la descarga.
  - Se instaló un listener seguro (`map.once('style.load')`) que actúa como fallback para agregar los datos a las capas si el estilo del mapa aún está cargando.
- **[MODIFY] `FetchForense.jsx` / `FetchNoticias.jsx`**:
  - Se sincronizaron las dependencias y se restringió la descarga únicamente cuando `fetchId > 0`.
- **[MODIFY] `GlobalTimeGraph.jsx`**:
  - Se eliminaron las banderas de carga locales inestables y se vinculó la reconstrucción de la línea de tiempo directamente a la transición de cierre de la pantalla de carga (`showLoadingScreen`), garantizando un renderizado automático instantáneo sin necesidad de clics adicionales.
- **[MODIFY] `LoadingOverlay.jsx`**:
  - Se actualizaron las etiquetas del modal y del botón principal a **"Carga de Información"** e **"Iniciar Carga de Información"**.
  - Se mejoró el modo Verbose para reflejar el estado síncrono de descarga de los identificadores internos y sus conteos en tiempo real.

## Resultado
La aplicación ahora cuenta con una inicialización totalmente determinista. La navegación por la raíz carga un mapa libre de marcadores y espera de forma limpia la acción del usuario. La carga de cuadernos sincroniza de forma inmediata todas las fechas y filtros directamente desde el almacenamiento local, y los marcadores y el gráfico del tiempo (`GlobalTimeGraph`) se actualizan automáticamente y al unísono tan pronto como finalizan las descargas.

