#!/usr/bin/env python3
"""Data migration script: MySQL (or MariaDB) → PostgreSQL (Supabase)

This script connects to the legacy database using credentials from a `.env` file
and copies all tables to the new PostgreSQL instance. It uses SQLAlchemy reflection
to discover the legacy schema, creates the same tables in PostgreSQL (if they do not
already exist), and performs bulk inserts.
"""

import os
import sys
from pathlib import Path
from typing import List

from sqlalchemy import create_engine, MetaData, Table, inspect, text
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

# Legacy MySQL connection (using pymysql driver)
OLD_DB_HOST = os.getenv("OLD_DB_HOST")
OLD_DB_USER = os.getenv("OLD_DB_USER")
OLD_DB_PASSWORD = os.getenv("OLD_DB_PASSWORD")
OLD_DB_NAME = os.getenv("OLD_DB_NAME")
OLD_DB_PORT = os.getenv("OLD_DB_PORT", "3306")

if not all([OLD_DB_HOST, OLD_DB_USER, OLD_DB_PASSWORD, OLD_DB_NAME]):
    sys.stderr.write("[ERROR] Missing one or more OLD_DB_* environment variables.\n")
    sys.exit(1)

legacy_url = (
    f"mysql+pymysql://{OLD_DB_USER}:{OLD_DB_PASSWORD}@{OLD_DB_HOST}:{OLD_DB_PORT}/{OLD_DB_NAME}"
)
legacy_engine = create_engine(legacy_url)
LegacyMeta = MetaData()
LegacyMeta.reflect(bind=legacy_engine)

# New PostgreSQL connection (using psycopg2 driver)
NEW_DATABASE_URL = os.getenv("NEW_DATABASE_URL")
if not NEW_DATABASE_URL:
    sys.stderr.write("[ERROR] NEW_DATABASE_URL not set in .env.\n")
    sys.exit(1)

new_engine = create_engine(NEW_DATABASE_URL)
NewMeta = MetaData()

# ---------------------------------------------------------------------------
# Helper: copy a single table
# ---------------------------------------------------------------------------
def copy_table(table_name: str, inspector) -> None:
    legacy_table: Table = Table(table_name, LegacyMeta, autoload_with=legacy_engine)

    # Check if table exists in PostgreSQL
    if not inspector.has_table(table_name):
        print(f"[INFO] Creating table '{table_name}' in PostgreSQL.")
        new_table = legacy_table.tometadata(NewMeta)
        # Rename indexes to prevent global index name conflicts in PostgreSQL
        for index in list(new_table.indexes):
            index.name = f"idx_{table_name}_{index.name}"
        NewMeta.tables[table_name].create(new_engine)
    else:
        print(f"[INFO] Table '{table_name}' already exists in PostgreSQL – will append data.")
        # Load the existing table metadata
        NewMeta.reflect(bind=new_engine, only=[table_name])

    # Fetch all rows from legacy DB
    with legacy_engine.connect() as conn:
        result = conn.execute(legacy_table.select())
        rows = result.fetchall()
        columns = result.keys()

    if not rows:
        print(f"[WARN] No data found in table '{table_name}'. Skipping.")
        return

    # Insert into PostgreSQL using SQLAlchemy core bulk insert
    with new_engine.connect() as conn:
        target_table = NewMeta.tables[table_name]
        insert_stmt = target_table.insert()
        # Convert RowProxy / Tuple objects to plain dicts
        data_dicts: List[dict] = [dict(zip(columns, row)) for row in rows]
        conn.execute(insert_stmt, data_dicts)
        conn.commit()
    print(f"[SUCCESS] Migrated {len(rows)} rows into '{table_name}'.")

# ---------------------------------------------------------------------------
# Main migration loop
# ---------------------------------------------------------------------------
def main() -> None:
    tables = LegacyMeta.tables.keys()
    if not tables:
        print("[ERROR] No tables detected in the legacy database.")
        return
        
    inspector = inspect(new_engine)
    print(f"[INFO] Cleaning up target PostgreSQL legacy tables to ensure clean migration...")
    with new_engine.connect() as conn:
        for tbl in tables:
            if inspector.has_table(tbl):
                print(f"[INFO] Dropping existing table '{tbl}' in PostgreSQL.")
                conn.execute(text(f'DROP TABLE IF EXISTS "{tbl}" CASCADE'))
                conn.commit()
    
    # Re-initialize inspector after dropping tables
    inspector = inspect(new_engine)

    print(f"[INFO] Found {len(tables)} tables to migrate: {', '.join(tables)}")
    for tbl in tables:
        try:
            copy_table(tbl, inspector)
        except Exception as exc:
            print(f"[ERROR] Failed to migrate table '{tbl}': {exc}")

if __name__ == "__main__":
    main()
