import os
import random
import calendar
import datetime
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    db_url = "postgresql://postgres.vkvonszkyzfktjxobqmp:qlsBX0qmhyLsSzCi@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

print("Connecting to database:", db_url)

TITULOS = [
    "Detalles adicionales sobre el hallazgo de la fosa clandestina en {municipio}",
    "Vecinos de {municipio} reportan movilización policial en la zona de búsqueda",
    "Colectivos exigen justicia y pronta identificación de restos en fosa de {municipio}",
    "FGE Jalisco continúa con los peritajes en fosa localizada en {municipio}",
    "Aumentan reportes de prensa relacionados al predio de búsqueda en {municipio}",
    "Autoridades resguardan las inmediaciones del sitio de hallazgo en {municipio}",
    "Comunidad de {municipio} conmocionada tras revelaciones de fosa clandestina"
]

FUENTES = [
    "https://www.elinformador.mx/jalisco/nota-fosa-{fosa_id}-{idx}",
    "https://www.milenio.com/policia/reporte-fosa-{fosa_id}-{idx}",
    "https://www.jornada.com.mx/estados/fosa-jalisco-{fosa_id}-{idx}",
    "https://mural.com.mx/comunidad/nota-seguridad-fosa-{fosa_id}-{idx}"
]

conn = psycopg2.connect(db_url)
try:
    with conn.cursor() as cur:
        # 1. Clear all existing news records
        print("Deleting all existing news articles...")
        cur.execute("DELETE FROM noticias;")
        
        # 2. Fetch all existing graves (fosas)
        print("Fetching all graves (fosas)...")
        cur.execute("SELECT id, coordenadas, fecha_hallazgo, municipio FROM fosas;")
        fosas = cur.fetchall()
        print(f"Loaded {len(fosas)} graves.")
        
        total_news_inserted = 0
        
        for fosa_id, coordenadas, fecha_hallazgo, municipio in fosas:
            if not coordenadas:
                continue
                
            try:
                lat_str, lon_str = coordenadas.split(",")
                lat = float(lat_str)
                lon = float(lon_str)
            except Exception as e:
                print(f"Skipping fosa ID {fosa_id} due to invalid coordinates format: '{coordenadas}': {e}")
                continue
            
            # Base date: use fecha_hallazgo if set, otherwise fallback to 2023-01-01
            base_date = fecha_hallazgo if fecha_hallazgo else datetime.date(2023, 1, 1)
            
            # Calculate start and end of the next calendar month
            year = base_date.year
            month = base_date.month + 1
            if month > 12:
                month = 1
                year += 1
            
            _, last_day = calendar.monthrange(year, month)
            start_of_next_month = datetime.date(year, month, 1)
            end_of_next_month = datetime.date(year, month, last_day)
            
            # Generate 3 to 4 news articles around this fosa
            num_articles = random.randint(3, 4)
            municipio_name = municipio if municipio else "Jalisco"
            
            delta_days = (end_of_next_month - start_of_next_month).days
            
            for idx in range(num_articles):
                # Random date in the next month
                random_day_offset = random.randint(0, delta_days)
                fecha_noticia = start_of_next_month + datetime.timedelta(days=random_day_offset)
                
                # Jitter coordinates slightly around the fosa location
                # Offset in range [-0.0035, 0.0035] degrees (approx 100-400 meters)
                jitter_lat = random.uniform(-0.0035, 0.0035)
                jitter_lon = random.uniform(-0.0035, 0.0035)
                
                new_lat = lat + jitter_lat
                new_lon = lon + jitter_lon
                
                new_coords = f"{new_lat:.7f},{new_lon:.7f}"
                
                titular = random.choice(TITULOS).format(municipio=municipio_name)
                url = random.choice(FUENTES).format(fosa_id=fosa_id, idx=idx+1)
                
                cur.execute(
                    "INSERT INTO noticias (url, titular, fecha, coordenadas, fosa_id) VALUES (%s, %s, %s, %s, %s);",
                    (url, titular, fecha_noticia, new_coords, fosa_id)
                )
                total_news_inserted += 1
                
        conn.commit()
        print(f"Successfully deleted old news and created {total_news_inserted} new news articles around all {len(fosas)} graves in the database.")
finally:
    conn.close()
