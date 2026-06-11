import React, { useEffect } from 'react';
import axios from 'axios';
import { useData } from '../context/DataContext';
import { API_BASE_URL } from '../config';

const FetchCedulas = ({ fetchCedulas, fetchId, onFetchComplete }) => {
  const {
    startDate,
    endDate,
    setFetchedRecords,
    setNewDataFetched,
    loading,
    setLoading,
    updateLayerData,
    sexoLayout,
    forenseRecords,
    setTimelineData,
    mergeRecords,
    COLORS,
    map,
    mapLoaded // Add this from context
  } = useData();

  useEffect(() => {
    const fetchData = async (start_date, end_date) => {
      if (!fetchCedulas || !mapLoaded || !map) {  // Add mapLoaded check
        console.log('Map not ready or fetch not enabled');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/casos`, {
          headers: {
            'API_KEY': 'gNXGJ0hCDavnMHvqbVRhL4yZalLUceQ4ccEHQmB40bQ',
            'Content-Type': 'application/json'
          },
          params: {
            start_date,
            end_date
          }
        });

        const records = response.data.records || [];
        const formattedRecordsCedula = records.map(record => {
          const [lat, lon] = record.lat_long ? record.lat_long.split(',').map(coord => parseFloat(coord)) : [null, null];
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lon, lat]
            },
            properties: {
              ...record,
              id: record.id_cedula_busqueda,
              timestamp: new Date(record.fecha_desaparicion).getTime(),
              color: record.sexo === 'MUJER' ? COLORS.MUJER : COLORS.HOMBRE,
              tipo_marcador: 'cedula_busqueda',
              num_score: record.num_score,
            }
          };
        });

        const geojsonData = {
          type: 'FeatureCollection',
          features: formattedRecordsCedula
        };

        setFetchedRecords(geojsonData);
        setNewDataFetched(true);
        if (map && map.isStyleLoaded()) {
          updateLayerData('cedulaLayer', geojsonData, sexoLayout);
        } else {
          console.error('Map is not initialized or style is not loaded');
        }
        console.log('Fetched Cedulas records:', formattedRecordsCedula);
      } catch (error) {
        console.error("Error fetching Cedulas data:", error);
      } finally {
        setLoading(false);
        onFetchComplete?.();
      }
    };

    if (fetchCedulas && fetchId) {
      console.log('FetchCedulas: Using startDate and endDate for fetching:', {
        startDate,
        endDate,
      });
      fetchData(startDate, endDate);
    }
  }, [fetchId, fetchCedulas, map, mapLoaded, startDate, endDate]); // Add mapLoaded to dependencies

  return null;
};

export default FetchCedulas;