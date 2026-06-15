import React, { useEffect } from 'react';
import axios from 'axios';
import { useData } from '../../context/DataContext';
import { API_BASE_URL } from '../../config';

import { getCachedData, setCachedData } from '../../utils/cache';

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
    updateDataCount,
    localFosas,
    mergeWithLocal,
    setRemoteFosas
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
        
        const cacheParams = { start_date, end_date };
        let records = getCachedData('fosas', cacheParams);

        if (!records) {
          const response = await axios.get(`${API_BASE_URL}/fosas`, {
            params: {
              start_date,
              end_date,
              limit: 1000 // Get all graves
            }
          });
          records = response.data || [];
          setCachedData('fosas', cacheParams, records);
        }

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

        setRemoteFosas(geojsonData);
        const mergedGeoJSON = mergeWithLocal(geojsonData, localFosas, 'fosa');

        updateDataCount('fosas', mergedGeoJSON.features.length);
        if (map && map.isStyleLoaded()) {
          updateLayerData('fosaLayer', mergedGeoJSON, fosasLayout);
        } else {
          logger.warn('Map style not loaded yet for fosaLayer, registering listener');
          if (map) {
            map.once('style.load', () => {
              updateLayerData('fosaLayer', mergedGeoJSON, fosasLayout);
            });
          }
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

    if (fetchId > 0) {
      logger.log('FetchFosas: fetching graves...');
      fetchData(startDate, endDate);
    }
  }, [fetchId, fetchFosas, map, mapLoaded, startDate, endDate]);

  return null;
};

export default FetchFosas;
