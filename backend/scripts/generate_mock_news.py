import os
import random
from datetime import date, timedelta
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Predefined locations (municipalities in Jalisco with coordinates)
LOCATIONS = [
    {"municipio": "Guadalajara", "coordenadas": "20.6720375,-103.338396"},
    {"municipio": "Zapopan", "coordenadas": "20.7211203,-103.3913671"},
    {"municipio": "Tonalá", "coordenadas": "20.6241367,-103.2421263"},
    {"municipio": "San Pedro Tlaquepaque", "coordenadas": "20.6397718,-103.3120428"},
    {"municipio": "Lagos de Moreno", "coordenadas": "21.3552033,-101.9362879"},
    {"municipio": "Puerto Vallarta", "coordenadas": "20.6407176,-105.220306"},
    {"municipio": "Tlajomulco de Zúñiga", "coordenadas": "20.4818737,-103.4005097"},
    {"municipio": "El Salto", "coordenadas": "20.5196964,-103.1813141"},
    {"municipio": "Tala", "coordenadas": "20.651912,-103.702581"}
]

# Sample news headlines and sources
TITULOS = [
    "Colectivos de búsqueda localizan indicios en predio de {municipio}",
    "Reportan despliegue de seguridad tras hallazgo en {municipio}",
    "Familiares de desaparecidos convocan a jornada de búsqueda en {municipio}",
    "FGE Jalisco inicia carpetas de investigación por hechos en {municipio}",
    "Ciudadanos reportan actividad sospechosa cerca de zona de búsqueda en {municipio}",
    "Localizan restos óseos tras reporte anónimo en {municipio}",
    "Colectivo 'Jóvenes Buscadores' realiza rastreo terrestre en {municipio}",
    "Autoridades estatales y federales resguardan finca en {municipio}",
    "Familiares exigen celeridad en identificaciones forenses en {municipio}"
]

FUENTES = [
    "https://www.elinformador.mx/jalisco/noticia-localizada-{id}",
    "https://www.milenio.com/policia/jalisco-busqueda-{id}",
    "https://www.jornada.com.mx/estados/jalisco-reporte-{id}",
    "https://mural.com.mx/comunidad/noticias-seguridad-{id}"
]

db_url = os.getenv("DATABASE_URL")
print("Connecting to:", db_url)

conn = psycopg2.connect(db_url)
try:
    with conn.cursor() as cur:
        # First, clear existing mock news (those with coordinates defined directly)
        cur.execute("DELETE FROM noticias WHERE coordenadas IS NOT NULL;")
        print("Cleared existing geolocated news.")
        
        # Generate 50 mock news items across 2023
        start_date = date(2023, 1, 1)
        end_date = date(2023, 12, 31)
        delta = end_date - start_date
        
        inserted_count = 0
        for i in range(50):
            loc = random.choice(LOCATIONS)
            # Random date in 2023
            random_days = random.randint(0, delta.days)
            fecha = start_date + timedelta(days=random_days)
            
            titular = random.choice(TITULOS).format(municipio=loc["municipio"])
            url = random.choice(FUENTES).format(id=i+1)
            
            # Parse base coordinates and apply small random jitter
            lat_str, lon_str = loc["coordenadas"].split(",")
            lat = float(lat_str)
            lon = float(lon_str)
            
            jitter_lat = random.uniform(-0.0025, 0.0025)
            jitter_lon = random.uniform(-0.0025, 0.0025)
            
            coordenadas = f"{lat + jitter_lat:.7f},{lon + jitter_lon:.7f}"
            
            cur.execute(
                "INSERT INTO noticias (url, titular, fecha, coordenadas) VALUES (%s, %s, %s, %s);",
                (url, titular, fecha, coordenadas)
            )
            inserted_count += 1
            
        conn.commit()
        print(f"Successfully inserted {inserted_count} geolocated mock news items (with random jitter) into database.")
finally:
    conn.close()
