from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime

# ----------------- Sena -----------------
class SenaBase(BaseModel):
    especificacion_general: Optional[str] = None
    parte_cuerpo: Optional[str] = None
    tipo_sena: Optional[str] = None
    descripcion: Optional[str] = None

class SenaOut(SenaBase):
    id: int
    id_cedula_busqueda: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- Inferencia3 -----------------
class Inferencia3Base(BaseModel):
    tipo_loc: Optional[str] = None
    loc: Optional[str] = None
    lat_long: Optional[str] = None
    fecha: Optional[str] = None
    sum_score: Optional[float] = None
    violence_score: Optional[float] = None
    violence_terms: Optional[str] = None

class Inferencia3Out(Inferencia3Base):
    id_cedula_busqueda: str

    class Config:
        from_attributes = True

# ----------------- Etiqueta -----------------
class EtiquetaBase(BaseModel):
    nombre: str

class EtiquetaCreate(EtiquetaBase):
    pass

class EtiquetaOut(EtiquetaBase):
    id: int

    class Config:
        from_attributes = True

# ----------------- Noticia -----------------
class NoticiaBase(BaseModel):
    url: str
    titular: str
    fecha: Optional[date] = None
    caso_id: Optional[str] = None
    fosa_id: Optional[int] = None

class NoticiaCreate(NoticiaBase):
    pass

class NoticiaOut(NoticiaBase):
    id: int

    class Config:
        from_attributes = True

# ----------------- Fosa -----------------
class FosaBase(BaseModel):
    coordenadas: str
    fecha_hallazgo: Optional[date] = None
    estado: Optional[str] = None
    municipio: Optional[str] = None
    total_fosas: Optional[int] = None
    total_cuerpos: Optional[int] = None
    total_restos_fragmentos: Optional[int] = None

class FosaCreate(FosaBase):
    pass

class FosaOut(FosaBase):
    id: int

    class Config:
        from_attributes = True

# ----------------- Caso -----------------
class CasoBase(BaseModel):
    autorizacion_informacion_publica: Optional[str] = None
    condicion_localizacion: Optional[str] = None
    nombre_completo: Optional[str] = None
    edad_momento_desaparicion: Optional[int] = None
    sexo: Optional[str] = None
    genero: Optional[str] = None
    complexion: Optional[str] = None
    estatura: Optional[str] = None
    tez: Optional[str] = None
    cabello: Optional[str] = None
    ojos_color: Optional[str] = None
    municipio: Optional[str] = None
    estado: Optional[str] = None
    fecha_desaparicion: Optional[str] = None
    estatus_persona_desaparecida: Optional[str] = None
    descripcion_desaparicion: Optional[str] = None
    ruta_foto: Optional[str] = None
    fosa_id: Optional[int] = None

class CasoCreate(CasoBase):
    id_cedula_busqueda: str

class CasoOut(CasoBase):
    id_cedula_busqueda: str
    etiquetas: List[EtiquetaOut] = []
    noticias: List[NoticiaOut] = []
    inferencia: Optional[Inferencia3Out] = None
    senas: List[SenaOut] = []

    class Config:
        from_attributes = True

# ----------------- PersonaFallecidaSinIdentificar -----------------
class PersonaFallecidaSinIdentificarBase(BaseModel):
    Fecha_Ingreso: Optional[date] = None
    Sexo: Optional[str] = None
    Probable_nombre: Optional[str] = None
    Edad: Optional[str] = None
    Tatuajes: Optional[str] = None
    Indumentarias: Optional[str] = None
    Senas_Particulares: Optional[str] = None
    Delegacion_IJCF: Optional[str] = None

class PersonaFallecidaSinIdentificarOut(PersonaFallecidaSinIdentificarBase):
    ID: str

    class Config:
        from_attributes = True

# ----------------- Notebook -----------------
class NotebookCreate(BaseModel):
    name: str  # maps to id
    notes: List[Any]
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class NotebookOut(BaseModel):
    id: str
    notes: List[Any]
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
