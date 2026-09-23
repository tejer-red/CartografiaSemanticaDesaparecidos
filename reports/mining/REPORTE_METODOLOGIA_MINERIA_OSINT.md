# Metodología y Arquitectura del Sistema OSINT de Minería de Prensa y Diccionario Evolutivo

**Fecha:** 21 de Septiembre de 2026  
**Sistema:** Plataforma de Cartografía Semántica y Ontología Temporal de Desapariciones (Jalisco)  
**Base de Datos Central:** PostgreSQL (`abeja` / `cartografia_semantica_db`)  

---

## 1. Resumen Ejecutivo y Flujo General

El subsistema de minería de prensa abierta (OSINT - Open Source Intelligence) tiene como objetivo correlacionar en tiempo real y retrospectivo el universo de fichas de personas desaparecidas (5,542 cédulas históricas registradas) con eventos de hallazgo forense, notas rojas policiales, fosas clandestinas y notas periodísticas locales en el Estado de Jalisco.

### Diagrama del Flujo de Datos

```mermaid
flowchart TD
    A[Cédula de Desaparición\n(PostgreSQL: cedulas_privadas)] --> B[Extractor Geográfico\n(Municipio, Colonia, Vialidad Limpia)]
    B --> C[Motor de Formulación Booleana\n(query_generator.py)]
    C -->|Diccionario Evolutivo Adaptativo| D{Búsqueda OSINT Web\n(miner_noticias.py)}
    D -->|Nivel 1: Bing News Engine| E[Resultados Crudos de Prensa]
    D -->|Si 0 resultados| F[Reintento con Cluster Semántico Alternativo\n(Fosas / Modus / Embolsado / Restos)]
    F --> D
    E --> G[Scraper de Contenido Limpio\n(Trafilatura + Extracción Heurística)]
    G --> H[Cotejo Criptográfico PII\n(pii_hash_registry / HMAC-SHA256)]
    H --> I[Cálculo de Confianza Semántica\n(Geografía + Temporalidad + PII)]
    I --> J[Persistencia en Grafo de Conocimiento\n(PostgreSQL: noticias + vinculos_entidades)]
```

---

## 2. Cómo se Formulan las Búsquedas (Generación de Consultas)

Las búsquedas no son cadenas de texto estáticas fijas; se estructuran a partir de los datos limpios de cada ficha mediante `OSINTQueryGenerator`:

1. **Normalización Municipal Canónica:**  
   Se mapean variantes como `"SAN PEDRO TLAQUEPAQUE"` o `"TLAQUEPAQUE"` a su expresión de prensa óptima `("Tlaquepaque" OR "San Pedro Tlaquepaque")`, eliminando ruido gubernamental.
2. **Extracción y Limpieza de Domicilios / Colonias:**  
   Se remueven prefijos viales innecesarios (`CALLE`, `AVENIDA`, `PRIVADA`, códigos postales y números exteriores `#123`) para aislar el topónimo con mayor probabilidad de aparecer en la prensa local.
3. **Niveles de Precisión Booleana:**
   - **Nivel 0 (Natural Web / Bing Engine):**  
     `Municipio "COLONIA" <cluster_términos>`  
     *Ejemplo:* `Zapopan "CONSTITUCIÓN" hallazgo cuerpo`
   - **Nivel 1 (Booleana Estricta Local):**  
     `("Tlaquepaque") AND ("COLONIA" OR "CALLE") AND ("fosa clandestina" OR "hallazgo" OR "cuerpo" OR "restos óseos")`
   - **Nivel 2 (Hallazgo por Polígono / Colonia):**  
     `("Zapopan") AND "COLONIA" AND ("fosa clandestina" OR "cadáver" OR "localizan")`
   - **Nivel 3 (Filtro Hemeroteca Dirigida a Medios Locales):**  
     `(site:informador.mx OR site:milenio.com/jalisco OR site:eloccidental.com.mx) "Guadalajara" "COLONIA" ("hallazgo" OR "cuerpo")`

---

## 3. Estrategia de Búsqueda y Extracción Web

1. **Motores de Consulta:**
   - **Bing News Endpoint:** Ofrece indexación cronológica precisa para medios de comunicación mexicanos y jaliscienses, alta estabilidad y baja tasa de bloqueo para agentes de investigación.
   - **Rotación de Cabeceras:** Cada petición utiliza User-Agents aleatorios y tiempos de jitter dinámico entre 3.5 y 6.0 segundos para evitar saturación de IPs y bloqueos HTTP 429.
