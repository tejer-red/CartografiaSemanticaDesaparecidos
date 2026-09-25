#!/usr/bin/env python3
"""
ontology.py: Endpoints REST para consulta del Grafo Semántico (Lazy-Load y Súper-Nodos).
"""

from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Caso, Noticia, Fosa, VinculoEntidad, NoticiaCorpus, CedulaPrivada, PiiHashRegistry
from backend.app.ontology.matcher import ontology_matcher_service
from backend.app.ontology.models import SemanticGraphResponse, GraphNode, GraphEdge, COLOR_MAP

router = APIRouter(prefix="/ontology", tags=["Ontología y Grafo Semántico"])


@router.get("/subgraph", response_model=SemanticGraphResponse)
def get_subgraph_lazy(
    center_id: str = Query(..., description="ID del nodo central (caso, noticia o fosa)"),
    depth: int = Query(default=1, ge=1, le=3, description="Grados de separación"),
    db: Session = Depends(get_db)
):
    """
    Devuelve el sub-grafo perezoso (Lazy-load) centrado en un nodo específico para Sigma.js.
    Evita saturar la memoria y el hilo principal del navegador.
    """
    try:
        # Cargar vínculos persistidos desde la base de datos
        db_edges = db.query(VinculoEntidad).filter(
            (VinculoEntidad.source_node == center_id) | (VinculoEntidad.target_node == center_id)
        ).all()

        edges_pool = []
        node_ids = {center_id}

        for e in db_edges:
            edges_pool.append({
                "id": str(e.id),
                "source": e.source_node,
                "target": e.target_node,
                "label": e.relation_type,
                "confidence": e.confidence_score,
                "estado": e.estado_aprobacion,
                "color": "#9d4edd" if e.estado_aprobacion == "SUGERIDO" else "#457b9d"
            })
            node_ids.add(e.source_node)
            node_ids.add(e.target_node)

        # Construir nodos
        nodes_pool = []
        for nid in node_ids:
            ntype = "PERSONA" if "CASO" in nid or "caso" in nid else ("NOTICIA" if "noticia" in nid else "HASH_DOMICILIO")
            nodes_pool.append({
                "id": nid,
                "label": nid,
                "type": ntype,
                "x": 0.0,
                "y": 0.0,
                "size": 18.0 if nid == center_id else 10.0,
                "color": COLOR_MAP.get(ntype, "#4a4e69")
            })

        return ontology_matcher_service.build_subgraph_lazy(
            center_id=center_id,
            depth=depth,
            nodes_pool=nodes_pool,
            edges_pool=edges_pool
        )
    except Exception:
        # Fallback si no hay BD conectada
        mock_nodes = [
            {"id": center_id, "label": f"Nodo {center_id}", "type": "PERSONA", "size": 18.0, "color": COLOR_MAP["PERSONA"]},
            {"id": f"hash_dom_{center_id[:6]}", "label": "[DOMICILIO_HASH_a8f3b]", "type": "HASH_DOMICILIO", "size": 12.0, "color": COLOR_MAP["HASH_DOMICILIO"]},
            {"id": f"noticia_hallazgo_{center_id[:4]}", "label": "Noticia: Hallazgo en Tlaquepaque", "type": "NOTICIA", "size": 12.0, "color": COLOR_MAP["NOTICIA"]}
        ]
        mock_edges = [
            {"id": "e1", "source": center_id, "target": f"hash_dom_{center_id[:6]}", "label": "OCURRIO_EN", "confidence": 1.0, "estado": "APROBADO"},
            {"id": "e2", "source": f"hash_dom_{center_id[:6]}", "target": f"noticia_hallazgo_{center_id[:4]}", "label": "MENCIONA_ZONA", "confidence": 0.85, "estado": "APROBADO"}
        ]
        return SemanticGraphResponse(
            nodes=mock_nodes,
            edges=mock_edges,
            total_nodes=len(mock_nodes),
            total_edges=len(mock_edges),
            cluster_mode=False
        )


@router.get("/supernodes", response_model=SemanticGraphResponse)
def get_supernodes_clustering(db: Session = Depends(get_db)):
    """
    Devuelve la vista de Súper-Nodos / Clustering Semántico por municipio para el visualizador de red global.
    """
    try:
        casos = db.query(Caso.municipio).filter(Caso.municipio.isnot(None)).all()
        cases_list = [{"municipio": c.municipio} for c in casos]
    except Exception:
        cases_list = [
            {"municipio": "GUADALAJARA"}, {"municipio": "GUADALAJARA"},
            {"municipio": "ZAPOPAN"}, {"municipio": "ZAPOPAN"},
            {"municipio": "SAN PEDRO TLAQUEPAQUE"}, {"municipio": "TLAJOMULCO DE ZÚÑIGA"}
        ]

    return ontology_matcher_service.build_cluster_supernodes(cases_list)


