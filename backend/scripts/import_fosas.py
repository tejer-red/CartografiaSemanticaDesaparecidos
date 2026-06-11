import os
import csv
from datetime import date
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure we can import from app
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.database import Base
from app.models import Fosa

def import_fosas():
    # Load environment variables
    load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL not found in environment.")
        return

    print("Connecting to database...")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    # Path to CSV file
    csv_path = os.path.join(os.path.dirname(__file__), '../../api/estatal_limpio_with_lat_lng.csv')
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    try:
        # Drop the existing empty fosas table to recreate it with new columns
        print("Dropping existing empty 'fosas' table to update schema...")
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS fosas CASCADE;"))

        # Re-create all tables (this will create 'fosas' with the new columns and re-create relationships)
        print("Re-creating tables with updated schema...")
        Base.metadata.create_all(bind=engine)

        # Make sure id_cedula_busqueda is PK (re-apply in separate transactions so failure doesn't abort the block)
        try:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE cedulas_anonimizadas ALTER COLUMN id_cedula_busqueda SET NOT NULL;'))
                conn.execute(text('ALTER TABLE cedulas_anonimizadas ADD PRIMARY KEY (id_cedula_busqueda);'))
                print("Successfully verified PRIMARY KEY constraint on cedulas_anonimizadas")
        except Exception as pk_err:
            print(f"Info: Primary key constraint check completed (already exists or skipped): {pk_err}")

        try:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE cedulas_anonimizadas ADD COLUMN IF NOT EXISTS fosa_id INTEGER REFERENCES fosas(id) ON DELETE SET NULL;'))
                print("Successfully verified fosa_id column in cedulas_anonimizadas")
        except Exception as fosa_err:
            print(f"Warning: Could not add fosa_id: {fosa_err}")

        print(f"Reading CSV file from {csv_path}...")
        fosas_to_insert = []
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Extract coordinates
                lat = row.get('latitude', '').strip()
                lng = row.get('longitude', '').strip()
                if not lat or not lng:
                    continue
                coordenadas = f"{lat},{lng}"

                # Parse year to date
                year_str = row.get('year', '').strip()
                fecha_hallazgo = None
                if year_str.isdigit():
                    fecha_hallazgo = date(int(year_str), 1, 1)

                # Parse integers
                total_fosas = int(row.get('total_fosas', 0)) if row.get('total_fosas') else 0
                total_cuerpos = int(row.get('total_cuerpos', 0)) if row.get('total_cuerpos') else 0
                total_restos_fragmentos = int(row.get('total_restos_fragmentos', 0)) if row.get('total_restos_fragmentos') else 0

                fosa = Fosa(
                    coordenadas=coordenadas,
                    fecha_hallazgo=fecha_hallazgo,
                    estado=row.get('nom_ent', '').strip(),
                    municipio=row.get('nom_mun', '').strip(),
                    total_fosas=total_fosas,
                    total_cuerpos=total_cuerpos,
                    total_restos_fragmentos=total_restos_fragmentos
                )
                fosas_to_insert.append(fosa)

        if fosas_to_insert:
            print(f"Inserting {len(fosas_to_insert)} fosa records into the database...")
            db.bulk_save_objects(fosas_to_insert)
            db.commit()
            print("Successfully imported all fosa records!")
        else:
            print("No valid fosa records found to insert.")

    except Exception as e:
        db.rollback()
        print(f"Error occurred during import: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import_fosas()
