# Estado: Fase 4 (Unificación de Estados)

## Cambios Realizados
- **[MODIFY] `FetchFosas.jsx`, `FetchNoticias.jsx`, `FetchCedulas.jsx`**: Se modificaron los hooks `useEffect` principales de hidratación. Después de recuperar la *FeatureCollection* del servidor (`API_BASE_URL`), se intercepta ese objeto y se le aplica `mergeWithLocal` para añadir los datos del IndexedDB al mismo conjunto de datos.
- Específicamente en `FetchNoticias.jsx`, se ajustó su layout interno de *paint* para asegurar la diferenciación visual (`isLocal: true`) del borde de los círculos.

## Resultado
El sistema de capas de MapLibre es ahora capaz de renderizar simultáneamente nodos de información provenientes de PostgreSQL (remotos) e IndexedDB (locales), manteniendo todos los pipelines de clústering, jitter y filtros funcionales.
