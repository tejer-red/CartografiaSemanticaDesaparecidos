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
