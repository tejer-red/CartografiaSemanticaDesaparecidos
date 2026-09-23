#!/usr/bin/env python3
"""
Script de inicialización de tablas mediante SQLAlchemy para cartografia_semantica_db.
Crea todas las tablas definidas en models.py si no existen.
"""

import sys
import os

# Asegurar que el path incluya el root de backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.app.database import engine, Base
from backend.app.models import (
    Caso, Inferencia3, Sena, PersonaFallecidaSinIdentificar,
    Etiqueta, Fosa, Noticia, Notebook, CedulaPrivada, PiiHashRegistry, VinculoEntidad
)

def main():
    print("[INFO] Conectando a la base de datos...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] Todas las tablas de Cartografía Semántica (4 Capas) han sido creadas o verificadas exitosamente.")
    except Exception as e:
        print(f"[ERROR] Error al crear tablas: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
