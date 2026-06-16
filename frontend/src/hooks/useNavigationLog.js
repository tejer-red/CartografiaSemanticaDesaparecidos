import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/localDatabase';
import { useAuth } from '../context/AuthContext';
import createLogger from '../utils/logger';

const logger = createLogger('useNavigationLog');

export function useNavigationLog(notebookId) {
  const { user } = useAuth();
  const [navigationLogs, setNavigationLogs] = useState([]);

  const loadLogs = useCallback(async () => {
    if (!notebookId) {
      setNavigationLogs([]);
      return;
    }
    try {
      const logs = await db.navigation_logs
        .where('notebook_id')
        .equals(notebookId)
        .sortBy('timestamp');
      setNavigationLogs(logs.reverse()); // latest first
    } catch (e) {
      logger.error('Error loading navigation logs:', e);
    }
  }, [notebookId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const addNavigationLog = async ({ note, lat, lng }) => {
    if (!notebookId) {
      logger.warn('No active notebook to add navigation log.');
      return;
    }
    const record = {
      notebook_id: notebookId,
      timestamp: new Date().toISOString(),
      note,
      lat,
      lng,
      user_id: user?.id || null
    };
    try {
      await db.navigation_logs.add(record);
      await loadLogs();
      logger.log('Navigation log added:', record);
    } catch (e) {
      logger.error('Error adding navigation log:', e);
    }
  };

  const clearNavigationLogs = async () => {
    if (!notebookId) return;
    try {
      await db.navigation_logs.where('notebook_id').equals(notebookId).delete();
      setNavigationLogs([]);
      logger.log(`Navigation logs cleared for notebook ${notebookId}`);
    } catch (e) {
      logger.error('Error clearing navigation logs:', e);
    }
  };

  return {
    navigationLogs,
    addNavigationLog,
    clearNavigationLogs,
    loadLogs
  };
}
