from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import (
    casos,
    personasdesaparecidas,
    personasfallecidassinidentificar,
    etiquetas,
    fosas,
    noticias,
    notebooks
)

from contextlib import asynccontextmanager

from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Prepare legacy table with primary key so foreign keys can reference it
    try:
        with engine.begin() as conn:
            # Check if primary key exists (if it fails, it means it's already a PK or does not exist yet)
            try:
                conn.execute(text('ALTER TABLE cedulas_anonimizadas ALTER COLUMN id_cedula_busqueda SET NOT NULL;'))
                conn.execute(text('ALTER TABLE cedulas_anonimizadas ADD PRIMARY KEY (id_cedula_busqueda);'))
                print("Successfully added PRIMARY KEY constraint to cedulas_anonimizadas(id_cedula_busqueda)")
            except Exception as pk_err:
                print(f"Info: Primary key constraint check on id_cedula_busqueda completed: {pk_err}")
                
        # Create tables that don't exist yet (e.g. etiquetas, fosas, noticias, caso_etiqueta, notebooks)
        Base.metadata.create_all(bind=engine)
        
        # Add fosa_id to legacy table if it doesn't exist
        with engine.begin() as conn:
            conn.execute(text('ALTER TABLE cedulas_anonimizadas ADD COLUMN IF NOT EXISTS fosa_id INTEGER REFERENCES fosas(id) ON DELETE SET NULL;'))
            print("Successfully verified/added fosa_id column in cedulas_anonimizadas")
    except Exception as e:
        print(f"Warning: Could not connect to database or alter tables: {e}")
    yield

app = FastAPI(
    title="Tejer.Red - Cartografía Semántica de Desaparecidos API",
    description="FastAPI Backend migrating legacy PHP scripts to a clean Python PostgreSQL/Supabase REST API.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
# Allow requests from local dev server and standard production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open endpoints per user request
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(casos.router, prefix="/api/v1/casos", tags=["Casos (Legacy specDate compatibility)"])
app.include_router(personasdesaparecidas.router, prefix="/api/v1/personasdesaparecidas", tags=["Personas Desaparecidas"])
app.include_router(personasfallecidassinidentificar.router, prefix="/api/v1/personasfallecidassinidentificar", tags=["Personas Fallecidas Sin Identificar"])
app.include_router(etiquetas.router, prefix="/api/v1/etiquetas", tags=["Etiquetas"])
app.include_router(fosas.router, prefix="/api/v1/fosas", tags=["Fosas"])
app.include_router(noticias.router, prefix="/api/v1/noticias", tags=["Noticias"])
app.include_router(notebooks.router, prefix="/api/v1/notebooks", tags=["Notebooks (Legacy load/save compatibility)"])

from pydantic import BaseModel

class PasswordPayload(BaseModel):
    password: str

@app.post("/api/v1/check_password", tags=["Password Access Control"])
def check_password(payload: PasswordPayload):
    # Standard passwords as configured in legacy check_password.php
    valid_passwords = ["password1", "password2", "password3"]
    is_valid = payload.password in valid_passwords
    return {"success": is_valid}

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to Tejer.Red Cartografía Semántica API",
        "docs_url": "/docs"
    }
