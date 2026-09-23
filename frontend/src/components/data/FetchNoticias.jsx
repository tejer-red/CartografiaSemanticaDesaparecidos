import React, { useEffect } from 'react';
import axios from 'axios';
import { useData } from '../../context/DataContext';
import { API_BASE_URL } from '../../config';
import { supabase } from '../../utils/supabase';

import createLogger from '../../utils/logger';
const logger = createLogger('FetchNoticias');

const FetchNoticias = ({ fetchNoticias, fetchId, onFetchComplete }) => {
  const { map, mapLoaded, updateLayerData, startDate, endDate, setTimelineData, updateLoadingStatus, updateDataCount, localNoticias, mergeWithLocal, setRemoteNoticias } = useData();

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
        logger.log('[FetchNoticias] Setting loading to true');
        updateLoadingStatus('noticias', true);

        // 1. Obtener noticias del corpus directamente desde Supabase
        let corpusFeatures = [];
        try {
          let corpusQuery = supabase.from('noticias_corpus').select('*').limit(1000);
          if (start_date) corpusQuery = corpusQuery.gte('fecha', start_date);
          if (end_date) corpusQuery = corpusQuery.lte('fecha', end_date);
          const { data: supaCorpus, error: corpusErr } = await corpusQuery;
          if (corpusErr) throw corpusErr;

          corpusFeatures = (supaCorpus || [])
            .filter(n => n.lat != null && n.lng != null)
            .map(n => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [n.lng, n.lat]
              },
              properties: {
                id: n.id,
                titular: n.titular,
                url: n.url,
                fecha: n.fecha,
                municipio: n.municipio_extraido,
                colonia: n.colonia_extraida,
                referencia_ubicacion: n.referencia_ubicacion,
                resumen_hallazgo: n.resumen_hallazgo,
                total_cuerpos: n.total_cuerpos_estimado,
                total_restos: n.total_restos_estimado,
                keywords: n.keywords_matched,
                precision: n.geocode_precision,
                tipo_marcador: 'noticia',
                subtipo: 'noticia_corpus'
              }
            }));
        } catch (supaErr) {
          logger.warn('[FetchNoticias] Fallback a API para corpus:', supaErr);
          try {
            const res = await axios.get(`${API_BASE_URL}/noticias/corpus/geojson`, {
              params: { start_date, end_date, filter_by_date: true, limit: 1000 }
            });
            corpusFeatures = res.data?.features || [];
          } catch (e) {
            corpusFeatures = [];
          }
        }

        // 2. Obtener noticias de caso (si existen en API, o vacío de forma segura)
        let recordsCasos = [];
        try {
          const resCasos = await axios.get(`${API_BASE_URL}/noticias`, {
            params: { start_date, end_date, limit: 1000 }
          });
          recordsCasos = resCasos.data || [];
        } catch (e) {
          recordsCasos = [];
        }

        const minTimestamp = start_date ? new Date(`${start_date}T00:00:00Z`).getTime() : -Infinity;
        const maxTimestamp = end_date ? new Date(`${end_date}T23:59:59.999Z`).getTime() : Infinity;

        const featuresCasos = records
          .filter(record => record.coordenadas)
          .map(record => {
            const coords = record.coordenadas.split(',').map(Number);
            
            const parts = (record.fecha || '2024-01-01').split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);

            const eventDateObj = new Date(Date.UTC(year, month, day));
            const eventTime = isNaN(eventDateObj.getTime()) ? 0 : eventDateObj.getTime();

            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [coords[1], coords[0]] // [lng, lat]
              },
              properties: {
                ...record,
                id: `caso_${record.id}`,
                tipo_marcador: 'noticia',
                subtipo: 'noticia_caso',
                timestamp: eventTime,
                timestamp_start: eventTime,
                timestamp_end: eventTime,
                fecha: record.fecha,
                url: record.url,
                titular: record.titular
              }
            };
          })
          .filter(f => {
            const t = f.properties.timestamp;
            return t >= minTimestamp && t <= maxTimestamp;
          });

        const featuresCorpus = corpusFeatures.map(f => {
          const p = f.properties || {};
          let eventTime = 0;
          if (p.fecha) {
            const parts = p.fecha.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const d = new Date(Date.UTC(year, month, day));
            if (!isNaN(d.getTime())) {
              eventTime = d.getTime();
            }
          }

          return {
            ...f,
            properties: {
              ...p,
              id: `corpus_${p.id}`,
              tipo_marcador: 'noticia',
              subtipo: 'noticia_corpus',
              timestamp: eventTime,
              timestamp_start: eventTime,
              timestamp_end: eventTime
            }
          };
        }).filter(f => {
          const t = f.properties.timestamp;
          if (t > 0 && (start_date || end_date)) {
            return t >= minTimestamp && t <= maxTimestamp;
          }
          return true;
        });

        const allFeatures = [...featuresCasos, ...featuresCorpus];

        const geojsonData = {
          type: 'FeatureCollection',
          features: allFeatures
        };
        logger.log(`Noticias GeoJSON generated: ${allFeatures.length} total (${featuresCasos.length} caso, ${featuresCorpus.length} corpus)`);
        
        setRemoteNoticias(geojsonData);
        const mergedGeoJSON = mergeWithLocal(geojsonData, localNoticias, 'noticia');

        const noticiasLayout = {
          'circle-radius': [
            'case',
            ['==', ['get', 'subtipo'], 'noticia_corpus'], 9,
            7
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'subtipo'], 'noticia_corpus'], '#f59e0b', // Amber/gold para hallazgos del corpus
            '#e11d48' // Rose/red para noticias directas de caso
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'isLocal'], true], 3,
            2
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'isLocal'], true], '#6366f1',
            '#ffffff'
          ],
          'circle-opacity': 0.9
        };

        logger.log(`[FetchNoticias] Updating map layer noticiasLayer... map exists: ${!!map}, isStyleLoaded: ${map?.isStyleLoaded()}`);
        updateLayerData('noticiasLayer', mergedGeoJSON, noticiasLayout);
        updateDataCount('noticias', mergedGeoJSON.features.length);
        logger.log('[FetchNoticias] Try block finished successfully');

      } catch (error) {
        logger.error('[FetchNoticias] Error fetching noticias:', error);
      } finally {
        logger.log('[FetchNoticias] Inside FINALLY block. Calling updateLoadingStatus(noticias, false)');
        updateLoadingStatus('noticias', false);
        logger.log('[FetchNoticias] Calling onFetchComplete');
        if (typeof onFetchComplete === 'function') {
          onFetchComplete();
        }
        logger.log('[FetchNoticias] FINALLY block complete');
      }
    };

    if (mapLoaded && map && fetchId > 0) {
      fetchData(startDate, endDate);
    }
  }, [fetchId, mapLoaded, map, fetchNoticias, startDate, endDate]);

  return null;
};

export default FetchNoticias;
