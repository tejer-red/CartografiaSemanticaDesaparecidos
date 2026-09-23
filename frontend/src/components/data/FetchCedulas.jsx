import React, { useEffect } from 'react';
import axios from 'axios';
import { useData } from '../../context/DataContext';
import { API_BASE_URL } from '../../config';
import { supabase } from '../../utils/supabase';

import createLogger from '../../utils/logger';
const logger = createLogger('FetchCedulas');

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
    mapLoaded, // Add this from context
    updateLoadingStatus,
    updateDataCount,
    localCedulas,
    mergeWithLocal
  } = useData();

  useEffect(() => {
    const fetchData = async (start_date, end_date) => {
      if (!fetchCedulas) {
        updateLoadingStatus('cedulas', false);
        return;
      }
      if (!mapLoaded || !map) {
        logger.log('Map not ready');
        return;
      }

      try {
        setTimelineData([]);
        setLoading(true);
        updateLoadingStatus('cedulas', true);

        let records = [];
        try {
          logger.log('[FetchCedulas] Fetching cases directly from Supabase with chunked pagination...');
          const PAGE_SIZE = 1000;
          let page = 0;
          let allRows = [];

          while (true) {
            let query = supabase
              .from('cedulas_anonimizadas')
              .select('*, repd_vp_inferencia3(*)')
              .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (start_date) query = query.gte('fecha_desaparicion', start_date);
            if (end_date) query = query.lte('fecha_desaparicion', end_date);

            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) break;

            allRows.push(...data);
            if (data.length < PAGE_SIZE) break;
            page++;
          }

          records = allRows.map(row => {
            const inf = Array.isArray(row.repd_vp_inferencia3) ? row.repd_vp_inferencia3[0] : row.repd_vp_inferencia3;
            return {
              ...row,
              lat_long: inf?.lat_long || null,
              sum_score: inf?.sum_score != null ? parseFloat(inf.sum_score) : 1.0,
              violence_score: inf?.violence_score,
              violence_terms: inf?.violence_terms,
              condicion_localizacion: row.condicion_localizacion || 'NO APLICA'
            };
          });
          logger.log(`[FetchCedulas] Supabase returned ${records.length} records across ${page + 1} pages.`);
        } catch (supaErr) {
          logger.warn('[FetchCedulas] Supabase direct query failed, falling back to API:', supaErr);
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
          records = response.data.records || [];
        }

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

        const mergedGeoJSON = mergeWithLocal(geojsonData, localCedulas, 'cedula_busqueda');

        setFetchedRecords(mergedGeoJSON);
        setNewDataFetched(true);
        updateDataCount('cedulas', mergedGeoJSON.features.length);
        if (map && map.isStyleLoaded()) {
          updateLayerData('cedulaLayer', mergedGeoJSON, sexoLayout);
        } else {
          logger.warn('Map style not loaded yet for cedulaLayer, registering listener');
          if (map) {
            map.once('style.load', () => {
              updateLayerData('cedulaLayer', mergedGeoJSON, sexoLayout);
            });
          }
        }
        logger.log('Fetched Cedulas records:', formattedRecordsCedula);
      } catch (error) {
        logger.error("Error fetching Cedulas data:", error);
      } finally {
        setLoading(false);
        updateLoadingStatus('cedulas', false);
        onFetchComplete?.();
      }
    };

    if (fetchCedulas && fetchId > 0) {
      logger.log('FetchCedulas: Using startDate and endDate for fetching:', {
        startDate,
        endDate,
      });
      fetchData(startDate, endDate);
    }
  }, [fetchId, fetchCedulas, map, mapLoaded, startDate, endDate]); // Add mapLoaded to dependencies

  return null;
};

export default FetchCedulas;