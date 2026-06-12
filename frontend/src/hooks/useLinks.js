import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/localDatabase';
import { useAuth } from '../context/AuthContext';
import createLogger from '../utils/logger';

const logger = createLogger('useLinks');

export const RELATION_TYPES = {
  MENCIONA_HALLAZGO: 'MENCIONA_HALLAZGO',
  PERTENECE_A_FOSA: 'PERTENECE_A_FOSA',
  RELACIONADO_CON: 'RELACIONADO_CON',
  IDENTIFICADO_COMO: 'IDENTIFICADO_COMO',
  REPORTADO_EN: 'REPORTADO_EN',
};

export const useLinks = () => {
  const { user } = useAuth();

  const getUserId = () => {
    if (!user) throw new Error('Usuario no autenticado');
    return user.id;
  };

  const createLink = useCallback(async (sourceUuid, targetUuid, tipoRelacion, descripcion = '') => {
    try {
      const record = {
        uuid: uuidv4(),
        source_uuid: sourceUuid,
        target_uuid: targetUuid,
        tipo_relacion: tipoRelacion,
        descripcion,
        user_id: getUserId(),
        created_at: new Date().getTime(),
      };
      await db.local_vinculos.add(record);
      logger.log('Vínculo creado:', record);
      return record.uuid;
    } catch (error) {
      logger.error('Error al crear vínculo:', error);
      throw error;
    }
  }, [user]);

  const getLinksForEntity = useCallback(async (entityUuid) => {
    if (!user) return [];
    
    // Dexie doesn't support logical OR directly in basic queries well without compound indexes or doing it in memory.
    // Since local data is relatively small, we query all user links and filter in memory for max flexibility.
    const allUserLinks = await db.local_vinculos.where('user_id').equals(user.id).toArray();
    
    return allUserLinks.filter(
      link => link.source_uuid === entityUuid || link.target_uuid === entityUuid
    );
  }, [user]);

  const deleteLink = useCallback(async (uuid) => {
    try {
      await db.local_vinculos.where('uuid').equals(uuid).delete();
      logger.log('Vínculo eliminado:', uuid);
    } catch (error) {
      logger.error('Error al eliminar vínculo:', error);
      throw error;
    }
  }, []);

  const getLinksGraph = useCallback(async () => {
    if (!user) return [];
    return await db.local_vinculos.where('user_id').equals(user.id).toArray();
  }, [user]);

  return {
    createLink,
    getLinksForEntity,
    deleteLink,
    getLinksGraph,
  };
};
