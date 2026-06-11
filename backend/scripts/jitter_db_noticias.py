import os
import random
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    db_url = "postgresql://postgres.vkvonszkyzfktjxobqmp:qlsBX0qmhyLsSzCi@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

print("Connecting to database:", db_url)

conn = psycopg2.connect(db_url)
try:
    with conn.cursor() as cur:
        # Fetch all news items
        cur.execute("SELECT id, coordenadas, titular FROM noticias WHERE coordenadas IS NOT NULL;")
        rows = cur.fetchall()
        print(f"Found {len(rows)} news items to update.")
        
        updated_count = 0
        for noticia_id, coordenadas, titular in rows:
            try:
                lat_str, lon_str = coordenadas.split(",")
                lat = float(lat_str)
                lon = float(lon_str)
                
                # Apply a random jitter of about ~100-300 meters
                # 0.001 degrees latitude is ~111 meters, 0.001 degrees longitude is ~104 meters at Jalisco latitude
                jitter_lat = random.uniform(-0.0025, 0.0025)
                jitter_lon = random.uniform(-0.0025, 0.0025)
                
                new_lat = lat + jitter_lat
                new_lon = lon + jitter_lon
                
                new_coords = f"{new_lat:.7f},{new_lon:.7f}"
                
                cur.execute(
                    "UPDATE noticias SET coordenadas = %s WHERE id = %s;",
                    (new_coords, noticia_id)
                )
                updated_count += 1
            except Exception as e:
                print(f"Failed to process noticia ID {noticia_id}: {e}")
                
        conn.commit()
        print(f"Successfully updated {updated_count} news items with jittered coordinates in the database.")
finally:
    conn.close()
