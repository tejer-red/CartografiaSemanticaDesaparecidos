#!/usr/bin/env python3
"""
publish_to_supabase.py: Sincroniza las tablas PÚBLICAS HASHEADAS desde la base local (Abeja)
hacia la nube pública (Supabase), garantizando que no se envíen tablas privadas.

Este script es unidireccional: ABEJA -> SUPABASE
"""

import os
import sys
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

LOCAL_DB_URL = os.environ.get("DATABASE_URL") or os.environ.get("LOCAL_DATABASE_URL")
SUPABASE_URL = os.environ.get("SUPABASE_DATABASE_URL")

if not LOCAL_DB_URL:
    raise ValueError("Error: Variable de entorno DATABASE_URL no configurada en .env")
if not SUPABASE_URL:
    raise ValueError("Error: Variable de entorno SUPABASE_DATABASE_URL no configurada en .env")

def get_columns(cur, table_name):
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}';")
    return [row[0] for row in cur.fetchall()]

def sync_table(src_cur, dst_cur, table_name, pk_col):
    print(f"\n[Sync] 🚀 Procesando tabla: {table_name}")
    
    # Obtener columnas comunes (por seguridad, usar columnas de destino)
    columns = get_columns(dst_cur, table_name)
    if not columns:
        print(f"[Sync] ⚠️ Tabla {table_name} no existe en el destino. Saltando.")
        return
        
    cols_str = ", ".join(columns)
    
    # Extraer registros locales
    src_cur.execute(f"SELECT {cols_str} FROM {table_name};")
    records = src_cur.fetchall()
    
    print(f"[Sync] Leídos {len(records)} registros desde Abeja (Local).")
    
    if not records:
        print(f"[Sync] No hay registros para sincronizar en {table_name}.")
        return

    # Preparar el query de Upsert
    placeholders = ", ".join(["%s"] * len(columns))
    
    # ON CONFLICT DO UPDATE
    update_cols = [col for col in columns if col != pk_col]
    update_str = ", ".join([f"{col} = EXCLUDED.{col}" for col in update_cols])
    
    if update_cols:
        upsert_sql = f"""
            INSERT INTO {table_name} ({cols_str}) 
            VALUES ({placeholders})
            ON CONFLICT ({pk_col}) DO UPDATE SET
            {update_str};
        """
    else:
        upsert_sql = f"""
            INSERT INTO {table_name} ({cols_str}) 
            VALUES ({placeholders})
            ON CONFLICT ({pk_col}) DO NOTHING;
        """

    print(f"[Sync] Insertando/Actualizando en Supabase...")
    execute_batch(dst_cur, upsert_sql, records, page_size=500)
    print(f"[Sync] ✅ Sincronización de {table_name} completada.")

def publish():
    print("="*60)
    print("INICIANDO PUBLICACIÓN: ABEJA -> SUPABASE")
    print("="*60)
    
    try:
        print("[Conexión] Conectando a Master Local (Abeja)...")
        src_conn = psycopg2.connect(LOCAL_DB_URL)
        src_cur = src_conn.cursor()

        print("[Conexión] Conectando a Supabase (Público)...")
        dst_conn = psycopg2.connect(SUPABASE_URL)
        dst_cur = dst_conn.cursor()

        # Secuencia estricta por dependencias (Foreign Keys)
        
        # 1. Fosas
        sync_table(src_cur, dst_cur, "fosas", "id")
        dst_conn.commit()
        
        # 2. Cédulas Anonimizadas
        sync_table(src_cur, dst_cur, "cedulas_anonimizadas", "id_cedula_busqueda")
        dst_conn.commit()
        
        # 3. Inferencia Geoespacial
        sync_table(src_cur, dst_cur, "repd_vp_inferencia3", "id_cedula_busqueda")
        dst_conn.commit()
        
        # 4. Noticias (Corpus)
        # La tabla noticias_corpus usa la url como unique key que podría usarse para upsert si no id, pero "id" es PK.
        # Asumiremos que los IDs están en sincronía o usaremos la URL en un ON CONFLICT? 
        # Como estamos replicando, los IDs deberían coincidir.
        sync_table(src_cur, dst_cur, "noticias_corpus", "id")
        dst_conn.commit()
        
        # 5. Vínculos Ontológicos
        sync_table(src_cur, dst_cur, "vinculos_entidades", "id")
        dst_conn.commit()

        print("\n[Exito] 🎉 Sincronización de todas las tablas completada.")

    except Exception as e:
        print(f"\n[Error] Fallo en la sincronización: {e}")
        if 'dst_conn' in locals():
            dst_conn.rollback()
        raise e
    finally:
        if 'src_conn' in locals(): src_conn.close()
        if 'dst_conn' in locals(): dst_conn.close()

if __name__ == "__main__":
    publish()
