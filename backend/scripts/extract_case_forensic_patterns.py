#!/usr/bin/env python3
"""
extract_case_forensic_patterns.py: Extractor Forense y Ontológico de Patrones Criminales,
Dinámicas de Captación/Fuga y Entornos Institucionales (Albergues, Anexos, Indicios Escritos)
desde la narrativa original de las cédulas de búsqueda de Jalisco.

Utiliza inferencia concurrente multihilo contra el LLM local en GPU (Qwen2.5-Coder-14B / vLLM).
"""

import os
import sys
import json
import time
import re
import urllib.request
import concurrent.futures
from typing import Dict, Any, List, Optional
from sqlalchemy import create_engine, text

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ.get("DB_USER", "postgres")
    pwd = os.environ.get("DB_PASSWORD", "")
    name = os.environ.get("DB_NAME", "cartografia_semantica_db")
    DB_URL = f"postgresql://{user}:{pwd}@{host}:{port}/{name}" if pwd else f"postgresql://{user}@{host}:{port}/{name}"

LLM_API_URL = os.environ.get("LLM_API_URL", "http://localhost:8000/v1/chat/completions")
MODEL_NAME = os.environ.get("MODEL_NAME", "qwen-coder")
DEFAULT_WORKERS = 6  # Balance ideal entre latencia y paralelismo en GPU RTX


def normalize_vehicle_term(term: Optional[str]) -> str:
    """Normaliza colores y tipos para evitar fragmentación de nodos."""
    if not term:
        return ""
    t = term.strip().upper()
    color_map = {
        "BLANCA": "BLANCO",
        "NEGRA": "NEGRO",
        "ROJA": "ROJO",
        "AZUL_MARINO": "AZUL",
        "AZUL_CLARO": "AZUL",
        "GRIS_OSCURO": "GRIS",
        "GRIS_PLATA": "GRIS",
        "PLATA": "GRIS",
        "PLATEADO": "GRIS",
        "PLATEADA": "GRIS",
        "OBSCURO": "OSCURO",
        "VERDE_OBSCURO": "VERDE",
        "VERDE_OSCURO": "VERDE",
        "TINTO": "ROJO",
        "GUINDA": "ROJO",
        "VINO": "ROJO",
        "DORADA": "DORADO",
        "AMARILLA": "AMARILLO",
        "ARENA": "BEIGE",
    }
    for k, v in color_map.items():
        t = re.sub(rf'\b{k}\b', v, t)
    return t


def clean_slug(text_val: str) -> str:
    """Normaliza texto para IDs de nodos en el grafo con canonicidad."""
    norm = normalize_vehicle_term(text_val)
    norm = re.sub(r'[^A-Za-z0-9_]', '_', norm.upper())
    return re.sub(r'_+', '_', norm).strip('_')


