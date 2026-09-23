#!/usr/bin/env python3
"""
sync_inferencia3.py: Sincroniza la tabla repd_vp_inferencia3 desde Supabase a la base local PostgreSQL,
asegurando que solo se inserten registros cuyas cédulas existan en la tabla local cedulas_anonimizadas.
"""
import os
import sys
import psycopg2
from psycopg2.extras import execute_batch

SUPABASE_URL = os.environ.get(
    "SUPABASE_DATABASE_URL",
    "postgresql://postgres.vkvonszkyzfktjxobqmp:qlsBX0qmhyLsSzCi@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
)
LOCAL_DB_URL = os.environ.get(
    "LOCAL_DATABASE_URL",
    "postgresql://tejer_Admin:T3jeEr!-!s@192.168.1.64:5432/cartografia_semantica_db"
)

def sync_inferencia3():
    print("[Sync] Conectando a PostgreSQL Local...", flush=True)
    dst_conn = psycopg2.connect(LOCAL_DB_URL)
    dst_cur = dst_conn.cursor()

    # Obtener los IDs válidos en la base local
    dst_cur.execute("SELECT id_cedula_busqueda FROM cedulas_anonimizadas;")
    valid_cedula_ids = set(r[0] for r in dst_cur.fetchall())
    print(f"[Sync] Cédulas locales registradas: {len(valid_cedula_ids)}", flush=True)

    print("[Sync] Conectando a Supabase...", flush=True)
    src_conn = psycopg2.connect(SUPABASE_URL)
    src_cur = src_conn.cursor()

    print("[Sync] Consultando registros de repd_vp_inferencia3 en Supabase...", flush=True)
    src_cur.execute("""
        SELECT id_cedula_busqueda, tipo_loc, loc, lat_long, fecha, sum_score, violence_score, violence_terms
        FROM repd_vp_inferencia3;
    """)
    records = src_cur.fetchall()
    print(f"[Sync] Obtenidos {len(records)} registros totales desde Supabase.", flush=True)

    # Filtrar solo registros que tienen clave foránea en cedulas_anonimizadas local
    filtered_records = [r for r in records if r[0] in valid_cedula_ids]
    print(f"[Sync] Registros coincidentes con cédulas locales a insertar: {len(filtered_records)}", flush=True)

    insert_sql = """
        INSERT INTO repd_vp_inferencia3 (
            id_cedula_busqueda, tipo_loc, loc, lat_long, fecha, sum_score, violence_score, violence_terms
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id_cedula_busqueda) DO UPDATE SET
            tipo_loc = EXCLUDED.tipo_loc,
            loc = EXCLUDED.loc,
            lat_long = EXCLUDED.lat_long,
            fecha = EXCLUDED.fecha,
            sum_score = EXCLUDED.sum_score,
            violence_score = EXCLUDED.violence_score,
            violence_terms = EXCLUDED.violence_terms;
    """

    print("[Sync] Insertando en base de datos local...", flush=True)
    execute_batch(dst_cur, insert_sql, filtered_records, page_size=500)
    dst_conn.commit()

    dst_cur.execute("SELECT COUNT(*), COUNT(lat_long) FROM repd_vp_inferencia3;")
    total_dst, total_coords = dst_cur.fetchone()
    print(f"[Sync] ¡Éxito! Base de datos local: {total_dst} registros en repd_vp_inferencia3 ({total_coords} con coordenadas válidas).", flush=True)

    src_conn.close()
    dst_conn.close()

if __name__ == "__main__":
    sync_inferencia3()
