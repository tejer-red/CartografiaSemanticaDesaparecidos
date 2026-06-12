# Estado: Fase 2 (Base de Datos Local)

## Cambios Realizados
- **[NEW] `localDatabase.js`**: Se configuró Dexie.js para manejar una base de datos IndexedDB llamada `CartografiaLocal`.
- Se crearon las tablas necesarias para soportar el modo *offline*: `local_fosas`, `local_pfsi`, `local_noticias`, `local_cedulas` y `local_vinculos`.
- Los índices fueron diseñados incluyendo `user_id` para aislar la información de cada cuenta, y `uuid` para evitar colisiones con la base de datos de producción.

## Resultado
La aplicación ahora cuenta con la infraestructura de almacenamiento local requerida para que los usuarios guarden información asíncrona directamente en el navegador sin las limitaciones de `localStorage`.
