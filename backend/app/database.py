import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env si existe en el root del proyecto
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Si estamos en testing o no hay DATABASE_URL, usar SQLite local
    if os.getenv("ENVIRONMENT") == "testing" or os.getenv("TESTING") == "true":
        DATABASE_URL = "sqlite:///./cartografia_test.db"
    else:
        DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/cartografia_semantica_db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True, connect_args=connect_args)
except Exception as e:
    # Fallback seguro: si falla psycopg v3, probar psycopg2; o SQLite de emergencia
    alt_url = None
    if DATABASE_URL.startswith("postgresql://"):
        alt_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql+psycopg://"):
        alt_url = DATABASE_URL.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)

    if alt_url:
        try:
            engine = create_engine(alt_url, pool_pre_ping=True, future=True, connect_args=connect_args)
        except Exception:
            fallback_url = "sqlite:///./cartografia_local_fallback.db"
            engine = create_engine(fallback_url, connect_args={"check_same_thread": False}, pool_pre_ping=True, future=True)
    else:
        fallback_url = "sqlite:///./cartografia_local_fallback.db"
        engine = create_engine(fallback_url, connect_args={"check_same_thread": False}, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
