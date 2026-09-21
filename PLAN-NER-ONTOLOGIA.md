# 🗺️ Plan Arquitectónico: NER Especializado, Ontología Semántica y Minería de Datos

> **Documento de Contexto y Especificación Técnica para la rama `feature/ner-ontologia-mineria`**  
> **Proyecto:** Cartografía Semántica de Desaparecidos  
> **Entorno de destino para entrenamiento/GPU:** Servidor GPU (`produccion@gpu` | RTX 5060 Ti 16GB)

---

## 🔒 1. Política de Seguridad y Manejo de Datos Sensibles (PII)

> [!CAUTION]
> **PROHIBIDO COMPARTIR DATOS EN GIT:**
> Los registros que contienen nombres reales, direcciones particulares, teléfonos y placas vehiculares constituyen Información Personal Identificable (PII) sumamente delicada. **Ningún archivo `.jsonl`, `.csv` o volcado crudo de la base de datos debe ser versionado en Git**.

* La ruta local `backend/app/ner/data/` y los patrones `*.jsonl`, `data/`, `data_export/` están estrictamente agregados al `.gitignore`.
* **Mecanismo de Transferencia a GPU (Vía SSH / Rsync Directo):**
  Para transferir el dataset generado desde esta máquina local a la máquina GPU sin pasar por la nube ni Git:
  ```bash
  # Desde tu máquina local hacia el servidor GPU:
  rsync -avz --progress backend/app/ner/data/dataset_ner_personas.jsonl produccion@gpu:/ruta/a/CartografiaSemanticaDesaparecidos/backend/app/ner/data/
  ```

---

## 📊 2. El Dataset de Ground Truth Generado

