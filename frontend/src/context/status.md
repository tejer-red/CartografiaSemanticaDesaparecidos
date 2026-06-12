# Estado: Fase 4 (Unificación de Estados)

## Cambios Realizados
- **[MODIFY] `DataContext.jsx`**: Se integró el hook `useLocalData` para obtener los datos de la base local y se expusieron bajo los estados `localFosas`, `localNoticias`, `localCedulas` y `localVinculos`.
- Se creó la función `mergeWithLocal` encargada de estandarizar el formato de los registros de IndexedDB (convirtiéndolos a *Features* GeoJSON con la propiedad `isLocal: true`) e inyectarlos transparentemente en el conjunto de datos remoto.
- Se actualizaron las expresiones de estilo (`circle-stroke-color` y `circle-stroke-width` de Mapbox/MapLibre) para los layout de `sexoLayout` (cédulas) y `fosasLayout` (fosas), dibujando un borde violeta grueso a los marcadores locales.

## Resultado
El `DataContext` ahora opera de manera **híbrida**, garantizando que cualquier componente o capa que dependa de los datos maestros (mapa principal, gráficos, KPIs) contabilice y pinte de inmediato la información de la base de datos local.
