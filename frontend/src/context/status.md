# Estado: Fase 1 (Autenticación)

## Cambios Realizados
- **[NEW] `AuthContext.jsx`**: Se implementó el contexto de autenticación que gestiona el estado del usuario (`user`, `session`) utilizando el cliente de Supabase.
- Se implementaron los métodos `signIn`, `signUp`, `signOut` y `getAccessToken`.
- Se incluyó un `useEffect` para escuchar los cambios de estado en la sesión (listener de Supabase).

## Resultado
El manejo de estado de autenticación de la aplicación ahora depende íntegramente de Supabase, proporcionando a los componentes de la interfaz acceso a la sesión actual y funciones de control de acceso.