def call_local_llm(prompt: str, system_prompt: str) -> Optional[Dict[str, Any]]:
    """Invoca a vLLM en la GPU y extrae el JSON estructurado."""
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 650
    }
    req = urllib.request.Request(
        LLM_API_URL,
        headers={"Content-Type": "application/json"},
        data=json.dumps(payload).encode("utf-8")
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                lines = content.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
            return json.loads(content)
    except Exception as e:
        return None


SYSTEM_PROMPT = """Eres un Perito Criminólogo Forense y Analista de Inteligencia en Desapariciones en México.
Tu tarea es analizar minuciosamente la narrativa original de una cédula de búsqueda y extraer de forma rigurosa las entidades operativas, el contexto del hecho y los indicios dejados.

Debes extraer EXCLUSIVAMENTE un objeto JSON válido con las siguientes claves:
{
  "modus_operandi_tipo": "LEVANTÓN_FORZADO" | "ENGANO_LABORAL" | "EVASION_DE_ALBERGUE_O_ANEXO" | "TRAYECTO_HABITUAL" | "PARTIDA_VOLUNTARIA_CON_RECADO" | "CONFLICTO_O_AMENAZA_PREVIA" | "DETENCION_APOCRIFA" | "DESCONOCIDO",
  "lugar_tipo": "ALBERGUE" | "ANEXO_REHABILITACION" | "CASA_HOGAR" | "DOMICILIO_PARTICULAR" | "VIA_PUBLICA" | "LUGAR_TRABAJO" | "OTRO" | "DESCONOCIDO",
  "nombre_lugar_institucion": "Nombre comercial o institucional si fue albergue, anexo, centro de ayuda, negocio o empresa (ej: 'ALBERGUE REMAR OCCIDENTE', 'ANEXO CASA ROSA'), o null",
  "indicio_dejado": "CARTA_MANUSCRITA" | "RECADO_O_NOTA" | "MENSAJE_AUDIO_O_WHATSAPP" | "ROPA_O_OBJETOS_ABANDONADOS" | "NINGUNO",
  "contenido_indicio": "Cita o resumen de lo que decía la carta, recado o mensaje (ej: 'dejó nota diciendo que no la busquen y que iría a Zacatecas'), o null",
  "destino_declarado": "Estado o ciudad hacia donde se dirigía o decía trasladarse (ej: 'ZACATECAS', 'GUADALAJARA', 'ZONA INDUSTRIAL'), o null",
  "vehiculo_victima": {
    "menciona": true | false,
    "tipo": "AUTO" | "MOTO" | "CAMIONETA" | "BICICLETA" | "NINGUNO",
    "marca": "string o null",
    "modelo": "string o null",
    "color": "string o null",
    "placas": "string o null"
  },
  "vehiculo_perpetradores": {
    "menciona": true | false,
    "tipo": "CAMIONETA" | "SEDAN" | "MOTO" | "NINGUNO",
    "marca": "string o null",
    "color": "string o null",
    "detalles": "string o null"
  },
  "armas_observadas": "ARMAS_LARGAS" | "ARMAS_CORTAS" | "ARMAS_BLANCAS" | "NO_REFIERE",
  "num_perpetradores": "1" | "2-3" | "COMANDO_4+" | "NO_REFIERE",
  "reportante_parentesco": "MADRE" | "PADRE" | "HERMANO/A" | "HIJO/A" | "ESPOSO/A" | "CONCUBINO/A" | "VECINO/A" | "AMIGO/A" | "CUIDADOR_O_DIRECTOR" | "AUTORIDAD" | "OTRO",
  "acompanantes_desaparecidos": ["lista de nombres o menciones de otras víctimas que desaparecieron al mismo tiempo en el hecho, o []"],
  "resumen_forense": "Síntesis objetiva y criminalística del hecho en 1 o 2 oraciones."
}"""


def process_single_case(engine, row_data) -> bool:
    """Procesa una cédula individual y guarda sus aristas ontológicas."""
    c_id, c_mpio, c_col, c_fecha, c_nombre, c_texto = row_data
    c_mpio = c_mpio or ""
    c_col = c_col or ""
    c_fecha = c_fecha or ""
    c_nombre = c_nombre or ""
    c_texto = c_texto or ""

    prompt_user = f"""ANALIZA LA SIGUIENTE NARRATIVA FORENSE:
Expediente ID: {c_id}
Persona desaparecida: {c_nombre}
Fecha del hecho: {c_fecha}
Municipio/Colonia: {c_col}, {c_mpio}
Narrativa original:
\"\"\"{c_texto}\"\"\"

Extrae los vehículos, armas, lugar o albergue/anexo si aplica, indicios dejados (cartas/recados), destino y el modus operandi."""

    t0 = time.time()
    res_json = call_local_llm(prompt_user, SYSTEM_PROMPT)
    dt = time.time() - t0

    if not res_json:
        return False

    modus = res_json.get("modus_operandi_tipo", "DESCONOCIDO")
    lugar_tipo = res_json.get("lugar_tipo", "DESCONOCIDO")
    nombre_inst = res_json.get("nombre_lugar_institucion")
    indicio = res_json.get("indicio_dejado", "NINGUNO")
    cont_indicio = res_json.get("contenido_indicio")
    destino = res_json.get("destino_declarado")
    veh_vic = res_json.get("vehiculo_victima", {})
    veh_perp = res_json.get("vehiculo_perpetradores", {})
    armas = res_json.get("armas_observadas", "NO_REFIERE")
    num_perp = res_json.get("num_perpetradores", "NO_REFIERE")
    parentesco = res_json.get("reportante_parentesco", "OTRO")
    acomp = res_json.get("acompanantes_desaparecidos", [])
    resumen = res_json.get("resumen_forense", "")

    # 1. Guardar en caso_patrones_forenses
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO caso_patrones_forenses (
                caso_id, modus_operandi_tipo, vehiculo_victima, vehiculo_perpetradores,
                armas_observadas, num_perpetradores, reportante_parentesco,
                acompanantes_desaparecidos, resumen_forense, lugar_tipo,
                nombre_lugar_institucion, indicio_dejado, contenido_indicio,
                destino_declarado, raw_json, created_at
            ) VALUES (
                :caso_id, :modus, :v_vic, :v_perp,
                :armas, :num_p, :parentesco,
                :acomp, :resumen, :lugar_t,
                :nom_inst, :indicio_d, :cont_ind,
                :destino_d, :raw, NOW()
            )
            ON CONFLICT (caso_id) DO UPDATE SET
                modus_operandi_tipo = EXCLUDED.modus_operandi_tipo,
                vehiculo_victima = EXCLUDED.vehiculo_victima,
                vehiculo_perpetradores = EXCLUDED.vehiculo_perpetradores,
                armas_observadas = EXCLUDED.armas_observadas,
                num_perpetradores = EXCLUDED.num_perpetradores,
                reportante_parentesco = EXCLUDED.reportante_parentesco,
                acompanantes_desaparecidos = EXCLUDED.acompanantes_desaparecidos,
                resumen_forense = EXCLUDED.resumen_forense,
                lugar_tipo = EXCLUDED.lugar_tipo,
                nombre_lugar_institucion = EXCLUDED.nombre_lugar_institucion,
                indicio_dejado = EXCLUDED.indicio_dejado,
                contenido_indicio = EXCLUDED.contenido_indicio,
                destino_declarado = EXCLUDED.destino_declarado,
                raw_json = EXCLUDED.raw_json;
        """), {
            "caso_id": c_id,
            "modus": modus,
            "v_vic": json.dumps(veh_vic, ensure_ascii=False),
            "v_perp": json.dumps(veh_perp, ensure_ascii=False),
            "armas": armas,
            "num_p": num_perp,
            "parentesco": parentesco,
            "acomp": json.dumps(acomp, ensure_ascii=False),
            "resumen": resumen,
            "lugar_t": lugar_tipo,
            "nom_inst": nombre_inst,
            "indicio_d": indicio,
            "cont_ind": cont_indicio,
            "destino_d": destino,
            "raw": json.dumps(res_json, ensure_ascii=False)
        })

        # 2. Generar aristas de hiper-grafo en vinculos_entidades
        # A) Vínculo de Modus Operandi
        if modus and modus != "DESCONOCIDO":
            conn.execute(text("""
                INSERT INTO vinculos_entidades 
                (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                VALUES (:src, 'CASO', :tgt, 'MODUS', 'MODUS_OPERANDI', 1.0, 'APROBADO', :meta, NOW())
                ON CONFLICT DO NOTHING;
            """), {
                "src": f"CASO_{c_id}",
                "tgt": f"MODUS_{modus}",
                "meta": json.dumps({"modus": modus, "resumen": resumen}, ensure_ascii=False)
            })

        # B) Vínculo con Institución, Albergue o Anexo (Clúster institucional)
        if nombre_inst and len(nombre_inst.strip()) > 3:
            inst_slug = clean_slug(nombre_inst)
            conn.execute(text("""
                INSERT INTO vinculos_entidades 
                (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                VALUES (:src, 'CASO', :tgt, 'INSTITUCION', 'INSTITUCION_LUGAR', 1.0, 'APROBADO', :meta, NOW())
                ON CONFLICT DO NOTHING;
            """), {
                "src": f"CASO_{c_id}",
                "tgt": f"INST_{inst_slug}",
                "meta": json.dumps({"institucion": nombre_inst, "tipo": lugar_tipo, "municipio": c_mpio}, ensure_ascii=False)
            })

        # C) Vínculo con Indicios Materiales (Cartas, Recados, Mensajes)
        if indicio and indicio != "NINGUNO":
            conn.execute(text("""
                INSERT INTO vinculos_entidades 
                (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                VALUES (:src, 'CASO', :tgt, 'EVIDENCIA_MATERIAL', 'INDICIOS_EN_SITIO', 1.0, 'APROBADO', :meta, NOW())
                ON CONFLICT DO NOTHING;
            """), {
                "src": f"CASO_{c_id}",
                "tgt": f"INDICIO_{indicio}",
                "meta": json.dumps({"indicio": indicio, "contenido": cont_indicio}, ensure_ascii=False)
            })

        # D) Vínculo con Destino Declarado
        if destino and len(destino.strip()) > 2:
            dest_slug = clean_slug(destino)
            conn.execute(text("""
                INSERT INTO vinculos_entidades 
                (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                VALUES (:src, 'CASO', :tgt, 'DESTINO', 'DESTINO_DECLARADO', 0.9, 'APROBADO', :meta, NOW())
                ON CONFLICT DO NOTHING;
            """), {
                "src": f"CASO_{c_id}",
                "tgt": f"DEST_{dest_slug}",
                "meta": json.dumps({"destino": destino}, ensure_ascii=False)
            })

        # E) Vehículo Perpetradores
        if veh_perp.get("menciona") and veh_perp.get("tipo") != "NINGUNO":
            tipo_p = veh_perp.get("tipo", "VEHICULO")
            color_p = veh_perp.get("color") or ""
            marca_p = veh_perp.get("marca") or ""
            v_slug = clean_slug(f"{tipo_p}_{color_p}_{marca_p}")
            if len(v_slug) > 3:
                conn.execute(text("""
                    INSERT INTO vinculos_entidades 
                    (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                    VALUES (:src, 'CASO', :tgt, 'VEHICULO_SOSPECHOSO', 'PERPETRADO_CON_VEHICULO', 0.95, 'APROBADO', :meta, NOW())
                    ON CONFLICT DO NOTHING;
                """), {
                    "src": f"CASO_{c_id}",
                    "tgt": f"VEH_PERP_{v_slug}",
                    "meta": json.dumps({"vehiculo": veh_perp, "municipio": c_mpio, "colonia": c_col}, ensure_ascii=False)
                })

        # F) Vehículo Víctima
        if veh_vic.get("menciona") and veh_vic.get("tipo") != "NINGUNO":
            tipo_v = veh_vic.get("tipo", "VEHICULO")
            color_v = veh_vic.get("color") or ""
            marca_v = veh_vic.get("marca") or ""
            v_slug_vic = clean_slug(f"{tipo_v}_{color_v}_{marca_v}")
            if len(v_slug_vic) > 3:
                conn.execute(text("""
                    INSERT INTO vinculos_entidades 
                    (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                    VALUES (:src, 'CASO', :tgt, 'VEHICULO_VICTIMA', 'VIAJABA_EN_VEHICULO', 1.0, 'APROBADO', :meta, NOW())
                    ON CONFLICT DO NOTHING;
                """), {
                    "src": f"CASO_{c_id}",
                    "tgt": f"VEH_VIC_{v_slug_vic}",
                    "meta": json.dumps({"vehiculo": veh_vic, "municipio": c_mpio, "colonia": c_col}, ensure_ascii=False)
                })

        # G) Parentesco Reportante
        if parentesco and parentesco not in ("OTRO", "AUTORIDAD"):
            conn.execute(text("""
                INSERT INTO vinculos_entidades 
                (source_node, source_type, target_node, target_type, relation_type, confidence_score, estado_aprobacion, metadata_relacion, created_at)
                VALUES (:src, 'CASO', :tgt, 'PARENTESCO', 'REPORTE_POR_FAMILIAR', 1.0, 'APROBADO', :meta, NOW())
                ON CONFLICT DO NOTHING;
            """), {
                "src": f"CASO_{c_id}",
                "tgt": f"ROL_{clean_slug(parentesco)}",
                "meta": json.dumps({"parentesco": parentesco}, ensure_ascii=False)
            })

    msg = f"✅ {c_id[:8]}... | Modus: {modus} | Lugar: {lugar_tipo} | Denuncia: {parentesco} [{dt:.2f}s]"
    if nombre_inst:
        msg += f" | 🏢 Inst: {nombre_inst}"
    if indicio != "NINGUNO":
        msg += f" | ✉️ Indicio: {indicio}"
    print(msg, flush=True)
    return True


def process_batch(batch_size: int = 5600, workers: int = DEFAULT_WORKERS):
    print("=" * 80)
    print("🚗 INICIANDO EXTRACCIÓN FORENSE MULTIHILO (RAG-ONTOLOGY COMPLETO)")
    print(f"Base de datos: {DB_URL}")
    print(f"Workers concurrentes: {workers}")
    print(f"Lote máximo a procesar: {batch_size} registros")
    print("=" * 80)

    engine = create_engine(DB_URL, pool_size=workers + 2, max_overflow=5)

    fetch_sql = text("""
        SELECT p.id, p.municipio, p.colonia, p.fecha_desaparicion, p.nombre_real, p.text_original
        FROM cedulas_privadas p
        WHERE NOT EXISTS (
            SELECT 1 FROM caso_patrones_forenses f WHERE f.caso_id = p.id
        )
        ORDER BY p.fecha_desaparicion DESC NULLS LAST
        LIMIT :limit
    """)

    with engine.connect() as conn:
        rows = conn.execute(fetch_sql, {"limit": batch_size}).fetchall()

    if not rows:
        print("[!] No hay más cédulas pendientes por procesar.")
        return

    print(f"[*] Cédulas cargadas para este lote: {len(rows)}\n")

    exitos = 0
    t_start = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_case = {
            executor.submit(process_single_case, engine, r): r[0] 
            for r in rows
        }
        for idx, future in enumerate(concurrent.futures.as_completed(future_to_case), 1):
            c_uuid = future_to_case[future]
            try:
                ok = future.result()
                if ok:
                    exitos += 1
            except Exception as exc:
                print(f"[WARN] Excepción procesando caso {c_uuid}: {exc}")

            if idx % 50 == 0 or idx == len(rows):
                elapsed = time.time() - t_start
                rate = exitos / max(elapsed, 0.1)
                eta_min = ((len(rows) - idx) / max(rate, 0.01)) / 60
                print(f"\n--- Progreso: {idx}/{len(rows)} ({100*idx/len(rows):.1f}%) | Velocidad: {rate:.2f} casos/s | ETA: {eta_min:.1f} min ---\n", flush=True)

    total_time = time.time() - t_start
    print("-" * 80)
    print(f"🏁 Lote procesado: {exitos}/{len(rows)} exitosos en {total_time/60:.2f} min ({exitos/max(total_time,1):.2f} casos/s).")
    print("-" * 80)


if __name__ == "__main__":
    count = 5600
    w = DEFAULT_WORKERS
    if len(sys.argv) > 1:
        try:
            count = int(sys.argv[1])
        except ValueError:
            pass
    if len(sys.argv) > 2:
        try:
            w = int(sys.argv[2])
        except ValueError:
            pass
    process_batch(batch_size=count, workers=w)
