# 💻 Guía de Despliegue en Modo Local (`--local` / CLI Directo)

Esta guía explica cómo ejecutar, depurar y desarrollar los componentes de **Cartografía Semántica de Desaparecidos** directamente en tu máquina local sin necesidad obligatoria de Docker.

---

## 1. Requisitos Previos

* **Python 3.10 o 3.11** con entorno virtual (`venv` o `conda`).
* **Node.js 18+ o 20+** y `npm`.
* Acceso de red a las instancias de `abeja` (PostgreSQL, Qdrant, Redis) o instancias locales equivalentes.

---

## 2. Configuración de Variables de Entorno (`.env.local`)

Copia la plantilla de ejemplo y configura tus credenciales locales:

```bash
cp .env.example .env.local
```

El archivo `.env.local` está protegido en `.gitignore` y debe contener:

```env
# Entorno
ENVIRONMENT=development
DEBUG=true

# Sal Criptográfica Global (definida para generar hashes consistentes de PII)
PII_GLOBAL_SALT=tejer_secret_salt_2026_cartografia

# Base de Datos PostgreSQL
DB_HOST=127.0.0.1          # o IP Tailscale de abeja: 100.66.3.85
DB_PORT=5432
DB_USER=tejer_Admin
DB_PASSWORD=tu_password_local
DB_NAME=cartografia_semantica_db

# Base Vectorial Qdrant
QDRANT_HOST=127.0.0.1      # o IP Tailscale de abeja: 100.66.3.85
QDRANT_PORT=6333
QDRANT_COLLECTION=cartografia_registros_anonimizados

# Broker de Colas Redis
REDIS_HOST=127.0.0.1       # o IP Tailscale de abeja: 100.66.3.85
REDIS_PORT=6379
REDIS_QUEUE=cola_mineria_osint

# Metabuscador SearXNG
SEARXNG_URL=http://127.0.0.1:8888

# Inferencia vLLM en Red Local (Servidor GPU)
VLLM_API_BASE=https://ia-pub.tejer.red/api/v1
VLLM_MODEL=architect:latest

# Concurrencia de Scraping (en Raspberry Pi usar 1, en laptop/desktop 2-4)
PLAYWRIGHT_CONCURRENCY=2
```

---

## 3. Instalación de Dependencias

### Backend (Python):
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Frontend (Node / React):
```bash
cd frontend
npm install
cd ..
```

---

## 4. Comandos de Ejecución Local

### Terminal 1: Backend FastAPI (Puerto 8002)
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8002 --reload --env-file .env.local
```
* Documentación interactiva Swagger: `http://localhost:8002/docs`
* Endpoint de salud: `http://localhost:8002/api/v1/health`

### Terminal 2: Worker de Colas y Minería (Redis)
```bash
python3 -m backend.app.miners.worker --local
```
* Escucha tareas en `cola_mineria_osint` y ejecuta el pipeline SearXNG + Trafilatura + Playwright con el límite configurado en `PLAYWRIGHT_CONCURRENCY`.

### Terminal 3: Frontend Vite / React (Puerto 5173)
```bash
cd frontend
npm run dev -- --port 5173
```
* Acceso web: `http://localhost:5173`

---

## 5. Comandos Auxiliares Útiles

### Inicialización de Tablas en la Base de Datos:
```bash
python3 -m backend.scripts.init_db
```

### Minería Batch del Histórico con Rate-Limiting:
```bash
# Procesa lotes de casos históricos con intervalo de 300s (5 min) para evitar bloqueos:
python3 -m backend.app.miners.batch_miner --limit 50 --interval 300
```

### Ejecución de Pruebas Automatizadas:
```bash
pytest tests/ -v
```
