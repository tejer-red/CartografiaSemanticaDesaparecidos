# Estado: Fase 3 (Vínculos Semánticos)

## Cambios Realizados
- **[NEW] `useLinks.js`**: Hook encargado de gestionar los datos relacionales (CRUD de `local_vinculos` en Dexie).
- Incluye el diccionario de `RELATION_TYPES` (ej. `MENCIONA_HALLAZGO`, `PERTENECE_A_FOSA`).
- `getLinksForEntity` permite buscar todas las aristas conectadas a un nodo (sea en posición origen o destino), lo que habilita consultas transversales fluidas.

## Resultado
Se consolidó la capa lógica para almacenar aristas locales y privadas del grafo semántico. Estas relaciones permitirán que los datos generados por el usuario intersecten los datos extraídos del backend en la vista final.
