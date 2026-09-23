from sqlalchemy import Column, Integer, String, Text, Date, Float, ForeignKey, Table, JSON, DateTime, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Tabla intermedia para etiquetas y casos (Many-to-Many)
caso_etiqueta = Table(
    'caso_etiqueta',
    Base.metadata,
    Column('caso_id', String(36), ForeignKey('cedulas_anonimizadas.id_cedula_busqueda', ondelete='CASCADE'), primary_key=True),
    Column('etiqueta_id', Integer, ForeignKey('etiquetas.id', ondelete='CASCADE'), primary_key=True)
)

class Caso(Base):
    __tablename__ = "cedulas_anonimizadas"

    id_cedula_busqueda = Column(String(36), primary_key=True, index=True)
    autorizacion_informacion_publica = Column(String(2), nullable=True)
    condicion_localizacion = Column(String(9), nullable=True)
    nombre_completo = Column(String(50), nullable=True)
    edad_momento_desaparicion = Column(Integer, nullable=True)
    sexo = Column(String(6), nullable=True)
    genero = Column(String(12), nullable=True)
    complexion = Column(String(9), nullable=True)
    estatura = Column(String(4), nullable=True)
    tez = Column(String(13), nullable=True)
    cabello = Column(String(46), nullable=True)
    ojos_color = Column(String(12), nullable=True)
    municipio = Column(String(29), nullable=True)
    estado = Column(String(19), nullable=True)
    fecha_desaparicion = Column(String(10), nullable=True, index=True)
    estatus_persona_desaparecida = Column(String(20), nullable=True)
    descripcion_desaparicion = Column(String(2292), nullable=True)
    ruta_foto = Column(String(94), nullable=True)

    # Relaciones adicionales (nuevas de la migración)
    fosa_id = Column(Integer, ForeignKey('fosas.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    etiquetas = relationship("Etiqueta", secondary=caso_etiqueta, back_populates="casos")
    noticias = relationship("Noticia", back_populates="caso")
    fosa = relationship("Fosa", back_populates="casos")
    
    # Legacy relationships
    inferencia = relationship("Inferencia3", uselist=False, back_populates="caso",
                              primaryjoin="Caso.id_cedula_busqueda == Inferencia3.id_cedula_busqueda",
                              foreign_keys="[Inferencia3.id_cedula_busqueda]")
    senas = relationship("Sena", back_populates="caso",
                         primaryjoin="Caso.id_cedula_busqueda == Sena.id_cedula_busqueda",
                         foreign_keys="[Sena.id_cedula_busqueda]")


class Inferencia3(Base):
    __tablename__ = "repd_vp_inferencia3"

    id_cedula_busqueda = Column(String(255), ForeignKey('cedulas_anonimizadas.id_cedula_busqueda', ondelete='CASCADE'), primary_key=True)
    tipo_loc = Column(String(255), nullable=True)
    loc = Column(Text, nullable=True)
    lat_long = Column(String(255), nullable=True)
    fecha = Column(String(255), nullable=True)
    sum_score = Column(Float, nullable=True)
    violence_score = Column(Float, nullable=True)
    violence_terms = Column(Text, nullable=True)

    caso = relationship("Caso", back_populates="inferencia")


class Sena(Base):
    __tablename__ = "repd_vp_cedulas_senas"

    id = Column(Integer, primary_key=True, index=True)
    id_cedula_busqueda = Column(String(36), ForeignKey('cedulas_anonimizadas.id_cedula_busqueda', ondelete='CASCADE'), nullable=True)
    especificacion_general = Column(Text, nullable=True)
    parte_cuerpo = Column(Text, nullable=True)
    tipo_sena = Column(String(50), nullable=True)
    descripcion = Column(Text, nullable=True)

    caso = relationship("Caso", back_populates="senas")


class PersonaFallecidaSinIdentificar(Base):
    __tablename__ = "pfsi_v2_principal"

    ID = Column(String(10), primary_key=True, index=True)
    Fecha_Ingreso = Column(Date, nullable=True)
    Sexo = Column(String(10), nullable=True)
    Probable_nombre = Column(String(255), nullable=True)
    Edad = Column(String(50), nullable=True)
    Tatuajes = Column(Text, nullable=True)
    Indumentarias = Column(String(255), nullable=True)
    Senas_Particulares = Column(Text, nullable=True)
    Delegacion_IJCF = Column(String(100), nullable=True)


class Etiqueta(Base):
    __tablename__ = "etiquetas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, index=True, nullable=False)

    casos = relationship("Caso", secondary=caso_etiqueta, back_populates="etiquetas")


class Fosa(Base):
    __tablename__ = "fosas"

    id = Column(Integer, primary_key=True, index=True)
    coordenadas = Column(String(100), nullable=False)  # "lat, lon"
    fecha_hallazgo = Column(Date, nullable=True)
    estado = Column(String(100), nullable=True)
    
    # Extended properties from CSV
    municipio = Column(String(100), nullable=True)
    total_fosas = Column(Integer, nullable=True)
    total_cuerpos = Column(Integer, nullable=True)
    total_restos_fragmentos = Column(Integer, nullable=True)

    casos = relationship("Caso", back_populates="fosa")
    noticias = relationship("Noticia", back_populates="fosa")


class Noticia(Base):
    __tablename__ = "noticias"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(1000), nullable=False)
    titular = Column(String(500), nullable=False)
    fecha = Column(Date, nullable=True)
    coordenadas = Column(String(100), nullable=True)

    caso_id = Column(String(36), ForeignKey('cedulas_anonimizadas.id_cedula_busqueda', ondelete='CASCADE'), nullable=True)
    fosa_id = Column(Integer, ForeignKey('fosas.id', ondelete='CASCADE'), nullable=True)
    cuerpo_texto = Column(Text, nullable=True)
    query_origen = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)

    caso = relationship("Caso", back_populates="noticias")
    fosa = relationship("Fosa", back_populates="noticias")


