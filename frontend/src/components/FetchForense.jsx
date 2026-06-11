import React, { useEffect } from 'react';
import { useData } from '../context/DataContext';

import createLogger from '../utils/logger';
const logger = createLogger('FetchForense');


const FetchForense = ({ fetchForense, fetchId, onFetchComplete }) => {
  const { 
    map, 
    mapLoaded, 
    startDate, 
    endDate 
  } = useData();

  useEffect(() => {
    const fetchData = async () => {
      if (!fetchForense || !mapLoaded || !map) {
        logger.log('Map not ready or fetch not enabled');
        return;
      }

      try {
        // ...existing fetch code...

      } catch (error) {
        logger.error('Error fetching forense:', error);
      } finally {
        onFetchComplete?.();
      }
    };

    fetchData();
  }, [fetchId, fetchForense, map, mapLoaded, startDate, endDate]);

  return null;
};

export default FetchForense;