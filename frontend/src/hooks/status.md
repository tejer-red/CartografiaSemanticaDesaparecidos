# Estado: Fase 2 (Base de Datos Local)

## Cambios Realizados
- **[NEW] `useLocalData.js`**: Se creó un hook personalizado de React que expone todas las operaciones CRUD para la base de datos local (Dexie).
- Inyecta automáticamente el `user_id` de la sesión actual de Supabase a todos los registros nuevos, junto con un `uuid` v4 único y un `timestamp`.
- Las consultas de obtención (`getLocalFosas`, etc.) están filtradas mediante Dexie para devolver únicamente los registros del usuario autenticado.

## Resultado
Los componentes de React ahora pueden interactuar fácilmente con la base de datos local llamando a las funciones del hook, manteniendo el encapsulamiento y el aislamiento de datos por usuario.
