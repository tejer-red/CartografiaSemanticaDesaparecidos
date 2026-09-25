# 🚀 Guía Universal de Despliegue: Cartografía Semántica de Desaparecidos

Este documento establece el protocolo operativo estándar para levantar, iterar y desplegar el sistema tanto en **entorno de desarrollo local** como en **entorno de producción** (Docker en Dockge y Vercel).

---

## 1. Principio Fundamental: Código Agnóstico al Entorno

El código fuente es estrictamente agnóstico al entorno de ejecución. Todas las diferencias de host, puertos o credenciales se resuelven exclusivamente mediante variables de entorno (`.env` o variables en Vercel/Dockge):
- **Local Dev:** Frontend corre en Vite (puerto `5173`/`5174`) y Backend en Uvicorn (puerto `8008`).
- **Producción:** Frontend corre en Vercel (`https://cartografia.tejer.red`) y Backend en Docker vía Dockge (`cartografia-backend` en puerto `9090`).
- **Resolución de API:** `frontend/src/config.js` detecta si el host es `cartografia.tejer.red` o `vercel.app` para conectarse a `https://cartografia.tejer.red/api/v1`, o `localhost:8008` en local.

---

## 2. Entorno de Desarrollo Local (Conda + Node)

Para iteración rápida con recarga en vivo (*hot-reload*) sin colisionar con contenedores de producción:

### Backend Local (FastAPI / Uvicorn)
```bash
conda activate ner-cartografia && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8008 --reload
```
* Salud del backend: `curl -s http://localhost:8008/api/v1/health`

### Frontend Local (Vite / React)
```bash
export PATH=$HOME/miniconda3/envs/tejer-dev/bin:$PATH && npm run dev -- --host 0.0.0.0 --port 5173
```
* Acceso web: `http://localhost:5173/` (o puerto asignado automáticamente si 5173 está ocupado).

---

## 3. Entorno de Producción: Frontend (Vercel)

El frontend está configurado en Vercel con integración continua (CI/CD) vinculada al repositorio GitHub:
- **Proyecto:** `redcontexto`
- **Dominio de Producción:** `https://cartografia.tejer.red`
- **Dominio Vercel:** `https://redcontexto-*.vercel.app`
- **Rama de Despliegue:** `feature/ner-ontologia-mineria`

### Flujo de Despliegue Frontend:
Al realizar `git push origin feature/ner-ontologia-mineria`, Vercel detecta automáticamente el nuevo commit, ejecuta `vite build` y publica la nueva versión en producción de forma instantánea.

---

## 4. Entorno de Producción: Backend (Docker en Dockge)

El backend de producción se ejecuta en el servidor (ej. `abeja`) como un contenedor Docker gestionado por **Dockge** dentro del stack `cartografia`.

### Estructura del Stack en Dockge
- **Nombre del Stack:** `cartografia`
- **Ruta en Servidor:** `/opt/stacks/cartografia`
- **Contenedor:** `cartografia-backend` (servicio `app`)
- **Puerto Host:** `9090` (mapeado a `9090` del contenedor)
- **Red Docker:** `backend` (red externa compartida con PostgreSQL y proxy)
- **Reverse Proxy:** Nginx / Cloudflare Tunnel redirige `https://cartografia.tejer.red/api/v1` hacia `http://cartografia-backend:9090/api/v1`.

---

### Opción A: Despliegue desde la Interfaz Web de Dockge (Recomendado / 1 Clic)

1. Abrir la interfaz web de Dockge en tu navegador: `http://<IP-SERVIDOR>:5001` (o dominio de Dockge).
2. Seleccionar el stack **`cartografia`** en la barra lateral izquierda.
3. En la barra superior de acciones, hacer clic en el botón **Actualizar** (ícono de nube con flecha hacia abajo).
4. Dockge ejecutará internamente el `git pull`, reconstruirá la imagen Docker (`build`) y reiniciará el contenedor sin tocar tus variables de entorno.
5. Observar en el panel de **Terminal** que aparezca:
   ```text
   INFO: Uvicorn running on http://0.0.0.0:9090 (Press CTRL+C to quit)
   ```

---

### Opción B: Despliegue Manual vía SSH (Protocolo Obligatorio en Dos Fases)

> [!IMPORTANT]
> Los comandos en servidor remoto deben ser ejecutados exclusivamente por el usuario.

#### Fase 1: Diagnóstico Previo (No Invasivo)
🐝 **En tu terminal SSH abierta en el servidor (`abeja`):**
```bash
# 1. Verificar estado actual del contenedor y recursos del sistema
docker ps --filter "name=cartografia-backend"
free -h
df -h /

# 2. Revisar los últimos logs para confirmar que el servicio esté respondiendo
docker logs --tail 30 cartografia-backend

# 3. Comprobar salud del backend en puerto 9090 antes de modificar nada
curl -s -m 3 http://localhost:9090/api/v1/health || echo "Servicio no responde en 9090"
```

#### Fase 2: Ejecución del Despliegue
🐝 **En tu terminal SSH abierta en el servidor (`abeja`):**
```bash
# 1. Entrar al directorio del stack en Dockge
cd /opt/stacks/cartografia

# 2. Descargar los últimos cambios confirmados desde Git
git pull origin feature/ner-ontologia-mineria

# 3. Reconstruir la imagen del backend y levantar el servicio en segundo plano
docker compose up -d --build

# 4. Verificación de salud posterior
sleep 3
curl -s http://localhost:9090/api/v1/health

# 5. Monitoreo de logs en vivo
docker logs -f --tail 50 cartografia-backend
```

---

## 5. Matriz de Variables de Entorno de Producción (`.env`)

En el servidor (`/opt/stacks/cartografia/.env`), verificar que existan las siguientes variables sin exponer secretos en el repositorio:

```bash
# Base de Datos PostgreSQL Master (Abeja)
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@tejer_postgres:5432/cartografia_semantica_db

# Supabase Réplica Pública
SUPABASE_URL=https://${SUPABASE_PROJECT_REF}.supabase.co
SUPABASE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Configuración de Servidor
ENVIRONMENT=production
PORT=9090
```