Mediante el script [`backend/app/ner/dataset_builder.py`](file:///home/abundis/comision/CartografiaSemanticaDesaparecidos/backend/app/ner/dataset_builder.py), se realizó una alineación determinista de anclas de texto entre los pares exactos de la base de datos:
* **Tabla fuente cruda:** `repd_vp_cedulas_principal` (5,542 registros originales)
* **Tabla anonimizada:** `cedulas_anonimizadas` (5,542 registros protegidos)

### Estadísticas de Extracción (Dataset de 5,542 Casos)
| Entidad | Ocurrencias | Descripción |
| :--- | :--- | :--- |
| `FECHA` | **5,996** | Fechas del evento de desaparición o avistamiento. |
| `HORA` | **5,954** | Franjas horarias exactas citadas por los reportantes. |
| `DOMICILIO` | **5,822** | Calles, números exteriores/interiores, cruces viales y predios. |
| `NOMBRE` | **5,586** | Nombres de reportantes, familiares, testigos o involucrados. |
| `TELEFONO` | **875** | Números telefónicos de contacto o referencia. |
| `EXP` | **395** | Números de carpetas de investigación y expedientes ministeriales. |
| `PLACA` | **99** | Matrículas de vehículos vinculados a la desaparición. |
| **TOTAL** | **24,727** | **Entidades etiquetadas con offsets exactos `(start, end)`** |

### Formato del Archivo `dataset_ner_personas.jsonl`:
```json
{
  "id": "c1dff4a5-8203-533d-9475-e4ef97a1a4f0",
  "metadata": {
    "nombre": "EFRAIN ARELLANO VELAZQUEZ",
    "edad": 35,
    "sexo": "HOMBRE",
    "municipio": "SAN PEDRO TLAQUEPAQUE",
    "fecha_desaparicion": "2024-10-30"
  },
  "text_original": "REFIERE LA REPORTANTE QUE EL DÍA 30 DE OCTUBRE DEL 2024 APROXIMADAMENTE A LA 13:00 SU HERMANO SALIÓ DEL DOMICILIO UBICADO EN LA CALLE OTHÓN BLANCO #189 COLONIA NUEVA SANTA MARIA...",
  "text_anonimizado": "REFIERE LA REPORTANTE QUE EL [FECHA PROTEGIDA] APROXIMADAMENTE A LA [HORA PROTEGIDA]SU HERMANO SALIÓ DEL DOMICILIO UBICADO EN LA CALLE [DOMICILIO PROTEGIDO] COLONIA NUEVA SANTA MARIA...",
  "entities": [
    {"start": 29, "end": 55, "label": "FECHA", "text": "DÍA 30 DE OCTUBRE DEL 2024"},
    {"start": 77, "end": 83, "label": "HORA", "text": "13:00 "},
    {"start": 134, "end": 151, "label": "DOMICILIO", "text": "OTHÓN BLANCO #189"}
  ]
}
```

---

## 🎯 3. Arquitectura del Sistema: Componentes y Flujo

```
   ┌────────────────────────────────────────────────────────┐
   │ 1. BASE DE PERSONAS (5,542 Cédulas + 5,484 PFSI)      │  (Estática / Ya existente)
   └─────────────────────────┬──────────────────────────────┘
                             │
                             ▼
   ┌────────────────────────────────────────────────────────┐
   │ 2. MODELO NER ENTRENADO (spaCy / GLiNER / Transformer) │  (Entrenado en Servidor GPU)
   │    - Capacidad 1: Anonimizador automático de PII       │
   │    - Capacidad 2: Extractor de Domicilios y Nombres    │
   └─────────────┬───────────────────────────┬──────────────┘
                 │                           │
                 ▼                           ▼
 ┌───────────────────────────────┐ ┌──────────────────────────────────┐
 │ 3. GENERADOR DE QUERIES OSINT │ │ 4. MINER DE FOSAS                │
 │ Extrae colonias, municipios y │ │ Ingesta reportes oficiales,      │
 │ fechas críticas para formular │ │ brigadas y colectivos (coordenadas,│
 │ búsquedas dirigidas a prensa. │ │ cuerpos, restos óseos, fecha).   │
 └───────────────┬───────────────┘ └─────────────────┬────────────────┘
                 │                                   │
                 ▼                                   │
 ┌───────────────────────────────┐                   │
 │ 5. MINER DE NOTICIAS          │                   │
 │ Ingesta notas periodísticas de│                   │
 │ las consultas y aplica el NER │                   │
 │ para extraer hallazgos y sedes│                   │
 └───────────────┬───────────────┘                   │
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   │
                                   ▼
                 ┌───────────────────────────────────┐
                 │ 6. ONTOLOGÍA Y VÍNCULOS SEMÁNTICOS│
                 │ Tabla `vinculos_entidades`:       │
                 │ - Persona ↔ Noticia               │
                 │ - Noticia ↔ Fosa                  │
                 │ - Persona ↔ Fosa                  │
                 └─────────────────┬─────────────────┘
                                   │
                                   ▼
                 ┌───────────────────────────────────┐
                 │ 7. BÚSQUEDAS ACTIVAS EN BITÁCORA  │
                 │ El sistema propone al analista en │
                 │ la UI: "Nueva búsqueda sugerida / │
                 │ Posible coincidencia de hallazgo" │
                 └───────────────────────────────────┘
```

---

## 🧩 4. Estructura de Archivos del Backend

```
backend/app/
├── ner/
│   ├── dataset_builder.py          # Extractor ground-truth (pares orig vs anon)
│   ├── data/                       # [IGNORADO EN GIT] dataset_ner_personas.jsonl
│   ├── train_ner.py                # Script de entrenamiento (para correr en GPU)
│   ├── anonymizer.py               # Servicio de anonimización de texto libre
│   └── extractor.py                # Inferencia: extrae Domicilios, Nombres, Fechas
├── miners/
│   ├── query_generator.py          # Crea consultas booleanas para medios de prensa
│   ├── miner_noticias.py           # Ingestor OSINT / noticias locales
│   └── miner_fosas.py              # Ingestor estructurado de hallazgos y fosas
└── ontology/
    ├── models.py                   # Entidades canónicas (Sujeto, Sitio, Evento, Evidencia)
    └── matcher.py                  # Motor de cruce de similitud y scoring de vínculos
```

---

## 🚀 5. Guía de Ejecución en el Servidor GPU (`RTX 5060 Ti 16GB`)

Cuando abras la sesión de desarrollo en el servidor GPU:

### Paso 1: Clonar o sincronizar la rama
```bash
git fetch origin
git checkout feature/ner-ontologia-mineria
```

### Paso 2: Recibir el dataset por SSH
Asegúrate de que el archivo `dataset_ner_personas.jsonl` esté ubicado en `backend/app/ner/data/`.

### Paso 3: Opciones de Entrenamiento Recomendadas para la GPU
1. **Opción A: GLiNER (Zero/Few-Shot Token Representation)**
   * Modelo: `urchade/gliner_medium-v2.1` o `gliner_es`
   * Ventaja: Extraordinariamente rápido, maneja entidades arbitrarias sin colapsar ante texto ruidoso.
2. **Opción B: spaCy + RoBERTa (`es_dep_news_trf`)**
   * Convierte `dataset_ner_personas.jsonl` a formato `.spacy` usando `spacy.tokens.DocBin`.
   * Entrena con `spacy train config.cfg --paths.train ./train.spacy --paths.dev ./dev.spacy --gpu-id 0`.
3. **Opción C: Fine-Tuning de Modelo de Lenguaje Ligero (Qwen2.5-7B-Instruct / Llama-3.2)**
   * Usar LoRA / Unsloth en los 16 GB de VRAM para extracción estructurada JSON schema de alto rendimiento.

---

## 📋 6. Estado Actual en esta Rama

- [x] Rama `feature/ner-ontologia-mineria` creada.
- [x] `.gitignore` blindado para proteger datos sensibles (`*.jsonl`, `data/`).
- [x] `dataset_builder.py` implementado y probado con 100% de éxito.
- [x] 24,727 entidades etiquetadas extraídas localmente en `dataset_ner_personas.jsonl`.
- [x] Documento maestro `PLAN-NER-ONTOLOGIA.md` creado.
- [ ] Pendiente: Implementar `train_ner.py` y `query_generator.py`.
- [ ] Pendiente: Confirmar orden del usuario para commit de los scripts y push de la rama.