2. **Extracción de Contenido Completo (Full-Text):**
   - Una vez obtenida la URL de la nota, se procesa mediante **Trafilatura**, aislando el titular, fecha de publicación y texto del cuerpo, omitiendo anuncios publicitarios y navegación del sitio.

---

## 4. El Diccionario Evolutivo de Búsqueda (Adaptive Vocabulary Expansion)

### El Problema de los Keywords Estáticos:
Si una búsqueda siempre utiliza `"hallazgo cuerpo"`, el sistema omitirá eventos de alto impacto donde la prensa jalisciense titula de forma diversa:
* *"Localizan osamenta en predio abandonado..."*
* *"Encuentran bolsas con restos humanos en fosa clandestina..."*
* *"Hallan cadáver calcinado / embolsado / en maleta..."*

### La Solución Implementada: Clusters Semánticos y Diccionario Dinámico

El vocabulario de búsqueda se ha enriquecido en 4 clusters temáticos prioritarios derivados del análisis empírico de las más de 550 noticias recolectadas en Jalisco:

| Cluster | Términos Clave de Búsqueda | Frecuencia / Contexto en Jalisco |
| :--- | :--- | :--- |
| **Primario (General)** | `hallazgo cuerpo`, `cuerpo sin vida`, `localizan cadáver` | Términos estándar de nota roja en ZMG. |
| **Fosas y Clandestinidad** | `fosa clandestina`, `fosas clandestinas`, `predio fosa` | Crucial en Tlajomulco, Zapopan y Tlaquepaque. |
| **Restos y Modus Operandi** | `restos humanos embolsado`, `en bolsas`, `en maleta`, `calcinado`, `encobijado` | Contenedores y patrones recurrentes de ocultamiento. |
| **Osamentas y Búsquedas** | `restos óseos`, `osamenta`, `colectivo localiza` | Hallazgos por brigadas ciudadanas y restos antiguos. |

### Lógica de Reintento Adaptativo en Cascada:
```
[Caso Evaluado]
       │
       ▼
1. Intento Nivel 0 (Cluster Primario: "hallazgo cuerpo")
       │
       ├──> ¿Encontró artículos? ──[SÍ]──> Guardar y Vincular
       │
      [NO]
       │
       ▼
2. Fallback Adaptativo 1 (Cluster Fosas / Restos: "fosa clandestina" OR "restos humanos embolsado")
       │
       ├──> ¿Encontró artículos? ──[SÍ]──> Guardar y Vincular
       │
      [NO]
       │
       ▼
3. Fallback Adaptativo 2 (Cluster Modus / Maleta / Calcinado)
       │
       ├──> ¿Encontró artículos? ──[SÍ]──> Guardar y Vincular
       │
      [NO]
       │
       ▼
Marcar Caso como [REVISADO_SIN_NOTICIA] en Ontología
```

---

## 5. Correlación Semántica y Criptográfica en el Grafo

Cuando una noticia es extraída, el sistema no la almacena de manera aislada:
1. **Cálculo de Similitud Geográfica y Temporal:**  
   - Si la nota menciona el mismo municipio: +10% confianza.
   - Si la nota menciona la misma colonia: +15% confianza.
2. **Cotejo de PII Criptográfica (Zero-Knowledge):**  
   - El texto completo de la noticia se coteja contra el catálogo `pii_hash_registry` (15,115 valores canónicos de nombres, teléfonos y domicilios previamente tokenizados mediante HMAC-SHA256 con sal secreta).
   - Si hay coincidencia de un domicilio o nombre: +20% confianza inmediata y se crea una arista `HASH_* -> MENCIONADO_EN_NOTICIA -> NOTICIA`.
3. **Persistencia de Aristas Ontológicas:**  
   - Se crea el vínculo `CASO_<id> -> MENCIONADO_EN_NOTICIA -> NOTICIA_<id>` con estado `APROBADO` (si confianza ≥ 0.85) o `SUGERIDO`.

---

## 6. Monitoreo y Próximos Pasos

1. **Expansión Automática de n-gramas:** Un cron job periódico puede extraer los bigramas emergentes con mayor frecuencia en la tabla `noticias` para sugerir automáticamente nuevas palabras clave al diccionario de búsqueda.
2. **Enriquecimiento del Frontend:** Visualización en el Grafo Semántico (`SemanticGraph.jsx`) de los nodos de noticias agrupados por el cluster de modus operandi que los descubrió.