@router.get("/graph", response_model=SemanticGraphResponse)
def get_full_semantic_graph(
    limit_edges: int = Query(default=300, ge=10, le=2000),
    include_empty: bool = Query(default=False, description="Incluir casos archivados sin noticia (OSINT_EMPTY)"),
    anonymized: bool = Query(default=True, description="Mostrar nombres y datos de cédulas anonimizados bajo hashes criptográficos"),
    db: Session = Depends(get_db)
):
    """
    Devuelve el grafo semántico consolidado para visualización interactiva.
    Incluye metadata contextual completa para PERSONA/CASO (con soporte de anonimización PII),
    cuerpo completo y entidades NER estructuradas para NOTICIA, y vínculos con FOSA y DOMICILIOS.
    """
    import math
    import re
    from backend.app.models import CedulaPrivada, PiiHashRegistry, Caso, Fosa

    news_relation_types = ['POSIBLE_HALLAZGO_RELACIONADO', 'MENCIONADO_EN_NOTICIA']
    if include_empty:
        news_relation_types.append('REVISADO_SIN_NOTICIA')

    query = db.query(VinculoEntidad).filter(
        VinculoEntidad.relation_type.in_(news_relation_types)
    )
    if not include_empty:
        query = query.filter(
            VinculoEntidad.target_node != 'OSINT_EMPTY',
            VinculoEntidad.relation_type != 'REVISADO_SIN_NOTICIA'
        )

    edges = query.order_by(VinculoEntidad.id.desc()).limit(limit_edges).all()

    node_ids = set()
    edges_pool = []
    for e in edges:
        edges_pool.append({
            "id": str(e.id),
            "source": e.source_node,
            "target": e.target_node,
            "label": e.relation_type,
            "confidence": e.confidence_score,
            "estado": e.estado_aprobacion,
            "color": "#9d4edd" if e.estado_aprobacion == "SUGERIDO" else "#457b9d"
        })
        node_ids.add(e.source_node)
        node_ids.add(e.target_node)

    # 1. Precargar información contextual por lotes para enriquecer cada nodo
    caso_uuids = [
        nid.replace("CASO_", "").replace("cedula_", "") 
        for nid in node_ids 
        if "CASO_" in nid or "cedula_" in nid
    ]
    noticia_ids = []
    for nid in node_ids:
        if "NOTICIA_" in nid:
            try:
                noticia_ids.append(int(nid.replace("NOTICIA_", "")))
            except Exception:
                pass
    corpus_ids = []
    for nid in node_ids:
        if "corpus_" in nid:
            try:
                corpus_ids.append(int(nid.replace("corpus_", "")))
            except Exception:
                pass
    fosa_ids = []
    for nid in node_ids:
        if "FOSA_" in nid or "fosa_" in nid:
            try:
                fosa_ids.append(int(nid.replace("FOSA_", "").replace("fosa_", "")))
            except Exception:
                pass
    pii_hash_ids = [nid for nid in node_ids if "HASH_" in nid or "DOMICILIO_" in nid or "NOMBRE_" in nid]

    # Diccionarios de enriquecimiento
    casos_meta = {}
    if caso_uuids:
        # Cargar tanto tabla pública anonimizada (Caso) como privada (CedulaPrivada)
        ca_rows = db.query(Caso).filter(Caso.id_cedula_busqueda.in_(caso_uuids)).all()
        ca_map = {c.id_cedula_busqueda: c for c in ca_rows}

        cp_rows = db.query(CedulaPrivada).filter(CedulaPrivada.id.in_(caso_uuids)).all()
        cp_map = {c.id: c for c in cp_rows}

        for cid in caso_uuids:
            ca = ca_map.get(cid)
            cp = cp_map.get(cid)

            # Extraer entidades hasheadas del texto anonimizado
            domicilio_hashes = []
            if ca and ca.descripcion_desaparicion:
                domicilio_hashes = re.findall(r'\[(DOMICILIO_HASH_[a-f0-9]+)\]', ca.descripcion_desaparicion)

            if anonymized:
                # MODO ANÓNIMO: Respetar hashes y privacidad
                nombre_display = (ca.nombre_completo if ca and ca.nombre_completo else f"Caso {cid[:8]}")
                desc_display = (ca.descripcion_desaparicion if ca and ca.descripcion_desaparicion else (cp.text_original[:600] if cp else ""))
                meta = {
                    "nombre_anonimizado": nombre_display,
                    "municipio": ca.municipio if ca else (cp.municipio if cp else None),
                    "colonia": cp.colonia if cp else None,
                    "fecha": ca.fecha_desaparicion if ca else (cp.fecha_desaparicion if cp else None),
                    "description": desc_display,
                    "expediente": f"EXP-***-{cid[:6]}",
                    "fosa_id": ca.fosa_id if ca else None,
                    "domicilio_hasheado": domicilio_hashes[0] if domicilio_hashes else None,
                    "is_anonymized": True
                }
            else:
                # MODO CONFIDENCIAL / AUDITORÍA: Datos reales
                nombre_real = cp.nombre_real if cp and cp.nombre_real else (ca.nombre_completo if ca else f"Caso {cid[:8]}")
                desc_real = cp.text_original if cp and cp.text_original else (ca.descripcion_desaparicion if ca else "")
                meta = {
                    "nombre_anonimizado": nombre_real,
                    "municipio": cp.municipio if cp else (ca.municipio if ca else None),
                    "colonia": cp.colonia if cp else None,
                    "fecha": cp.fecha_desaparicion if cp else (ca.fecha_desaparicion if ca else None),
                    "description": desc_real,
                    "telefono": cp.telefono_contacto if cp else None,
                    "expediente": cp.id_expediente if cp else None,
                    "fosa_id": ca.fosa_id if ca else None,
                    "domicilio_hasheado": domicilio_hashes[0] if domicilio_hashes else None,
                    "is_anonymized": False
                }

            casos_meta[f"CASO_{cid}"] = meta
            casos_meta[f"cedula_{cid}"] = meta

    corpus_meta = {}
    if corpus_ids:
        nc_rows = db.query(NoticiaCorpus).filter(NoticiaCorpus.id.in_(corpus_ids)).all()
        for nc in nc_rows:
            # Construir entidades para resaltado semántico
            entidades = []
            if nc.municipio_extraido:
                entidades.append({"tipo": "UBICACION", "texto": nc.municipio_extraido})
            if nc.colonia_extraida:
                entidades.append({"tipo": "UBICACION", "texto": nc.colonia_extraida})
            if nc.referencia_ubicacion:
                entidades.append({"tipo": "UBICACION", "texto": nc.referencia_ubicacion})
            if nc.keywords_matched:
                for kw in nc.keywords_matched:
                    entidades.append({"tipo": "KEYWORD", "texto": kw})

            # Añadir patrones forenses frecuentes
            terminos_forenses = [
                "fosa clandestina", "fosas clandestinas", "restos óseos", "restos humanos",
                "cuerpos embolsados", "cuerpo embolsado", "bolsas con restos", "calcinados",
                "madres buscadoras", "colectivo luz de esperanza", "guerreros buscadores",
                "comisión de búsqueda", "inhumación clandestina", "osamenta", "segmentos anatómicos"
            ]
            cuerpo_lower = (nc.cuerpo_texto or "").lower()
            for tf in terminos_forenses:
                if tf in cuerpo_lower:
                    entidades.append({"tipo": "FORENSE", "texto": tf})

            corpus_meta[f"corpus_{nc.id}"] = {
                "titular": nc.titular,
                "url": nc.url,
                "fecha": str(nc.fecha) if nc.fecha else None,
                "municipio": nc.municipio_extraido,
                "colonia": nc.colonia_extraida,
                "cuerpos": nc.total_cuerpos_estimado,
                "restos": nc.total_restos_estimado,
                "coordenadas": nc.coordenadas,
                "resumen": nc.resumen_hallazgo or nc.titular,
                "cuerpo_texto": nc.cuerpo_texto or nc.resumen_hallazgo or nc.titular,
                "entidades_ner": entidades
            }

    noticias_meta = {}
    if noticia_ids:
        n_rows = db.query(Noticia).filter(Noticia.id.in_(noticia_ids)).all()
        for n in n_rows:
            noticias_meta[f"NOTICIA_{n.id}"] = {
                "titular": n.titular,
                "url": n.url,
                "fecha": str(n.fecha) if n.fecha else None,
                "cuerpo_texto": n.cuerpo_texto or n.titular,
                "query": getattr(n, "query_origen", ""),
                "entidades_ner": []
            }

    fosas_meta = {}
    if fosa_ids:
        f_rows = db.query(Fosa).filter(Fosa.id.in_(fosa_ids)).all()
        for f in f_rows:
            fosas_meta[f"FOSA_{f.id}"] = {
                "municipio": f.municipio,
                "fecha_hallazgo": str(f.fecha_hallazgo) if f.fecha_hallazgo else None,
                "total_fosas": f.total_fosas,
                "total_cuerpos": f.total_cuerpos,
                "total_restos": f.total_restos_fragmentos,
                "coordenadas": f.coordenadas
            }
            fosas_meta[f"fosa_{f.id}"] = fosas_meta[f"FOSA_{f.id}"]

    pii_meta = {}
    if pii_hash_ids:
        p_rows = db.query(PiiHashRegistry).filter(PiiHashRegistry.hash_id.in_(pii_hash_ids)).all()
        for p in p_rows:
            pii_meta[p.hash_id] = {
                "entity_type": p.entity_type,
                "canonical_value": p.canonical_value
            }

    # Disposición circular inicial
    nodes_pool = []
    total_nodes = len(node_ids)
    for idx, nid in enumerate(node_ids):
        angle = (2 * math.pi * idx) / max(total_nodes, 1)
        radius = 200 + (idx % 3) * 50

        node_meta = {}
        node_label = nid

        if "CASO" in nid or "cedula" in nid:
            ntype = "PERSONA"
            if nid in casos_meta:
                cm = casos_meta[nid]
                if anonymized:
                    node_label = f"Caso {cm['nombre_anonimizado']}"
                else:
                    node_label = f"Caso: {cm['nombre_anonimizado'] or cm['colonia'] or cm['municipio'] or nid[:8]}"
                node_meta = {
                    "type": "PERSONA",
                    "location": f"{cm['colonia'] or ''}, {cm['municipio'] or ''}".strip(", "),
                    "date": cm["fecha"],
                    "description": cm["description"],
                    "expediente": cm.get("expediente"),
                    "nombre_anonimizado": cm["nombre_anonimizado"],
                    "fosa_id": cm.get("fosa_id"),
                    "domicilio_hasheado": cm.get("domicilio_hasheado"),
                    "is_anonymized": cm.get("is_anonymized", True)
                }
            else:
                node_label = nid.replace("CASO_", "Caso ").replace("cedula_", "Caso ")
                node_meta = {"type": "PERSONA"}
        elif "corpus_" in nid:
            ntype = "NOTICIA"
            if nid in corpus_meta:
                cm = corpus_meta[nid]
                node_label = cm["titular"][:35] + "..." if len(cm["titular"]) > 35 else cm["titular"]
                node_meta = {
                    "type": "NOTICIA",
                    "titular": cm["titular"],
                    "url": cm["url"],
                    "date": cm["fecha"],
                    "location": f"{cm['colonia'] or ''}, {cm['municipio'] or ''}".strip(", "),
                    "description": cm["resumen"] or cm["titular"],
                    "cuerpo_completo": cm["cuerpo_texto"],
                    "cuerpos": cm["cuerpos"],
                    "restos": cm["restos"],
                    "entidades_ner": cm["entidades_ner"]
                }
            else:
                node_label = nid.replace("corpus_", "Noticia ")
                node_meta = {"type": "NOTICIA"}
        elif "FOSA" in nid or "fosa_" in nid:
            ntype = "FOSA"
            if nid in fosas_meta:
                fm = fosas_meta[nid]
                node_label = f"Fosa {fm['municipio'] or nid}"
                node_meta = {
                    "type": "FOSA",
                    "location": fm["municipio"],
                    "date": fm["fecha_hallazgo"],
                    "total_cuerpos": fm["total_cuerpos"],
                    "total_fosas": fm["total_fosas"],
                    "coordenadas": fm["coordenadas"],
                    "description": f"Fosa clandestina con {fm['total_cuerpos'] or 0} cuerpos recuperados en {fm['municipio']}."
                }
            else:
                node_label = nid.replace("FOSA_", "Fosa ").replace("fosa_", "Fosa ")
                node_meta = {"type": "FOSA"}
        elif "NOTICIA" in nid:
            ntype = "NOTICIA"
            if nid in noticias_meta:
                nm = noticias_meta[nid]
                node_label = nm["titular"][:35] + "..." if len(nm["titular"]) > 35 else nm["titular"]
                node_meta = {
                    "type": "NOTICIA",
                    "titular": nm["titular"],
                    "url": nm["url"],
                    "date": nm["fecha"],
                    "description": nm["titular"],
                    "cuerpo_completo": nm["cuerpo_texto"],
                    "query": nm["query"],
                    "entidades_ner": nm.get("entidades_ner", [])
                }
            else:
                node_label = nid.replace("NOTICIA_", "Nota ")
                node_meta = {"type": "NOTICIA"}
        elif "DOMICILIO" in nid:
            ntype = "HASH_DOMICILIO"
            pm = pii_meta.get(nid, {})
            node_label = f"Domicilio: {nid[:18]}" if anonymized else f"Calle: {pm.get('canonical_value', nid)[:25]}"
            node_meta = {
                "type": "HASH_DOMICILIO",
                "canonical_value": pm.get("canonical_value") if not anonymized else nid,
                "hash_id": nid,
                "description": f"Entidad protegida de domicilio [HASH]: {nid}" if anonymized else f"Entidad de domicilio normalizada: {pm.get('canonical_value')}"
            }
        elif "NOMBRE" in nid:
            ntype = "PERSONA"
            pm = pii_meta.get(nid, {})
            node_label = f"{nid[:16]}" if anonymized else f"PII: {pm.get('canonical_value', nid)[:20]}"
            node_meta = {
                "type": "PERSONA",
                "canonical_value": pm.get("canonical_value") if not anonymized else nid,
                "hash_id": nid,
                "description": f"Nombre criptográfico anonimizado: {nid}" if anonymized else f"Nombre desanonimizado: {pm.get('canonical_value')}"
            }
        elif nid == "OSINT_EMPTY":
            ntype = "SUGERENCIA"
            node_label = "Sin Coincidencia Prensa (OSINT Empty)"
            node_meta = {
                "type": "SUGERENCIA",
                "description": "Súper-nodo contenedor de casos explorados por el minador donde no se hallaron notas de prensa correlacionadas."
            }
        else:
            ntype = "SUGERENCIA"
            node_label = nid
            node_meta = {}

        node_color = COLOR_MAP.get(ntype, "#4a4e69")

        nodes_pool.append({
            "id": nid,
            "label": node_label,
            "type": ntype,
            "x": radius * math.cos(angle),
            "y": radius * math.sin(angle),
            "size": 18.0 if ntype in ["PERSONA", "FOSA", "NOTICIA"] else 10.0,
            "color": node_color,
            "metadata": node_meta
        })

    return SemanticGraphResponse(
        nodes=nodes_pool,
        edges=edges_pool,
        total_nodes=len(nodes_pool),
        total_edges=len(edges_pool),
        cluster_mode=False
    )


