-- ============================================================================
-- 🚀 ESQUEMA CANÓNICO PARA SUPABASE (NUBE PÚBLICA - DATOS HASHEADOS)
-- ============================================================================
-- Este script crea las tablas necesarias en la nueva base de datos de Supabase.
-- GARANTIZA LA RETROCOMPATIBILIDAD CON EL FRONTEND ACTUAL.
-- NOTA: NO INCLUYE TABLAS PRIVADAS (cedulas_privadas, pii_hash_registry).

-- ----------------------------------------------------------------------------
-- 1. Capa Pública: Cédulas Anonimizadas
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fosas (
    id SERIAL PRIMARY KEY,
    coordenadas VARCHAR(100) NOT NULL,
    fecha_hallazgo DATE,
    estado VARCHAR(100),
    municipio VARCHAR(100),
    total_fosas INT,
    total_cuerpos INT,
    total_restos_fragmentos INT
);

CREATE TABLE IF NOT EXISTS cedulas_anonimizadas (
    id_cedula_busqueda VARCHAR(36) PRIMARY KEY,
    autorizacion_informacion_publica VARCHAR(2),
    condicion_localizacion VARCHAR(20), -- Modificado de 9 a 20 para acomodar 'NO APLICA' si es necesario
    nombre_completo VARCHAR(100), -- Ampliado para alojar [NOMBRE_HASH_xxxx]
    edad_momento_desaparicion INT,
    sexo VARCHAR(6),
    genero VARCHAR(12),
    complexion VARCHAR(9),
    estatura VARCHAR(4),
    tez VARCHAR(13),
    cabello VARCHAR(46),
    ojos_color VARCHAR(12),
    municipio VARCHAR(50), -- Ampliado preventivamente
    estado VARCHAR(50),    -- Ampliado preventivamente
    fecha_desaparicion VARCHAR(10),
    estatus_persona_desaparecida VARCHAR(50),
    descripcion_desaparicion TEXT,
    ruta_foto VARCHAR(255),
    fosa_id INT REFERENCES fosas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cedulas_anon_fecha ON cedulas_anonimizadas(fecha_desaparicion);
CREATE INDEX IF NOT EXISTS idx_cedulas_anon_mpio ON cedulas_anonimizadas(municipio);

-- ----------------------------------------------------------------------------
-- 2. Capa Geoespacial
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS repd_vp_inferencia3 (
    id_cedula_busqueda VARCHAR(36) PRIMARY KEY REFERENCES cedulas_anonimizadas(id_cedula_busqueda) ON DELETE CASCADE,
    tipo_loc VARCHAR(255),
    loc TEXT,
    lat_long VARCHAR(255),
    fecha VARCHAR(255),
    sum_score FLOAT,
    violence_score FLOAT,
    violence_terms TEXT
);

-- ----------------------------------------------------------------------------
-- 3. Capa Hemerográfica y Ontológica (Prensa OSINT y Red Semántica)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS noticias_corpus (
    id SERIAL PRIMARY KEY,
    url VARCHAR(1000) NOT NULL UNIQUE,
    titular VARCHAR(500) NOT NULL,
    fecha DATE,
    municipio_extraido VARCHAR(100),
    colonia_extraida VARCHAR(100),
    referencia_ubicacion TEXT,
    coordenadas VARCHAR(100),
    lat FLOAT,
    lng FLOAT,
    geocode_precision VARCHAR(20),
    cuerpo_texto TEXT,
    resumen_hallazgo TEXT,
    total_cuerpos_estimado INT,
    total_restos_estimado INT,
    keywords_matched TEXT[], -- ARRAY en Postgres
    ciclo_expansion INT DEFAULT 0,
    confidence_score FLOAT,
    metadata_extraccion JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_noticias_corpus_mpio ON noticias_corpus(municipio_extraido);

CREATE TABLE IF NOT EXISTS vinculos_entidades (
    id SERIAL PRIMARY KEY,
    source_node VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    target_node VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    relation_type VARCHAR(50) NOT NULL,
    confidence_score FLOAT DEFAULT 1.0 NOT NULL,
    estado_aprobacion VARCHAR(20) DEFAULT 'APROBADO',
    metadata_relacion JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vinculos_source ON vinculos_entidades(source_node);
CREATE INDEX IF NOT EXISTS idx_vinculos_target ON vinculos_entidades(target_node);
CREATE INDEX IF NOT EXISTS idx_vinculos_relation ON vinculos_entidades(relation_type);
CREATE INDEX IF NOT EXISTS idx_vinculos_estado ON vinculos_entidades(estado_aprobacion);

-- ----------------------------------------------------------------------------
-- 4. Capa de Aplicación Frontend
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notebooks (
    id VARCHAR(255) PRIMARY KEY,
    notes JSONB NOT NULL,
    startDate VARCHAR(50),
    endDate VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- POLÍTICAS RLS BÁSICAS (Row Level Security)
-- ----------------------------------------------------------------------------
-- Permite lectura pública a todas las tablas para usuarios anónimos (si es necesario)
-- O ajusta según las necesidades de Supabase.

-- ALTER TABLE cedulas_anonimizadas ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Lectura publica cedulas_anonimizadas" ON cedulas_anonimizadas FOR SELECT TO anon USING (true);
-- Repetir para el resto según configuración de Auth de Supabase deseada.
