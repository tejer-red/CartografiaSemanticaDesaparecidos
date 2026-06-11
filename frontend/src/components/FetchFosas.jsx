import React, { useEffect } from 'react';
import axios from 'axios';
import { useData } from '../context/DataContext';
import { API_BASE_URL } from '../config';

const FetchFosas = ({ fetchFosas, fetchId, onFetchComplete }) => {
  const {
    startDate,
    endDate,
    setLoading,
    updateLayerData,
    fosasLayout,
    map,
    mapLoaded
  } = useData();

  useEffect(() => {
    const fetchData = async (start_date, end_date) => {
      // If fetchFosas is disabled, set visibility to 'none' if the layer exists, then return
      if (!fetchFosas) {
        if (map && map.getLayer('fosaLayer')) {
          map.setLayoutProperty('fosaLayer', 'visibility', 'none');
        }
        return;
      }

      // If enabled, make sure it is visible
      if (map && map.getLayer('fosaLayer')) {
        map.setLayoutProperty('fosaLayer', 'visibility', 'visible');
      }

      if (!mapLoaded || !map) {
        console.log('Map not ready');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/fosas`, {
          params: {
            limit: 1000 // Get all graves
          }
        });

        const records = response.data || [];
        const formattedRecords = records.map(record => {
          const [lat, lon] = record.coordenadas ? record.coordenadas.split(',').map(coord => parseFloat(coord)) : [null, null];
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lon, lat]
            },
            properties: {
              ...record,
              timestamp: record.fecha_hallazgo ? new Date(record.fecha_hallazgo).getTime() : null,
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
        } else {
          console.error('Map is not initialized or style is not loaded');
        }
        console.log('Fetched Fosas records:', formattedRecords);
      } catch (error) {
        console.error("Error fetching Fosas data:", error);
      } finally {
        setLoading(false);
        onFetchComplete?.();
      }
    };

    if (fetchId) {
      console.log('FetchFosas: fetching graves...');
      fetchData(startDate, endDate);
    }
  }, [fetchId, fetchFosas, map, mapLoaded, startDate, endDate]);

  return null;
};

export default FetchFosas;