class NoticiaCorpus(Base):
    __tablename__ = "noticias_corpus"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(1000), nullable=False, unique=True)
    titular = Column(String(500), nullable=False)
    fecha = Column(Date, nullable=True)
    municipio_extraido = Column(String(100), nullable=True, index=True)
    colonia_extraida = Column(String(100), nullable=True)
    referencia_ubicacion = Column(Text, nullable=True)
    coordenadas = Column(String(100), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    geocode_precision = Column(String(20), nullable=True)
    cuerpo_texto = Column(Text, nullable=True)
    resumen_hallazgo = Column(Text, nullable=True)
    total_cuerpos_estimado = Column(Integer, nullable=True)
    total_restos_estimado = Column(Integer, nullable=True)
    keywords_matched = Column(ARRAY(String), nullable=True)
    ciclo_expansion = Column(Integer, default=0)
    confidence_score = Column(Float, nullable=True)
    metadata_extraccion = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())



class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(String(255), primary_key=True, index=True)
    notes = Column(JSON, nullable=False)
    startDate = Column(String(50), nullable=True)
    endDate = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==============================================================================
# 🔒 MODELOS DE LA ARQUITECTURA EN 4 CAPAS (NER, PII HASHING Y ONTOLOGÍA)
# ==============================================================================

class CedulaPrivada(Base):
    """
    Capa 1: Almacenamiento Privado de Cédulas y Expedientes con PII Real.
    Solo accesible en red local por analistas autorizados.
    """
    __tablename__ = "cedulas_privadas"

    id = Column(String(36), primary_key=True, index=True)
    id_expediente = Column(String(100), nullable=True, index=True)
    nombre_real = Column(String(255), nullable=True)
    telefono_contacto = Column(String(100), nullable=True)
    domicilio_real = Column(Text, nullable=True)
    municipio = Column(String(100), nullable=True, index=True)
    colonia = Column(String(100), nullable=True)
    fecha_desaparicion = Column(String(10), nullable=True, index=True)
    text_original = Column(Text, nullable=False)
    metadata_privada = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PiiHashRegistry(Base):
    """
    Capa 2: Diccionario Criptográfico de Hashes HMAC-SHA256.
    Mapea de forma protegida el hash público hacia el valor canónico real.
    """
    __tablename__ = "pii_hash_registry"

    hash_id = Column(String(64), primary_key=True, index=True)  # HMAC-SHA256
    entity_type = Column(String(32), nullable=False, index=True) # NOMBRE, DOMICILIO, TELEFONO, etc.
    canonical_value = Column(Text, nullable=False)              # Texto normalizado original
    salt_version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class VinculoEntidad(Base):
    """
    Capa 4: Grafo de Conocimiento y Ontología Semántica.
    Almacena las aristas relacionales entre Persona ↔ Noticia ↔ Fosa.
    Soporta aristas sólidas (confianza 1.0) y aristas sugeridas por RAG/LLM (0.5-0.8).
    """
    __tablename__ = "vinculos_entidades"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_node = Column(String(100), nullable=False, index=True) # ej. "CASO_c1dff4a5"
    source_type = Column(String(50), nullable=False)              # "PERSONA", "CASO"
    target_node = Column(String(100), nullable=False, index=True) # ej. "DOMICILIO_HASH_a8f3b", "NOTICIA_99"
    target_type = Column(String(50), nullable=False)              # "HASH_DOMICILIO", "NOTICIA", "FOSA"
    relation_type = Column(String(50), nullable=False, index=True)# "OCURRIO_EN", "MENCIONA_A", "VINCULADO_A"
    confidence_score = Column(Float, nullable=False, default=1.0) # 1.0 (Hash Exacto), 0.5-0.8 (Sugerido LLM)
    estado_aprobacion = Column(String(20), default="APROBADO")    # "APROBADO", "SUGERIDO", "DESCARTADO"
    metadata_relacion = Column(JSON, nullable=True)               # Justificación, fechas, municipios
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CasoPatronForense(Base):
    """
    Capa 3: Extracción Forense y Descriptiva de Patrones Criminales.
    Estructura vehículos, armas, modus operandi y parentescos desde la narrativa libre.
    """
    __tablename__ = "caso_patrones_forenses"

    caso_id = Column(String(36), primary_key=True, index=True)
    modus_operandi_tipo = Column(String(60), nullable=True, index=True)
    vehiculo_victima = Column(JSON, nullable=True)
    vehiculo_perpetradores = Column(JSON, nullable=True)
    armas_observadas = Column(String(50), nullable=True, index=True)
    num_perpetradores = Column(String(50), nullable=True)
    reportante_parentesco = Column(String(50), nullable=True)
    acompanantes_desaparecidos = Column(JSON, nullable=True)
    resumen_forense = Column(Text, nullable=True)
    lugar_tipo = Column(String(50), nullable=True)
    nombre_lugar_institucion = Column(String(255), nullable=True)
    indicio_dejado = Column(String(50), nullable=True)
    contenido_indicio = Column(Text, nullable=True)
    destino_declarado = Column(String(255), nullable=True)
    confianza_extraccion = Column(Float, default=1.0)
    raw_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


