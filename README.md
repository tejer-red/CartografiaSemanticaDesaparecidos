# Cartografía Semántica de Desaparecidos - Jalisco

Este proyecto es una plataforma interactiva diseñada para la geolocalización y el análisis de reportes de personas desaparecidas y registros forenses en el estado de Jalisco. Integra un backend en Python (FastAPI) con persistencia en Supabase PostgreSQL y un frontend dinámico construido en React + Vite.

![Jalisco Missing Reports Geolocation Screen](https://datades.abundis.com.mx/screen.png)

---

## 🏗️ Arquitectura del Monorepo

El repositorio está estructurado bajo un monorepo limpio y desacoplado:

*   **`frontend/`**: Aplicación de interfaz de usuario React/Vite (apta para deploy directo en Vercel).
*   **`backend/`**: Servidor de API REST desarrollado con FastAPI, SQLAlchemy y PostgreSQL (empaquetado en Docker).
*   **`api/` (Legacy)**: Scripts PHP originales de la versión previa (mantenidos para compatibilidad temporal).

---

## 🚀 Guía de Inicio Rápido

Sigue estos pasos para poner en marcha el entorno local de desarrollo:

### 1. Configuración de Variables de Entorno

En la raíz del repositorio, copia el archivo de ejemplo y crea el archivo `.env`:

```bash
cp .env.example .env
```

Edita el archivo `.env` recién creado e introduce las credenciales reales:
*   `OLD_DB_*`: Credenciales de la base de datos de origen en MySQL.
*   `NEW_DATABASE_URL` y `DATABASE_URL`: Tu cadena de conexión PostgreSQL de Supabase.

---

### 2. Puesta en Marcha del Backend (FastAPI)

#### Opción A: Ejecutar con Docker (Recomendado)
El backend está completamente configurado para levantarse en contenedores Docker de forma rápida:

```bash
docker compose up --build
```

Esto compilará el backend e iniciará el servidor web en `http://localhost:8000`. 
*   **Documentación Interactiva (Swagger)**: Visita [http://localhost:8000/docs](http://localhost:8000/docs) para probar los endpoints.
*   **Documentación ReDoc**: Disponible en [http://localhost:8000/redoc](http://localhost:8000/redoc).

#### Opción B: Ejecutar Localmente con Entorno Virtual
Si deseas ejecutarlo nativamente fuera de Docker:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

### 3. Migración de Datos (Opcional)
Si necesitas realizar el volcado inicial de datos desde MySQL a tu nueva base de datos Supabase PostgreSQL:

1. Asegúrate de configurar las variables `OLD_DB_*` y `NEW_DATABASE_URL` en tu `.env`.
2. Ejecuta el script de migración estructurada:
   ```bash
   cd backend
   source venv/bin/activate  # (o activa tu entorno virtual)
   python scripts/migrate_data.py
   ```
   *El script se encarga de crear las tablas de manera automática y realizar cargas masivas optimizadas corrigiendo colisiones de índices de PostgreSQL.*

---

### 4. Puesta en Marcha del Frontend (React + Vite)

El frontend está configurado para conectarse al backend local en `http://localhost:8000/api/v1` automáticamente si ejecutas localmente.

1. Navega a la carpeta de interfaz:
   ```bash
   cd frontend
   ```
2. Instala las dependencias necesarias de npm:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo Vite:
   ```bash
   npm run dev
   ```

El servidor web del frontend se levantará normalmente en `http://localhost:5173`. Abre esa URL en tu navegador y verás la aplicación interactiva consumiendo los datos directamente desde tu nueva API de FastAPI y Supabase.
