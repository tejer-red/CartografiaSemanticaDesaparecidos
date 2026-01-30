import React, { useEffect } from 'react';
import axios from 'axios';
import { useData } from '../context/DataContext';
import { API_BASE_URL } from '../config';

/**
 * FetchForense - Componente para obtener datos forenses (PFSI)
 */
const FetchForense = ({ fetchForense, fetchId, onFetchComplete }) => {
  const {
    startDate,
    endDate,
    setForenseRecords,
    setNewForenseDataFetched,
    setLoading,
    updateLayerData,
    clusteringLayout,
    map,
    mapLoaded,
    COLORS
  } = useData();

  useEffect(() => {
    const fetchData = async (start_date, end_date) => {
      if (!fetchForense) return;

      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/sininden.php`, {
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
        const formattedRecordsForense = records.map(record => {
          const lat_long = record.Coordenadas || record.lat_long;
          const [lat, lon] = lat_long ? lat_long.split(',').map(coord => parseFloat(coord)) : [null, null];

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lon, lat]
            },
            properties: {
              ...record,
              id: record.ID || record.id_pfsi,
              timestamp: new Date(record.Fecha_Ingreso || record.fecha_ingreso).getTime(),
              color: record.Sexo === 'MUJER' ? COLORS.MUJER : COLORS.HOMBRE,
              tipo_marcador: 'forense_pfsi',
              count: 1, // For clustering
              originalNodes: [record]
            }
          };
        });

        const geojsonData = {
          type: 'FeatureCollection',
          features: formattedRecordsForense
        };

        setForenseRecords(geojsonData);
        setNewForenseDataFetched(true);
        updateLayerData('forenseLayer', geojsonData, clusteringLayout);

      } catch (error) {
        console.error("Error fetching Forense data:", error);
      } finally {
        onFetchComplete?.();
      }
    };

    if (fetchForense && fetchId) {
      fetchData(startDate, endDate);
    }
  }, [fetchId, fetchForense, map, mapLoaded, startDate, endDate]);

  return null;
};

export default FetchForense;