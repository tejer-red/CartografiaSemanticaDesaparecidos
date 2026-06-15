import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/localDatabase';
import { useAuth } from '../context/AuthContext';
import createLogger from '../utils/logger';

const logger = createLogger('useLocalData');

export const useLocalData = () => {
  const { user } = useAuth();

  const getUserId = () => {
    if (!user) throw new Error('Usuario no autenticado');
    return user.id;
  };

  const createBaseRecord = () => ({
    uuid: uuidv4(),
    user_id: getUserId(),
    created_at: new Date().getTime(), // Usar timestamp para consistencia con frontend actual
  });

  // FOSAS
  const addLocalFosa = useCallback(async (data) => {
    try {
      const record = { ...data, ...createBaseRecord() };
      await db.local_fosas.add(record);
      logger.log('Fosa local creada:', record);
      return record.uuid;
    } catch (error) {
      logger.error('Error al crear fosa local:', error);
      throw error;
    }
  }, [user]);

  const getLocalFosas = useCallback(async () => {
    if (!user) return [];
    return await db.local_fosas.where('user_id').equals(user.id).toArray();
  }, [user]);

  // NOTICIAS
  const addLocalNoticia = useCallback(async (data) => {
    try {
      const record = { ...data, ...createBaseRecord() };
      await db.local_noticias.add(record);
      logger.log('Noticia local creada:', record);
      return record.uuid;
    } catch (error) {
      logger.error('Error al crear noticia local:', error);
      throw error;
    }
  }, [user]);

  const getLocalNoticias = useCallback(async () => {
    if (!user) return [];
    return await db.local_noticias.where('user_id').equals(user.id).toArray();
  }, [user]);

  // CEDULAS
  const addLocalCedula = useCallback(async (data) => {
    try {
      const record = { ...data, ...createBaseRecord() };
      await db.local_cedulas.add(record);
      logger.log('Cédula local creada:', record);
      return record.uuid;
    } catch (error) {
      logger.error('Error al crear cédula local:', error);
      throw error;
    }
  }, [user]);

  const getLocalCedulas = useCallback(async () => {
    if (!user) return [];
    return await db.local_cedulas.where('user_id').equals(user.id).toArray();
  }, [user]);

  // PFSI (Restos Forenses en Fosas)
  const addLocalPFSI = useCallback(async (fosaUuid, data) => {
    try {
      const record = { ...data, fosa_uuid: fosaUuid, ...createBaseRecord() };
      await db.local_pfsi.add(record);
      logger.log('PFSI local creado:', record);
      return record.uuid;
    } catch (error) {
      logger.error('Error al crear PFSI local:', error);
      throw error;
    }
  }, [user]);

  const getLocalPFSIForFosa = useCallback(async (fosaUuid) => {
    if (!user) return [];
    return await db.local_pfsi
      .where('fosa_uuid').equals(fosaUuid)
      .and(record => record.user_id === user.id)
      .toArray();
  }, [user]);

  // OPERACIONES GENÉRICAS
  const updateLocalRecord = useCallback(async (table, uuid, data) => {
    try {
      await db[table].where('uuid').equals(uuid).modify({
        ...data,
        updated_at: new Date().getTime(),
      });
      logger.log(`Registro actualizado en ${table}:`, uuid);
    } catch (error) {
      logger.error(`Error al actualizar en ${table}:`, error);
      throw error;
    }
  }, []);

  const deleteLocalRecord = useCallback(async (table, uuid) => {
    try {
      await db[table].where('uuid').equals(uuid).delete();
      logger.log(`Registro eliminado de ${table}:`, uuid);
    } catch (error) {
      logger.error(`Error al eliminar registro de ${table}:`, error);
      throw error;
    }
  }, []);

  const clearAllLocalData = useCallback(async () => {
    if (!user) return;
    try {
      await db.local_fosas.where('user_id').equals(user.id).delete();
      await db.local_noticias.where('user_id').equals(user.id).delete();
      await db.local_cedulas.where('user_id').equals(user.id).delete();
      await db.local_vinculos.where('user_id').equals(user.id).delete();
      logger.log('Todos los datos locales han sido borrados');
    } catch (error) {
      logger.error('Error al borrar datos locales:', error);
      throw error;
    }
  }, [user]);

  return {
    addLocalFosa,
    getLocalFosas,
    addLocalNoticia,
    getLocalNoticias,
    addLocalCedula,
    getLocalCedulas,
    addLocalPFSI,
    getLocalPFSIForFosa,
    updateLocalRecord,
    deleteLocalRecord,
    clearAllLocalData
  };
};
