import React, { useEffect } from 'react';
import axios from 'axios';
import { useData } from '../../context/DataContext';
import { API_BASE_URL } from '../../config';

import createLogger from '../../utils/logger';
const logger = createLogger('FetchFosas');


const FetchFosas = ({ fetchFosas, fetchId, onFetchComplete }) => {
  const {
    startDate,
    endDate,
    setLoading,
    updateLayerData,
    fosasLayout,
    map,
    mapLoaded,
    updateLoadingStatus,
    updateDataCount
  } = useData();

  useEffect(() => {
    const fetchData = async (start_date, end_date) => {
      // If fetchFosas is disabled, set visibility to 'none' if the layer exists, then return
      if (!fetchFosas) {
        if (map && map.getLayer('fosaLayer')) {
          map.setLayoutProperty('fosaLayer', 'visibility', 'none');
        }
        updateLoadingStatus('fosas', false);
        return;
      }

      // If enabled, make sure it is visible
      if (map && map.getLayer('fosaLayer')) {
        map.setLayoutProperty('fosaLayer', 'visibility', 'visible');
      }

      if (!mapLoaded || !map) {
        logger.log('Map not ready');
        return;
      }

      try {
        setLoading(true);
        updateLoadingStatus('fosas', true);
        const response = await axios.get(`${API_BASE_URL}/fosas`, {
          params: {
            start_date,
            end_date,
            limit: 1000 // Get all graves
          }
        });

        const records = response.data || [];
        const formattedRecords = records
          .filter(record => record.coordenadas)
          .map(record => {
            const [lat, lon] = record.coordenadas.split(',').map(coord => parseFloat(coord));
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [lon, lat]
              },
            properties: {
              ...record,
              timestamp: (() => {
                if (!record.fecha_hallazgo) return null;
                const parts = record.fecha_hallazgo.split('-');
                const year = parseInt(parts[0], 10);
                return year ? Date.UTC(year, 0, 1) : null;
              })(),
              timestamp_start: (() => {
                if (!record.fecha_hallazgo) return null;
                const parts = record.fecha_hallazgo.split('-');
                const year = parseInt(parts[0], 10);
                return year ? Date.UTC(year, 0, 1) : null;
              })(),
              timestamp_end: (() => {
                if (!record.fecha_hallazgo) return null;
                const parts = record.fecha_hallazgo.split('-');
                const year = parseInt(parts[0], 10);
                return year ? Date.UTC(year, 11, 31, 23, 59, 59, 999) : null;
              })(),
              tipo_marcador: 'fosa'
            }
          };
        });

        const geojsonData = {
          type: 'FeatureCollection',
          features: formattedRecords
        };

        if (map && map.isStyleLoaded()) {
          updateLayerData('fosaLayer', geojsonData, fosasLayout);
          updateDataCount('fosas', formattedRecords.length);
        } else {
          logger.error('Map is not initialized or style is not loaded');
        }
        logger.log('Fetched Fosas records:', formattedRecords);
      } catch (error) {
        logger.error("Error fetching Fosas data:", error);
      } finally {
        setLoading(false);
        updateLoadingStatus('fosas', false);
        onFetchComplete?.();
      }
    };

    if (fetchId) {
      logger.log('FetchFosas: fetching graves...');
      fetchData(startDate, endDate);
    }
  }, [fetchId, fetchFosas, map, mapLoaded, startDate, endDate]);

  return null;
};

export default FetchFosas;
