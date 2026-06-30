# 🚀 Guía de Despliegue: Cartografía Semántica de Desaparecidos

Esta guía describe el procedimiento para desplegar la aplicación en producción utilizando una arquitectura mixta:
1. **Frontend** alojado de forma serverless en **Vercel** (dominio `carto.tejer.red`).
2. **Backend** ejecutándose bajo **Docker Compose** en tu servidor local Ubuntu y expuesto con **Cloudflare Tunnel** en el subdominio `api.carto.tejer.red` usando un puerto no convencional (`9090`).

---

## 💻 1. Despliegue del Frontend (Vercel)

El frontend se conecta directamente a Vercel desde tu repositorio de GitHub.

### Configuración en el Dashboard de Vercel:
1. **Crear Proyecto**: En el dashboard de Vercel, importa el repositorio del proyecto.
2. **Root Directory**: Selecciona el directorio **`frontend`**.
3. **Framework Preset**: Selecciona **Vite**.
4. **Environment Variables**: Agrega las siguientes variables:
   - `VITE_SUPABASE_URL`: Tu URL de Supabase.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Tu clave pública `anon` de Supabase.
   - `VITE_API_URL`: **`https://api.carto.tejer.red/api/v1`** (apuntando al subdominio del backend).
   - `VITE_ROUTER_BASENAME`: **`/`** (o déjala vacía, ya que por defecto es `/` si no se especifica. Solo cámbiala a `/dist` si usaras rutas heredadas).
5. **Dominio Personalizado**: Asigna tu dominio **`carto.tejer.red`** en Vercel.

---

## 🐳 2. Despliegue del Backend (Servidor Ubuntu con Docker)

El backend de FastAPI se levanta en tu servidor usando la red externa compartida de tu túnel Cloudflare.

### Paso 1: Configurar Variables de Entorno del Servidor
En la raíz del proyecto en tu servidor, copia la plantilla `.env.production` como tu archivo `.env`:
```bash
cp .env.production .env
```
Edita el archivo `.env` configurando la cadena de conexión de Supabase:
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST_DE_SUPABASE]:5432/postgres
```

### Paso 2: Copiar / Crear el docker-compose.yml en Dockge
En tu stack de Dockge (ubicado en `/opt/stacks/cartografia-semantica/docker-compose.yml`), pega el siguiente contenido:

```yaml
name: cartografia-semantica
version: "3.8"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cartografia-backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 9090
    ports:
      - "9090:9090" # Mapeado al puerto no común 9090
    env_file:
      - ./.env
    restart: unless-stopped
    networks:
      - backend

networks:
  backend:
    external: true
```

### Paso 3: Levantar el Backend
Haz clic en **Start** / **Deploy** en la interfaz de Dockge, o ejecútalo por consola dentro del directorio `/opt/stacks/cartografia-semantica`:
```bash
docker compose up -d --build
```

---

## ☁️ 3. Configuración de Cloudflare Tunnel (HTTPS)

Como el backend y tu contenedor de `cloudflared` comparten la red externa de Docker llamada `backend`, el túnel puede comunicarse directamente con la API de forma interna.

### En la consola de Cloudflare Zero Trust (Tunnels):
1. Selecciona tu túnel activo y agrega una ruta pública (**Public Hostname**):
   - **Subdomain**: `api.carto`
   - **Domain**: `tejer.red`
   - **Type**: `HTTP`
   - **URL**: `cartografia-backend:9090` *(Gracias a la red Docker compartida, puedes usar el nombre del contenedor en lugar de localhost)*
2. Guarda los cambios. El backend quedará expuesto inmediatamente bajo HTTPS de forma segura.

---

## 🔄 4. Migración de Datos Semánticos

Para importar datos históricos desde tu base de datos anterior (MySQL) a la base de datos PostgreSQL de Supabase en producción:
1. Asegúrate de configurar la variable `OLD_DATABASE_URL` en tu archivo `.env`.
2. Ingresa al contenedor de FastAPI en ejecución:
   ```bash
   docker compose exec backend bash
   ```
3. Corre el script ETL de migración:
   ```bash
   python scripts/migrate_data.py
   ```
