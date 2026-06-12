import React, { useEffect } from 'react';
import axios from 'axios';
import { useData } from '../../context/DataContext';
import { API_BASE_URL } from '../../config';

import createLogger from '../../utils/logger';
const logger = createLogger('FetchNoticias');


const FetchNoticias = ({ fetchNoticias, fetchId, onFetchComplete }) => {
  const { map, mapLoaded, updateLayerData, startDate, endDate, setTimelineData, updateLoadingStatus, updateDataCount } = useData();

  useEffect(() => {
    const fetchData = async (start_date, end_date) => {
      if (!fetchNoticias) {
        updateLoadingStatus('noticias', false);
        return;
      }
      if (!mapLoaded || !map) {
        logger.log('Noticias: Map not ready');
        return;
      }

      try {
        updateLoadingStatus('noticias', true);
        logger.log('Fetching noticias with params:', { start_date, end_date });
        const response = await axios.get(`${API_BASE_URL}/noticias`, {
          params: {
            start_date,
            end_date,
            limit: 1000
          }
        });

        const records = response.data || [];
        logger.log(`Fetched ${records.length} noticias. Raw response:`, records);

        const features = records
          .filter(record => record.coordenadas)
          .map(record => {
            const coords = record.coordenadas.split(',').map(Number);
            
            // Calculate visualization window (starts on news date, lasts at least 6 months)
            const parts = record.fecha.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // 0-11
            const day = parseInt(parts[2], 10);

            const startDateObj = new Date(Date.UTC(year, month, day));
            const endDateObj = new Date(Date.UTC(year, month + 6, day, 23, 59, 59, 999));

            const timestamp_start = startDateObj.getTime();
            const timestamp_end = endDateObj.getTime();

            logger.log(`Noticia ID: ${record.id} | Titular: ${record.titular} | Coords: ${coords[0]},${coords[1]} | Visibilidad: ${startDateObj.toISOString().split('T')[0]} a ${endDateObj.toISOString().split('T')[0]}`);

            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [coords[1], coords[0]] // [lng, lat]
              },
              properties: {
                ...record,
                id: record.id,
                tipo_marcador: 'noticia',
                timestamp: timestamp_start, // timeline slider matches the start of display
                timestamp_start,
                timestamp_end,
                fecha: record.fecha,
                url: record.url,
                titular: record.titular
              }
            };
          });

        const geojsonData = {
          type: 'FeatureCollection',
          features: features
        };
        logger.log('Noticias GeoJSON generated:', geojsonData);

        const noticiasLayout = {
          'circle-radius': 8,
          'circle-color': '#e11d48', // Sleek rose/red for news
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        };

        logger.log('Updating map layer noticiasLayer...');
        updateLayerData('noticiasLayer', geojsonData, noticiasLayout);
        updateDataCount('noticias', features.length);

      } catch (error) {
        logger.error('Error fetching noticias:', error);
      } finally {
        updateLoadingStatus('noticias', false);
        if (typeof onFetchComplete === 'function') {
          onFetchComplete();
        }
      }
    };

    if (mapLoaded && map && fetchId > 0) {
      fetchData(startDate, endDate);
    }
  }, [fetchId, mapLoaded, map, fetchNoticias]);

  return null;
};

export default FetchNoticias;