@router.get("/context-graph", response_model=SemanticGraphResponse)
def get_context_semantic_graph(
    limit_edges: int = Query(default=300, ge=10, le=25000),
    filter_modus: Optional[str] = Query(default=None, description="Filtrar por modus operandi específico"),
    anonymized: bool = Query(default=True, description="Mostrar nombres y domicilios de cédulas anonimizados bajo hashes criptográficos"),
    db: Session = Depends(get_db)
):
    """
    Devuelve el Hiper-Grafo de Contexto Forense (RAG-Ontology):
    Conecta Casos entre sí mediante Modus Operandi, Vehículos de Perpetradores,
    Vehículos de Víctimas, Vínculos Familiares y Eventos Colectivos Compartidos.
    """
    import math
    from backend.app.models import CedulaPrivada, CasoPatronForense, Fosa, Caso

    # 1. Consultar aristas de contexto criminal y relacional
    context_relation_types = [
        'MODUS_OPERANDI', 'POSIBLE_HALLAZGO_EN_FOSA', 'DESAPARECIO_EN_DOMICILIO',
        'INSTITUCION_LUGAR', 'DESTINO_DECLARADO', 'INDICIOS_EN_SITIO',
        'PERPETRADO_CON_VEHICULO', 'VIAJABA_EN_VEHICULO', 'REPORTE_POR_FAMILIAR',
        'DESAPARECIO_JUNTO_A', 'FAMILIAR_DE', 'REPORTO_MISMO_EVENTO'
    ]

    if filter_modus:
        edges = db.query(VinculoEntidad).filter(
            VinculoEntidad.relation_type == 'MODUS_OPERANDI',
            VinculoEntidad.target_node == f"MODUS_{filter_modus}"
        ).order_by(VinculoEntidad.id.desc()).limit(limit_edges).all()
    else:
        # Muestreo estratificado balanceado para representar todas las dimensiones del contexto
        limit_per_type = max(15, limit_edges // len(context_relation_types))
        edges = []
        for rt in context_relation_types:
            sub_edges = db.query(VinculoEntidad).filter(
                VinculoEntidad.relation_type == rt
            ).order_by(VinculoEntidad.id.desc()).limit(limit_per_type).all()
            edges.extend(sub_edges)
        edges = edges[:limit_edges]

    node_ids = set()
    edges_pool = []
    for e in edges:
        # Colores por tipo de arista forense
        edge_color = "#64748b"
        if e.relation_type == "INSTITUCION_LUGAR":
            edge_color = "#10b981" # Esmeralda para albergues e instituciones
        elif e.relation_type == "POSIBLE_HALLAZGO_EN_FOSA":
            edge_color = "#10b981" # Esmeralda para fosas oficiales
        elif e.relation_type == "DESAPARECIO_EN_DOMICILIO":
            edge_color = "#8b5cf6" # Violeta para domicilios
        elif e.relation_type == "INDICIOS_EN_SITIO":
            edge_color = "#f59e0b" # Ámbar para cartas y recados
        elif e.relation_type == "DESTINO_DECLARADO":
            edge_color = "#3b82f6" # Azul para destinos
        elif e.relation_type == "PERPETRADO_CON_VEHICULO":
            edge_color = "#c084fc" # Púrpura alerta
        elif e.relation_type == "MODUS_OPERANDI":
            edge_color = "#fb923c" # Naranja modus
        elif e.relation_type == "VIAJABA_EN_VEHICULO":
            edge_color = "#38bdf8" # Azul claro
        elif e.relation_type in ("DESAPARECIO_JUNTO_A", "FAMILIAR_DE", "REPORTO_MISMO_EVENTO"):
            edge_color = "#f43f5e" # Rosa fuerte enlace interpersonal

        edges_pool.append({
            "id": str(e.id),
            "source": e.source_node,
            "target": e.target_node,
            "label": e.relation_type,
            "confidence": e.confidence_score,
            "estado": e.estado_aprobacion,
            "color": edge_color
        })
        node_ids.add(e.source_node)
        node_ids.add(e.target_node)

    # 2. Cargar datos contextuales y patrones forenses para enriquecer cada caso
    caso_uuids = [nid.replace("CASO_", "") for nid in node_ids if "CASO_" in nid]
    casos_meta = {}
    if caso_uuids:
        cp_map = {c.id: c for c in db.query(CedulaPrivada).filter(CedulaPrivada.id.in_(caso_uuids)).all()}
        ca_map = {a.id_cedula_busqueda: a for a in db.query(Caso).filter(Caso.id_cedula_busqueda.in_(caso_uuids)).all()}
        for cid in caso_uuids:
            c = cp_map.get(cid)
            a_info = ca_map.get(cid)

            if anonymized:
                # MODO ANÓNIMO: Respetar hashes criptográficos de Caso
                nombre = (a_info.nombre_completo if a_info and a_info.nombre_completo else f"Caso {cid[:8]}")
                desc = (a_info.descripcion_desaparicion if a_info and a_info.descripcion_desaparicion else (c.text_original[:800] if c else ""))
                exp = f"EXP-***-{cid[:6]}"
                is_anon = True
            else:
                # MODO AUDITORÍA / CONFIDENCIAL: Exponer datos reales de CedulaPrivada
                nombre = (c.nombre_real if c and c.nombre_real else (a_info.nombre_completo if a_info else f"Caso {cid[:8]}"))
                desc = (c.text_original if c and c.text_original else (a_info.descripcion_desaparicion if a_info else ""))
                exp = (c.id_expediente if c and c.id_expediente else None) or f"EXP-***-{cid[:6]}"
                is_anon = False

            mun = (a_info.municipio if a_info else (c.municipio if c else None))
            col = c.colonia if c else None
            fecha_val = (a_info.fecha_desaparicion if a_info else (c.fecha_desaparicion if c else None)) or ''
            cond_loc = getattr(a_info, 'condicion_localizacion', None) or 'NO_LOCALIZADO'
            sexo_val = getattr(a_info, 'sexo', None) or 'NO_ESPECIFICADO'
            mes_str = fecha_val[:7] if len(fecha_val) >= 7 and fecha_val[4] == '-' else None

            casos_meta[f"CASO_{cid}"] = {
                "nombre_real": c.nombre_real if c and c.nombre_real else nombre,
                "nombre_display": nombre,
                "nombre_anonimizado": a_info.nombre_completo if a_info and a_info.nombre_completo else nombre,
                "municipio": mun,
                "colonia": col,
                "fecha": fecha_val,
                "descripcion": desc,
                "telefono": c.telefono_contacto if (c and not anonymized) else None,
                "expediente": exp,
                "condicion_localizacion": cond_loc,
                "estatus_persona": getattr(a_info, 'estatus_persona_desaparecida', None) or 'DESAPARECIDO',
                "edad": getattr(a_info, 'edad_momento_desaparicion', None),
                "sexo": sexo_val,
                "mes_reporte": mes_str,
                "is_anonymized": is_anon
            }

            # A) Conectar con Nodo Clúster de Condición de Localización
            if cond_loc:
                cond_target = f"CONDICION_{cond_loc}"
                edges_pool.append({
                    "id": f"e_cond_{cid}",
                    "source": f"CASO_{cid}",
                    "target": cond_target,
                    "label": "CONDICION_LOCALIZACION",
                    "confidence": 1.0,
                    "estado": "APROBADO",
                    "color": "#ef4444" if cond_loc == "NO_LOCALIZADO" else "#22c55e"
                })
                node_ids.add(cond_target)

            # C) Conectar con Nodo Clúster de Sexo
            if sexo_val and sexo_val != "NO_ESPECIFICADO":
                sexo_target = f"SEXO_{sexo_val}"
                edges_pool.append({
                    "id": f"e_sex_{cid}",
                    "source": f"CASO_{cid}",
                    "target": sexo_target,
                    "label": "GENERO_SEXO",
                    "confidence": 1.0,
                    "estado": "APROBADO",
                    "color": "#ec4899" if sexo_val == "MUJER" else "#3b82f6"
                })
                node_ids.add(sexo_target)

    patrones_meta = {}
    if caso_uuids:
        p_rows = db.query(CasoPatronForense).filter(CasoPatronForense.caso_id.in_(caso_uuids)).all()
        for p in p_rows:
            patrones_meta[f"CASO_{p.caso_id}"] = {
                "modus_operandi": p.modus_operandi_tipo,
                "lugar_tipo": p.lugar_tipo,
                "nombre_lugar_institucion": p.nombre_lugar_institucion,
                "indicio_dejado": p.indicio_dejado,
                "contenido_indicio": p.contenido_indicio,
                "destino_declarado": p.destino_declarado,
                "vehiculo_victima": p.vehiculo_victima,
                "vehiculo_perpetradores": p.vehiculo_perpetradores,
                "armas": p.armas_observadas,
                "num_perpetradores": p.num_perpetradores,
                "reportante_parentesco": p.reportante_parentesco,
                "resumen_forense": p.resumen_forense
            }

    fosa_ids = []
    for nid in node_ids:
        if nid.startswith("FOSA_"):
            try:
                fosa_ids.append(int(nid.replace("FOSA_", "")))
            except Exception:
                pass
    fosas_meta = {}
    if fosa_ids:
        f_rows = db.query(Fosa).filter(Fosa.id.in_(fosa_ids)).all()
        for f in f_rows:
            fosas_meta[f"FOSA_{f.id}"] = {
                "municipio": f.municipio,
                "fecha_hallazgo": str(f.fecha_hallazgo) if f.fecha_hallazgo else None,
                "total_fosas": f.total_fosas,
                "total_cuerpos": f.total_cuerpos,
                "total_restos": f.total_restos_fragmentos,
                "coordenadas": f.coordenadas
            }

    pii_hash_ids = [nid for nid in node_ids if "HASH_" in nid or "DOMICILIO_" in nid or "NOMBRE_" in nid]
    pii_meta = {}
    if pii_hash_ids:
        p_rows = db.query(PiiHashRegistry).filter(PiiHashRegistry.hash_id.in_(pii_hash_ids)).all()
        for p in p_rows:
            pii_meta[p.hash_id] = {
                "entity_type": p.entity_type,
                "canonical_value": p.canonical_value
            }

    # 3. Disposición y serialización de nodos
    CONTEXT_COLORS = {
        "PERSONA": "#e63946",             # Rojo Cédula
        "MODUS": "#f97316",               # Naranja Modus Operandi
        "INSTITUCION": "#10b981",         # Esmeralda Albergue / Anexo
        "EVIDENCIA_MATERIAL": "#f59e0b",  # Ámbar Carta / Recado
        "DESTINO": "#3b82f6",             # Azul Destino
        "MES_REPORTE": "#06b6d4",         # Cian Mes / Temporalidad
        "CONDICION": "#ef4444",           # Rojo / Alerta Condición
        "SEXO": "#8b5cf6",                # Violeta Sexo
        "VEHICULO_SOSPECHOSO": "#a855f7", # Púrpura Vehículo Agresores
        "VEHICULO_VICTIMA": "#0284c7",    # Azul Vehículo Víctima
        "PARENTESCO": "#64748b",          # Gris Rol / Testigo
        "FOSA": "#10b981",                # Esmeralda Fosa Clandestina
        "HASH_DOMICILIO": "#8b5cf6",      # Violeta Domicilio Hasheado
        "DEFAULT": "#475569"
    }

    nodes_pool = []
    total_nodes = len(node_ids)
    for idx, nid in enumerate(node_ids):
        angle = (2 * math.pi * idx) / max(total_nodes, 1)
        radius = 220 + (idx % 4) * 45

        node_meta = {}
        node_label = nid
        ntype = "DEFAULT"
        nsize = 11.0

        if nid.startswith("CASO_"):
            ntype = "PERSONA"
            nsize = 14.0
            cm = casos_meta.get(nid, {})
            pm = patrones_meta.get(nid, {})
            nombre_label = cm.get("nombre_display") or cm.get("expediente") or cm.get("colonia") or nid[:12]
            node_label = f"Caso: {nombre_label}" if not anonymized else f"Caso {nombre_label}"
            node_meta = {
                "type": "PERSONA",
                "location": f"{cm.get('colonia') or ''}, {cm.get('municipio') or ''}".strip(", "),
                "date": cm.get("fecha"),
                "description": cm.get("descripcion"),
                "expediente": cm.get("expediente"),
                "nombre_real": cm.get("nombre_real"),
                "nombre_anonimizado": cm.get("nombre_anonimizado"),
                "condicion_localizacion": cm.get("condicion_localizacion", "NO_LOCALIZADO"),
                "estatus_persona": cm.get("estatus_persona", "DESAPARECIDO"),
                "edad": cm.get("edad"),
                "sexo": cm.get("sexo"),
                "forense": pm,
                "is_anonymized": cm.get("is_anonymized", True)
            }
        elif nid.startswith("MODUS_"):
            ntype = "MODUS"
            nsize = 18.0
            nombre_modus = nid.replace("MODUS_", "").replace("_", " ")
            node_label = f"Modus: {nombre_modus}"
            node_meta = {
                "type": "MODUS",
                "label": nombre_modus,
                "description": f"Patrón criminal de modus operandi: {nombre_modus}"
            }
        elif nid.startswith("INST_"):
            ntype = "INSTITUCION"
            nsize = 17.0
            inst_name = nid.replace("INST_", "").replace("_", " ")
            node_label = f"🏢 {inst_name}"
            node_meta = {
                "type": "INSTITUCION",
                "label": inst_name,
                "description": f"Institución, Albergue o Centro de Internamiento: {inst_name}"
            }
        elif nid.startswith("INDICIO_"):
            ntype = "EVIDENCIA_MATERIAL"
            nsize = 15.0
            ind_name = nid.replace("INDICIO_", "").replace("_", " ")
            node_label = f"✉️ {ind_name}"
            node_meta = {
                "type": "EVIDENCIA_MATERIAL",
                "label": ind_name,
                "description": f"Indicio documental dejado: {ind_name}"
            }
        elif nid.startswith("DEST_"):
            ntype = "DESTINO"
            nsize = 14.0
            dest_name = nid.replace("DEST_", "").replace("_", " ")
            node_label = f"📍 Hacia: {dest_name}"
            node_meta = {
                "type": "DESTINO",
                "label": dest_name,
                "description": f"Destino o traslado proyectado: {dest_name}"
            }
        elif nid.startswith("MES_"):
            ntype = "MES_REPORTE"
            nsize = 18.0
            mes_tag = nid.replace("MES_", "")
            node_label = f"📅 Mes: {mes_tag}"
            node_meta = {
                "type": "MES_REPORTE",
                "label": mes_tag,
                "description": f"Clúster temporal: reportes ocurridos en {mes_tag}"
            }
        elif nid.startswith("CONDICION_"):
            ntype = "CONDICION"
            nsize = 20.0
            c_tag = nid.replace("CONDICION_", "").replace("_", " ")
            node_label = f"⚠️ Estado: {c_tag}"
            node_meta = {
                "type": "CONDICION",
                "label": c_tag,
                "description": f"Condición oficial de localización: {c_tag}"
            }
        elif nid.startswith("SEXO_"):
            ntype = "SEXO"
            nsize = 19.0
            s_tag = nid.replace("SEXO_", "")
            node_label = f"⚧️ {s_tag}"
            node_meta = {
                "type": "SEXO",
                "label": s_tag,
                "description": f"Segmento demográfico por sexo: {s_tag}"
            }
        elif nid.startswith("VEH_PERP_"):
            ntype = "VEHICULO_SOSPECHOSO"
            nsize = 16.0
            v_desc = nid.replace("VEH_PERP_", "").replace("_", " ")
            node_label = f"🚨 {v_desc}"
            node_meta = {
                "type": "VEHICULO_SOSPECHOSO",
                "description": f"Vehículo sospechoso utilizado por agresores: {v_desc}"
            }
        elif nid.startswith("VEH_VIC_"):
            ntype = "VEHICULO_VICTIMA"
            nsize = 13.0
            v_desc = nid.replace("VEH_VIC_", "").replace("_", " ")
            node_label = f"🚗 {v_desc}"
            node_meta = {
                "type": "VEHICULO_VICTIMA",
                "description": f"Vehículo en el que viajaba la víctima: {v_desc}"
            }
        elif nid.startswith("ROL_"):
            ntype = "PARENTESCO"
            nsize = 12.0
            rol_desc = nid.replace("ROL_", "").replace("_", " ")
            node_label = f"Denunciante: {rol_desc}"
            node_meta = {
                "type": "PARENTESCO",
                "description": f"Parentesco de la persona que reportó la desaparición: {rol_desc}"
            }
        elif nid.startswith("DOMICILIO_HASH_") or "DOMICILIO" in nid:
            ntype = "HASH_DOMICILIO"
            nsize = 15.0
            if not anonymized and nid in pii_meta:
                real_val = pii_meta[nid]["canonical_value"]
                node_label = f"🏠 {real_val[:24]}"
                node_meta = {
                    "type": "HASH_DOMICILIO",
                    "label": real_val,
                    "canonical_value": real_val,
                    "description": f"Inmueble / Domicilio Real: {real_val} (Auditoría: {nid})",
                    "is_anonymized": False
                }
            else:
                node_label = f"🏠 {nid[:22]}"
                node_meta = {
                    "type": "HASH_DOMICILIO",
                    "label": nid,
                    "description": f"Inmueble / Finca de desaparición (Hash PII): [{nid}]",
                    "is_anonymized": True
                }
        elif nid.startswith("FOSA_"):
            ntype = "FOSA"
            nsize = 18.0
            fid = int(nid.replace("FOSA_", "")) if nid.replace("FOSA_", "").isdigit() else None
            fm = fosas_meta.get(nid, {})
            node_label = f"⚰️ Fosa #{fid} ({fm.get('municipio', '')})" if fid and fm.get('municipio') else f"⚰️ {nid}"
            node_meta = {
                "type": "FOSA",
                "label": node_label,
                "description": f"Fosa Clandestina en {fm.get('municipio', 'Jalisco')} ({fm.get('total_cuerpos', 0)} cuerpos exhumados)",
                **fm
            }

        nodes_pool.append({
            "id": nid,
            "label": node_label,
            "type": ntype,
            "x": radius * math.cos(angle),
            "y": radius * math.sin(angle),
            "size": nsize,
            "color": CONTEXT_COLORS.get(ntype, CONTEXT_COLORS["DEFAULT"]),
            "metadata": node_meta
        })

    return SemanticGraphResponse(
        nodes=nodes_pool,
        edges=edges_pool,
        total_nodes=len(nodes_pool),
        total_edges=len(edges_pool),
        cluster_mode=False
    )


@router.get("/noticias-list")
def get_noticias_list(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=15, ge=1, le=100),
    municipio: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Devuelve el catálogo de noticias del corpus periodístico paginado,
    con extracción de entidades NER para visualización en lista con texto completo.
    """
    query = db.query(NoticiaCorpus)

    if municipio and municipio.strip():
        query = query.filter(NoticiaCorpus.municipio_extraido.ilike(f"%{municipio.strip()}%"))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (NoticiaCorpus.titular.ilike(term)) | (NoticiaCorpus.cuerpo_texto.ilike(term))
        )

    total = query.count()
    items_db = query.order_by(NoticiaCorpus.fecha.desc().nullslast()).offset((page - 1) * page_size).limit(page_size).all()

    terminos_forenses = [
        "fosa clandestina", "fosas clandestinas", "restos óseos", "restos humanos",
        "cuerpos embolsados", "cuerpo embolsado", "bolsas con restos", "calcinados",
        "madres buscadoras", "colectivo luz de esperanza", "guerreros buscadores",
        "comisión de búsqueda", "inhumación clandestina", "osamenta", "segmentos anatómicos"
    ]

    items = []
    for nc in items_db:
        entidades = []
        if nc.municipio_extraido:
            entidades.append({"tipo": "UBICACION", "texto": nc.municipio_extraido})
        if nc.colonia_extraida:
            entidades.append({"tipo": "UBICACION", "texto": nc.colonia_extraida})
        if nc.referencia_ubicacion:
            entidades.append({"tipo": "UBICACION", "texto": nc.referencia_ubicacion})
        if nc.keywords_matched:
            for kw in nc.keywords_matched:
                entidades.append({"tipo": "KEYWORD", "texto": kw})

        cuerpo_lower = (nc.cuerpo_texto or "").lower()
        for tf in terminos_forenses:
            if tf in cuerpo_lower:
                entidades.append({"tipo": "FORENSE", "texto": tf})

        items.append({
            "id": nc.id,
            "titular": nc.titular,
            "url": nc.url,
            "fecha": str(nc.fecha) if nc.fecha else None,
            "municipio": nc.municipio_extraido,
            "colonia": nc.colonia_extraida,
            "cuerpo_texto": nc.cuerpo_texto,
            "keywords": nc.keywords_matched or [],
            "total_cuerpos_estimado": nc.total_cuerpos_estimado,
            "total_restos_estimado": nc.total_restos_estimado,
            "entidades_ner": entidades
        })

    import math
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": total_pages
    }


@router.get("/context-entities")
def get_context_entities_list(
    db: Session = Depends(get_db)
):
    """
    Devuelve el catálogo agregado de convenciones y entidades ontológicas
    ordenadas por frecuencia descendente (repeticiones), agrupadas por tipo,
    con desglose completo de entidades para todas las categorías del grafo.
    """
    from sqlalchemy import func
    from backend.app.models import Fosa, Caso, NoticiaCorpus, Noticia

    # Conteo global por relation_type
    rel_counts = db.query(
        VinculoEntidad.relation_type,
        func.count(VinculoEntidad.id).label("total")
    ).group_by(VinculoEntidad.relation_type).order_by(func.count(VinculoEntidad.id).desc()).all()

    # Desglose de entidades destino para todas las relaciones del grafo ontológico
    target_counts = db.query(
        VinculoEntidad.relation_type,
        VinculoEntidad.target_node,
        func.count(VinculoEntidad.id).label("total")
    ).group_by(
        VinculoEntidad.relation_type,
        VinculoEntidad.target_node
    ).order_by(
        VinculoEntidad.relation_type,
        func.count(VinculoEntidad.id).desc()
    ).all()

    # 1. Precargar fosas para enriquecer los nombres de FOSA_X / fosa_X
    fosa_ids_list = [
        int(t.replace("FOSA_", "").replace("fosa_", "")) 
        for r, t, _ in target_counts 
        if (t.startswith("FOSA_") or t.startswith("fosa_")) and t.replace("FOSA_", "").replace("fosa_", "").isdigit()
    ]
    fosas_dict = {}
    if fosa_ids_list:
        f_records = db.query(Fosa).filter(Fosa.id.in_(fosa_ids_list)).all()
        for f in f_records:
            fosas_dict[f"FOSA_{f.id}"] = f"Fosa #{f.id} en {f.municipio} ({f.total_cuerpos or 0} cuerpos)"
            fosas_dict[f"fosa_{f.id}"] = f"Fosa #{f.id} en {f.municipio} ({f.total_cuerpos or 0} cuerpos)"

    # 2. Precargar casos para enriquecer DESAPARECIO_JUNTO_A, REPORTO_MISMO_EVENTO, FAMILIAR_DE
    caso_uuids = list({
        t.replace("CASO_", "").replace("cedula_", "")
        for _, t, _ in target_counts
        if t.startswith("CASO_") or t.startswith("cedula_")
    })
    casos_dict = {}
    if caso_uuids:
        c_records = db.query(Caso).filter(Caso.id_cedula_busqueda.in_(caso_uuids)).all()
        for c in c_records:
            casos_dict[c.id_cedula_busqueda] = c

    # 3. Precargar corpus periodístico para POSIBLE_HALLAZGO_RELACIONADO
    corpus_ids = list({
        int(t.replace("corpus_", ""))
        for _, t, _ in target_counts
        if t.startswith("corpus_") and t.replace("corpus_", "").isdigit()
    })
    corpus_dict = {}
    if corpus_ids:
        nc_records = db.query(NoticiaCorpus).filter(NoticiaCorpus.id.in_(corpus_ids)).all()
        for nc in nc_records:
            corpus_dict[nc.id] = nc

    # 4. Precargar notas de prensa para MENCIONADO_EN_NOTICIA
    noticia_ids = list({
        int(t.replace("NOTICIA_", ""))
        for _, t, _ in target_counts
        if t.startswith("NOTICIA_") and t.replace("NOTICIA_", "").isdigit()
    })
    noticias_dict = {}
    if noticia_ids:
        n_records = db.query(Noticia).filter(Noticia.id.in_(noticia_ids)).all()
        for n in n_records:
            noticias_dict[n.id] = n

    grouped_targets: Dict[str, List[Dict[str, Any]]] = {}
    for r_type, target, cnt in target_counts:
        cid = target.replace("CASO_", "").replace("cedula_", "")

        if target in fosas_dict:
            clean_name = fosas_dict[target]
        elif target.startswith("DOMICILIO_HASH_"):
            clean_name = f"Inmueble / Finca [{target}]"
        elif (target.startswith("CASO_") or target.startswith("cedula_")) and cid in casos_dict:
            c = casos_dict[cid]
            nom = c.nombre_completo or f"Víctima {cid[:8]}"
            mun = f" ({c.municipio})" if c.municipio else ""
            clean_name = f"{nom}{mun}"
        elif target.startswith("CASO_") or target.startswith("cedula_"):
            clean_name = f"Caso Correlacionado #{cid[:8]}"
        elif target.startswith("corpus_"):
            try:
                nid = int(target.replace("corpus_", ""))
                nc = corpus_dict.get(nid)
                if nc and nc.titular:
                    tit = nc.titular[:55] + "..." if len(nc.titular) > 55 else nc.titular
                    mun = f" [{nc.municipio_extraido}]" if nc.municipio_extraido else ""
                    clean_name = f"Nota: {tit}{mun}"
                else:
                    clean_name = f"Nota de Prensa #{nid}"
            except Exception:
                clean_name = target
        elif target.startswith("NOTICIA_"):
            try:
                nid = int(target.replace("NOTICIA_", ""))
                n = noticias_dict.get(nid)
                if n and n.titular:
                    tit = n.titular[:55] + "..." if len(n.titular) > 55 else n.titular
                    clean_name = f"Nota: {tit}"
                else:
                    clean_name = f"Nota Periodística #{nid}"
            except Exception:
                clean_name = target
        else:
            clean_name = target
            for prefix in ["MODUS_", "INST_", "DESTINO_", "DEST_", "VEH_VIC_", "VEH_PERP_", "INDICIO_", "ROL_", "CONDICION_", "SEXO_"]:
                if clean_name.startswith(prefix):
                    clean_name = clean_name[len(prefix):]
                    break
            clean_name = clean_name.replace("_", " ").strip()

        if r_type not in grouped_targets:
            grouped_targets[r_type] = []
        grouped_targets[r_type].append({
            "target_node": target,
            "nombre": clean_name,
            "repeticiones": cnt
        })

    categories = []
    for r_type, total_r in rel_counts:
        entities = grouped_targets.get(r_type, [])
        categories.append({
            "relation_type": r_type,
            "total_vinculos": total_r,
            "entities": entities[:60]
        })

    return {
        "total_tipos": len(categories),
        "categories": categories
    }



