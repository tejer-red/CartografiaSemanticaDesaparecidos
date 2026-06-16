import Dexie from 'dexie';

export const db = new Dexie('CartografiaLocal');

db.version(1).stores({
  local_fosas: '++id, uuid, lat, lng, estado, municipio, fecha_hallazgo, user_id, created_at',
  local_pfsi: '++id, uuid, fosa_uuid, descripcion_forense, user_id, created_at',
  local_noticias: '++id, uuid, url, titular, contenido, lat, lng, fecha, user_id, created_at',
  local_cedulas: '++id, uuid, nombre_completo, sexo, edad, estatus, lat, lng, fecha_desaparicion, user_id, created_at',
  local_vinculos: '++id, uuid, source_uuid, target_uuid, tipo_relacion, descripcion, user_id, created_at',
});

db.version(2).stores({
  local_fosas: '++id, uuid, notebook_id, lat, lng, estado, municipio, fecha_hallazgo, user_id, created_at',
  local_pfsi: '++id, uuid, notebook_id, fosa_uuid, descripcion_forense, user_id, created_at',
  local_noticias: '++id, uuid, notebook_id, url, titular, contenido, lat, lng, fecha, user_id, created_at',
  local_cedulas: '++id, uuid, notebook_id, nombre_completo, sexo, edad, estatus, lat, lng, fecha_desaparicion, user_id, created_at',
  local_vinculos: '++id, uuid, notebook_id, source_uuid, target_uuid, tipo_relacion, descripcion, user_id, created_at',
  notebooks: '++id, name, created_at, updated_at', // configJSON and dates will be part of the object but don't need to be indexed
  navigation_logs: '++id, notebook_id, timestamp, lat, lng, user_id' // note content doesn't need to be indexed
});
