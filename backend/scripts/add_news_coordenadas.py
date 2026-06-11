import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
print("Connecting to:", db_url)

conn = psycopg2.connect(db_url)
try:
    with conn.cursor() as cur:
        # Check if coordinates column already exists
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='noticias' AND column_name='coordenadas';")
        if cur.fetchone():
            print("coordenadas column already exists in table noticias.")
        else:
            print("Adding coordenadas column to table noticias...")
            cur.execute("ALTER TABLE noticias ADD COLUMN coordenadas VARCHAR(100);")
            conn.commit()
            print("Column added successfully.")
finally:
    conn.close()
