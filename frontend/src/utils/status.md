# Estado: Fase 1 (Autenticación)

## Cambios Realizados
- **[NEW] `supabase.js`**: Se creó el cliente de Supabase utilizando `createClient` y las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` según la documentación oficial de Supabase.

## Resultado
El cliente de conexión con Supabase está expuesto como un singleton listo para ser utilizado por el resto de la aplicación (particularmente por `AuthContext.jsx`).
