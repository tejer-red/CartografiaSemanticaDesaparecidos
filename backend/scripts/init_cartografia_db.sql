-- Script de inicialización para cartografia_semantica_db (PostgreSQL)

-- 1. Capa Privada: Cédulas con PII real
CREATE TABLE IF NOT EXISTS cedulas_privadas (
    id VARCHAR(36) PRIMARY KEY,
    id_expediente VARCHAR(100),
    nombre_real VARCHAR(255),
    telefono_contacto VARCHAR(100),
    domicilio_real TEXT,
    municipio VARCHAR(100),
    colonia VARCHAR(100),
    fecha_desaparicion VARCHAR(10),
    text_original TEXT NOT NULL,
    metadata_privada JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cedulas_privadas_mpio ON cedulas_privadas(municipio);
CREATE INDEX IF NOT EXISTS idx_cedulas_privadas_fecha ON cedulas_privadas(fecha_desaparicion);

-- 2. Capa Diccionario Criptográfico de Hashes (HMAC-SHA256)
CREATE TABLE IF NOT EXISTS pii_hash_registry (
    hash_id VARCHAR(64) PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,
    canonical_value TEXT NOT NULL,
    salt_version INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pii_hash_entity_type ON pii_hash_registry(entity_type);

-- 3. Capa Pública: Cédulas Anonimizadas (Tabla ya existente o nueva)
CREATE TABLE IF NOT EXISTS cedulas_anonimizadas (
    id_cedula_busqueda VARCHAR(36) PRIMARY KEY,
    autorizacion_informacion_publica VARCHAR(2),
    condicion_localizacion VARCHAR(9),
    nombre_completo VARCHAR(50),
    edad_momento_desaparicion INT,
    sexo VARCHAR(6),
    genero VARCHAR(12),
    complexion VARCHAR(9),
    estatura VARCHAR(4),
    tez VARCHAR(13),
    cabello VARCHAR(46),
    ojos_color VARCHAR(12),
    municipio VARCHAR(29),
    estado VARCHAR(19),
    fecha_desaparicion VARCHAR(10),
    estatus_persona_desaparecida VARCHAR(20),
    descripcion_desaparicion TEXT,
    ruta_foto VARCHAR(94),
    fosa_id INT
);

CREATE INDEX IF NOT EXISTS idx_cedulas_anon_fecha ON cedulas_anonimizadas(fecha_desaparicion);
CREATE INDEX IF NOT EXISTS idx_cedulas_anon_mpio ON cedulas_anonimizadas(municipio);

-- 4. Capa Grafo: Vínculos de la Ontología Semántica
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
