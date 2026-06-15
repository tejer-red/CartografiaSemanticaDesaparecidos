import React, { useEffect } from 'react';
import { useData } from '../../context/DataContext';

import createLogger from '../../utils/logger';
const logger = createLogger('FetchForense');


const FetchForense = ({ fetchForense, fetchId, onFetchComplete }) => {
  const { 
    map, 
    mapLoaded, 
    startDate, 
    endDate,
    updateLoadingStatus
  } = useData();

  useEffect(() => {
    const fetchData = async () => {
      if (!fetchForense) {
        updateLoadingStatus('forense', false);
        return;
      }
      if (!mapLoaded || !map) {
        logger.log('Map not ready');
        return;
      }

      try {
        updateLoadingStatus('forense', true);
        // ...existing fetch code...

      } catch (error) {
        logger.error('Error fetching forense:', error);
      } finally {
        updateLoadingStatus('forense', false);
        onFetchComplete?.();
      }
    };

    if (fetchId > 0) {
      fetchData();
    }
  }, [fetchId, fetchForense, map, mapLoaded, startDate, endDate]);

  return null;
};

export default FetchForense;