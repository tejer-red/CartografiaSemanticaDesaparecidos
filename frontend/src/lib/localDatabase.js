import Dexie from 'dexie';

export const db = new Dexie('CartografiaLocal');

db.version(1).stores({
  local_fosas: '++id, uuid, lat, lng, estado, municipio, fecha_hallazgo, user_id, created_at',
  local_pfsi: '++id, uuid, fosa_uuid, descripcion_forense, user_id, created_at',
  local_noticias: '++id, uuid, url, titular, contenido, lat, lng, fecha, user_id, created_at',
  local_cedulas: '++id, uuid, nombre_completo, sexo, edad, estatus, lat, lng, fecha_desaparicion, user_id, created_at',
  local_vinculos: '++id, uuid, source_uuid, target_uuid, tipo_relacion, descripcion, user_id, created_at',
});
