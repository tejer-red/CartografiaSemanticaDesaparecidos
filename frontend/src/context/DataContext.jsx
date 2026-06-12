import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import * as layerManager from './layerManager';
import { useLocalData } from '../hooks/useLocalData';
import { useLinks } from '../hooks/useLinks';

import createLogger from '../utils/logger';
const logger = createLogger('DataContext');


const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [map, setMap] = useState(null);
  const [fetchedRecords, setFetchedRecords] = useState([]);
  const [forenseRecords, setForenseRecords] = useState([]);
  
  const { getLocalFosas, getLocalNoticias, getLocalCedulas } = useLocalData();
  const { getLinksGraph } = useLinks();

  const [localFosas, setLocalFosas] = useState([]);
  const [localNoticias, setLocalNoticias] = useState([]);
  const [localCedulas, setLocalCedulas] = useState([]);
  const [localVinculos, setLocalVinculos] = useState([]);
  const [mergedRecords, setMergedRecords] = useState([]);
  const [cedulaLayer, setCedulaLayer] = useState(null);
  const [forenseLayer, setForenseLayer] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [timeline, setTimeline] = useState(null);
  const [timelineControl, setTimelineControl] = useState(null);
  const [newDataFetched, setNewDataFetched] = useState(false);
  const [newForenseDataFetched, setNewForenseDataFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [daysRange, setDaysRange] = useState(30); // Default to 5 days range
  const [activeHeatmapCategories, setActiveHeatmapCategories] = useState([]); // Add this line
  const [selectedSexo, setSelectedSexo] = useState(['HOMBRE', 'MUJER']);
  const [selectedCondicion, setSelectedCondicion] = useState(['CON VIDA', 'SIN VIDA', 'NO APLICA']);
  const [edadRange, setEdadRange] = useState([0, 100]);
  const [sumScoreRange, setsumScoreRange] = useState([0.5, 20]);
  const [timeScale, setTimeScale] = useState('monthly'); // Set default to "monthly"
  const [mapType, setMapType] = useState('point');
  const [colorScheme, setColorScheme] = useState('sexo');
  const [visibleComponents, setVisibleComponents] = useState({
    filterForm: true,
    currentState: true,
    //violenceCases: true,
    //timeGraph: false,
    //crossRef: false,
  });
  const [startDate, setStartDate] = useState('2023-01-01'); // Default start date
  const [endDate, setEndDate] = useState('2024-01-01'); // Default end date
  const [timelinePanelOpen, setTimelinePanelOpen] = useState(true);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [timelineVelocity, setTimelineVelocity] = useState(1000);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedMarkerTypes, setSelectedMarkerTypes] = useState(['cedula_busqueda', 'fosa', 'noticia']);
  const layerDataRef = useRef(new Map());

  const [loadingStatus, setLoadingStatus] = useState({
    map: true,
    cedulas: true,
    fosas: true,
    noticias: true,
    forense: false // Forense is currently empty in its fetch, so leave it false or true depending on usage
  });
  const [dataCounts, setDataCounts] = useState({
    cedulas: 0,
    fosas: 0,
    noticias: 0,
    forense: 0
  });
  const [autoStart, setAutoStart] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  const updateLoadingStatus = (key, status) => {
    setLoadingStatus(prev => ({ ...prev, [key]: status }));
  };
  const updateDataCount = (key, count) => {
    setDataCounts(prev => ({ ...prev, [key]: count }));
  };

  useEffect(() => {
    if (!map) return;

    try {
      if (map.getLayer('cedulaLayer')) {
        const visible = selectedMarkerTypes.includes('cedula_busqueda') ? 'visible' : 'none';
        map.setLayoutProperty('cedulaLayer', 'visibility', visible);
      }
    } catch (e) {
      logger.warn('Error setting visibility for cedulaLayer', e);
    }

    try {
      if (map.getLayer('fosaLayer')) {
        const visible = selectedMarkerTypes.includes('fosa') ? 'visible' : 'none';
        map.setLayoutProperty('fosaLayer', 'visibility', visible);
      }
    } catch (e) {
      logger.warn('Error setting visibility for fosaLayer', e);
    }

    try {
      if (map.getLayer('noticiasLayer')) {
        const visible = selectedMarkerTypes.includes('noticia') ? 'visible' : 'none';
        map.setLayoutProperty('noticiasLayer', 'visibility', visible);
      }
    } catch (e) {
      logger.warn('Error setting visibility for noticiasLayer', e);
    }
  }, [selectedMarkerTypes, map]);

  // Update map loading status when mapLoaded changes
  useEffect(() => {
    updateLoadingStatus('map', !mapLoaded);
  }, [mapLoaded]);

  useEffect(() => {
    logger.log('DataContext state initialized:', { 
      mapType, setMapType, 
      colorScheme, setColorScheme,
      visibleComponents
    });
  }, []);

  const refreshLocalData = async () => {
    try {
      const fosas = await getLocalFosas();
      const noticias = await getLocalNoticias();
      const cedulas = await getLocalCedulas();
      const vinculos = await getLinksGraph();
      setLocalFosas(fosas);
      setLocalNoticias(noticias);
      setLocalCedulas(cedulas);
      setLocalVinculos(vinculos);
    } catch (e) {
      logger.error('Error fetching local data:', e);
    }
  };

  useEffect(() => {
    refreshLocalData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mergeWithLocal = (apiGeoJSON, localRecords, tipo) => {
    if (!apiGeoJSON || !apiGeoJSON.features) return apiGeoJSON;
    if (!localRecords || localRecords.length === 0) return apiGeoJSON;

    const localFeatures = localRecords.map(record => {
      let coords = [0, 0];
      if (record.lng !== undefined && record.lat !== undefined) {
        coords = [parseFloat(record.lng), parseFloat(record.lat)];
      }
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords
        },
        properties: {
          ...record,
          tipo_marcador: tipo,
          isLocal: true,
          timestamp: record.timestamp || record.created_at,
          color: tipo === 'cedula_busqueda' ? (record.sexo === 'MUJER' ? COLORS.MUJER : COLORS.HOMBRE) : undefined,
        }
      };
    });

    return {
      ...apiGeoJSON,
      features: [...apiGeoJSON.features, ...localFeatures]
    };
  };

  useEffect(() => {
    logger.log('DataContext initialized with:', {
      visibleComponents,
      setVisibleComponents: typeof setVisibleComponents === 'function' ? 'function' : typeof setVisibleComponents
    });
  }, [visibleComponents]);

  useEffect(() => {
    logger.log('DataContext: startDate updated:', startDate);
  }, [startDate]);

  useEffect(() => {
    logger.log('DataContext: endDate updated:', endDate);
  }, [endDate]);

  useEffect(() => {
    logger.log('DataProvider initialized with context values:', {
      startDate,
      endDate,
      visibleComponents,
      mapType,
      colorScheme,
    });
  }, [startDate, endDate, visibleComponents, mapType, colorScheme]);

  const COLORS = Object.fromEntries(
    ["MUJER", "HOMBRE", "CON_VIDA", "SIN_VIDA", "NO_APLICA", "UNKNOWN", "FOSA"].map((key) => {
      const fullColor = {
        MUJER: "rgba(255, 105, 180, 1)",
        HOMBRE: "rgba(30, 144, 255, 1)",
        CON_VIDA: "rgba(0, 128, 0, 1)",
        SIN_VIDA: "rgba(0, 0, 0, 1)",
        NO_APLICA: "rgba(255, 0, 0, 1)",
        UNKNOWN: "rgba(128, 128, 128, 1)",
        FOSA: "rgba(210, 105, 30, 1)"
      }[key];
  
      return [
        key,
        Object.assign(new String(fullColor), {
          opacity100: fullColor,
          opacity30: fullColor.replace(/[^,]+(?=\))/, "0.3"), // Modify alpha channel
        }),
      ];
    })
  );
  
  const POINT_RADIUS = 30;

  const addTooltip = (layerId) => {
    if (!map || !map.getLayer(layerId)) {
      logger.error('Map not initialized or layer not found');
      return;
    }
  
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: 'custom-popup',
      maxWidth: '400px',
      offset: [0, 200] // Ajusta este valor según necesites
    });

    // Shared function to generate popup content
    const generatePopupContent = (properties) => {
      if (properties.tipo_marcador === 'fosa') {
        return `
          <div style="font-family: inherit; color: #333; padding: 5px;">
            <h4 style="margin: 0 0 8px 0; color: #b2182b; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 4px;">Fosa Clandestina</h4>
            <p style="margin: 4px 0;"><strong>Estado:</strong> ${properties.estado || 'Desconocido'}</p>
            <p style="margin: 4px 0;"><strong>Municipio:</strong> ${properties.municipio || 'Desconocido'}</p>
            <p style="margin: 4px 0;"><strong>Año/Fecha Hallazgo:</strong> ${properties.fecha_hallazgo || 'Desconocido'}</p>
            <p style="margin: 4px 0;"><strong>Total de Fosas:</strong> ${properties.total_fosas || 0}</p>
            <p style="margin: 4px 0;"><strong>Cuerpos recuperados:</strong> ${properties.total_cuerpos || 0}</p>
            <p style="margin: 4px 0;"><strong>Restos/Fragmentos:</strong> ${properties.total_restos_fragmentos || 0}</p>
          </div>
        `;
      }
      if (properties.tipo_marcador === 'noticia') {
        return `
          <div style="font-family: inherit; color: #333; padding: 5px;">
            <h4 style="margin: 0 0 8px 0; color: #e11d48; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 4px;">Reporte de Prensa</h4>
            <p style="margin: 4px 0;"><strong>Fecha:</strong> ${properties.fecha || 'Desconocido'}</p>
            <p style="margin: 6px 0; font-style: italic; font-weight: 500;">"${properties.titular}"</p>
            ${properties.url ? `<p style="margin: 8px 0 0 0;"><a href="${properties.url}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline; font-weight: bold;">Ver noticia completa</a></p>` : ''}
          </div>
        `;
      }
      return `
        <div>
          ${properties.ruta_foto ? `<p style="text-align:center;"><img src="${properties.ruta_foto}" alt="Foto" style="max-width: 128px; height: auto;"></p>` : ''}
          ${properties.nombre_completo ? `<p>Nombre: ${properties.nombre_completo}</p>` : '<p>Sin nombre especificado</p>'}
          ${properties.fecha_desaparicion ? `<p>Fecha desaparición: ${properties.fecha_desaparicion}</p>` : '<p>Fecha desconocida</p>'}
          ${properties.sexo ? `<p>Sexo: ${properties.sexo}</p>` : '<p>Sexo no especificado</p>'}
          ${properties.edad_momento_desaparicion ? `<p>Edad al momento desaparecer: ${properties.edad_momento_desaparicion}</p>` : '<p>Edad desconocida</p>'}
          ${properties.condicion_localizacion ? `<p>Condición localización: ${properties.condicion_localizacion}</p>` : '<p>Condición no especificada</p>'}
          ${properties.descripcion_desaparicion ? `<p>Descripción desaparición: ${properties.descripcion_desaparicion}</p>` : '<p>Sin descripción disponible</p>'}
        </div>
      `;
    };
  
    // Show popup on hover
    
    map.on('mouseenter', layerId, (e) => {
      if (!e.features || e.features.length === 0) return;
      
      map.getCanvas().style.cursor = 'pointer';
      /*
      const feature = e.features[0];
      const coordinates = feature.geometry.coordinates.slice();
      const properties = feature.properties;
      
      popup
        .setLngLat(coordinates)
        .setHTML(generatePopupContent(properties))
        .addTo(map);
        */
    });
  
    // Remove pointer cursor on mouseleave but don't remove popup
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
    
  
    map.on('click', layerId, (e) => {
      if (!e.features || e.features.length === 0) return;
  
      const feature = e.features[0];
      const coordinates = feature.geometry.coordinates.slice();
      const properties = feature.properties;
  
      // Calcular nueva posición del mapa para centrar el feature
      const centerOffset = map.getCenter().lng - coordinates[0];
      const centerOffsetlat = map.getCenter().lat - coordinates[1];
      const newCenter = [
        coordinates[0] + centerOffset * 0.2, // Ajuste horizontal
        coordinates[1] - (1 / Math.pow(2, map.getZoom() - 1))  // Ajuste vertical (~200px)
      ];
  
      // Mover el mapa suavemente
      map.easeTo({
        center: newCenter,
        duration: 500,
        essential: true
      });
  
      // Mostrar popup en la posición original
      popup
        .setLngLat(coordinates)
        .setHTML(generatePopupContent(properties))
        .addTo(map);
    });
  
    // Close popup when clicking elsewhere on the map
    map.on('click', (e) => {
      if (!map.queryRenderedFeatures(e.point, { layers: [layerId] }).length) {
        popup.remove();
      }
    });
  };
  const updateLayerData = (layerId, data, layoutConfig) => {
    logger.log(`[updateLayerData] called for: ${layerId}. map exists: ${!!map}, style loaded: ${map?.isStyleLoaded()}`);
    if (!map) {
      logger.warn(`[updateLayerData] Warning: map is null for layer ${layerId}`);
      return;
    }
    if (!map.isStyleLoaded()) {
      logger.warn(`[updateLayerData] Warning: map style is not loaded yet for layer ${layerId}. Retrying in 200ms...`);
      setTimeout(() => updateLayerData(layerId, data, layoutConfig), 200);
      return;
    }
  
    if (!data || !data.type || data.type !== 'FeatureCollection') {
      logger.error(`[updateLayerData] Error: Input data given to ${layerId} is not a valid GeoJSON object:`, data);
      return;
    }
  
    let markerType = null;
    if (layerId === 'cedulaLayer') markerType = 'cedula_busqueda';
    else if (layerId === 'fosaLayer') markerType = 'fosa';
    else if (layerId === 'noticiasLayer') markerType = 'noticia';

    const isVisible = markerType ? selectedMarkerTypes.includes(markerType) : true;
    logger.log(`[updateLayerData] Layer: ${layerId}, MarkerType: ${markerType}, SelectedMarkerTypes: ${selectedMarkerTypes.join(', ')}, isVisible: ${isVisible}`);

    // Delegate caching and overlap detection to layerManager
    logger.log(`[updateLayerData] Storing layer data for ${layerId}. Current cached layers: ${Array.from(layerDataRef.current.keys()).join(', ')}`);
    layerManager.storeLayerData(layerDataRef.current, layerId, data);
    
    logger.log(`[updateLayerData] Running detectAndJitterOverlaps...`);
    const overlaps = layerManager.detectAndJitterOverlaps(layerDataRef.current);

    if (overlaps.length > 0) {
      logger.warn(`[Overlap Detector] Adjusted ${overlaps.length} overlapping point groups`, overlaps);
      
      // Update OTHER layers if they were modified by the jittering
      const affectedLayers = new Set();
      overlaps.forEach(overlap => {
        overlap.items.slice(1).forEach(item => affectedLayers.add(item.layer));
      });
      
      logger.log(`[updateLayerData] Affected layers by jittering:`, Array.from(affectedLayers));
      
      affectedLayers.forEach(affectedLayerId => {
         if (affectedLayerId !== layerId && map.getSource(affectedLayerId)) {
             logger.log(`[updateLayerData] Also updating map source for affected layer: ${affectedLayerId}`);
             map.getSource(affectedLayerId).setData(layerDataRef.current.get(affectedLayerId).data);
         }
      });
    } else {
      logger.log(`[Overlap Detector] Verified: 0 coordinate overlaps found between active layers.`);
    }

    if (map.getSource(layerId)) {
      logger.log(`[updateLayerData] Updating existing source and layer for ${layerId}`);
      map.getSource(layerId).setData(data);
      layerManager.applyVisibility(map, layerId, markerType, selectedMarkerTypes);
    } else {
      logger.log(`[updateLayerData] Creating new source and layer for ${layerId}`);
      map.addSource(layerId, {
        type: 'geojson',
        data: data,
      });
  
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: layerId,
        paint: layoutConfig
      });
  
      addTooltip(layerId);
      layerManager.applyVisibility(map, layerId, markerType, selectedMarkerTypes);
    }
  
    if (layoutConfig === clusteringLayout) {
      logger.log(`[updateLayerData] Clustering layout detected for ${layerId}, skipping timeline update`);
      return;
    }
    
    // Delegate timeline entry generation
    const timelineEntries = layerManager.generateTimelineEntries(data);
    logger.log(`[updateLayerData] Adding ${timelineEntries.length} timeline entries for ${layerId}`);
  
    updateTimelineData(timelineEntries, false);

    if (selectedDate) {
      logger.log(`[updateLayerData] selectedDate exists (${selectedDate}), filtering markers...`);
      filterMarkersByDate(selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange);
    } else {
      logger.log(`[updateLayerData] selectedDate is null, waiting for slider initialization`);
    }
  };

  const clusteringLayout = {
    // Adjust the circle radius based on the cluster's count value.
    // This example interpolates from a radius of 5 for a single record to 20 for 20 records.
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['get', 'count'],
      1, 5,    // when count is 1, radius is 5
      20, 20   // when count is 20, radius is 20
    ],
    // Use a different color when the feature is a cluster.
    'circle-color': [
      'case',
      ['==', ['get', 'tipo_marcador'], 'cluster'],
      COLORS.UNKNOWN.opacity100,  // Color for clusters
      '#f1f075'   // Fallback color for non-cluster features (if any)
    ],
    'circle-opacity': 0.8,
  };

  const sexoLayout = {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['to-number', ['get', 'sum_score']],
      0, 3,
      5, 6,
      9, 9,
      21, 12
    ],
    'circle-color': [
      'case',
      ['==', ['get', 'sexo'], 'MUJER'], COLORS.MUJER.opacity30,
      ['==', ['get', 'sexo'], 'HOMBRE'], COLORS.HOMBRE.opacity30,
      COLORS.UNKNOWN.opacity30,
    ],
    'circle-stroke-color': [
      'case',
      ['==', ['get', 'isLocal'], true], '#6366f1',
      ['==', ['get', 'sexo'], 'MUJER'], COLORS.MUJER.opacity100,
      ['==', ['get', 'sexo'], 'HOMBRE'], COLORS.HOMBRE.opacity100,
      COLORS.UNKNOWN.opacity100,
    ],
    'circle-stroke-width': [
      'case',
      ['==', ['get', 'isLocal'], true], 3,
      2
    ],
    'circle-opacity': 0.8,
    'circle-stroke-opacity': 1,
  };

  const condicionLocalizacionLayout = {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['to-number', ['get', 'sum_score']],
      0, 3,
      5, 6,
      9, 9,
      21, 12
    ],
    'circle-color': [
      'case',
      ['==', ['get', 'condicion_localizacion'], 'CON VIDA'], COLORS.CON_VIDA.opacity30,
      ['==', ['get', 'condicion_localizacion'], 'SIN VIDA'], COLORS.SIN_VIDA.opacity30,
      ['==', ['get', 'condicion_localizacion'], 'NO APLICA'], COLORS.NO_APLICA.opacity30,
      COLORS.UNKNOWN.opacity30,
    ],
    'circle-stroke-color': [
      'case',
      ['==', ['get', 'condicion_localizacion'], 'CON VIDA'], COLORS.CON_VIDA.opacity100,
      ['==', ['get', 'condicion_localizacion'], 'SIN VIDA'], COLORS.SIN_VIDA.opacity100,
      ['==', ['get', 'condicion_localizacion'], 'NO APLICA'], COLORS.NO_APLICA.opacity100,
      COLORS.UNKNOWN.opacity100,
    ],
    'circle-stroke-width': 2,
    'circle-opacity': 0.8,
    'circle-stroke-opacity': 1,
  };

  const fosasLayout = {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['to-number', ['get', 'total_cuerpos'], 0],
      0, 6,
      5, 10,
      20, 15,
      100, 22
    ],
    'circle-color': COLORS.FOSA.opacity30,
    'circle-stroke-color': [
      'case',
      ['==', ['get', 'isLocal'], true], '#6366f1',
      COLORS.FOSA.opacity100
    ],
    'circle-stroke-width': [
      'case',
      ['==', ['get', 'isLocal'], true], 3,
      2.5
    ],
    'circle-opacity': 0.8,
    'circle-stroke-opacity': 1,
  };

  const heatmapLayout = {
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['get', 'density'],
      0, 0,
      6, 1
    ],
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 1,
      9, 3
    ],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(33,102,172,0)',
      0.2, 'rgb(103,169,207)',
      0.4, 'rgb(209,229,240)',
      0.6, 'rgb(253,219,199)',
      0.8, 'rgb(239,138,98)',
      1, 'rgb(178,24,43)'
    ],
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 2,
      9, 20
    ],
    'heatmap-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      7, 1,
      9, 0
    ],
  };

  const mergeRecords = (cedulasRecords, forenseRecords) => {
    //logger.log('Merging records');
    const mergedRecordsObj = [...cedulasRecords, ...forenseRecords];
    //logger.log("Merged Records:", mergedRecordsObj);
    setMergedRecords(mergedRecordsObj);
    updateTimelineData(mergedRecordsObj);
  };

  const updateTimelineData = (records, reset = false) => {
    //logger.log('Updating timeline data');
    const timelineEntries = records.map(record => ({
      timestamp: record.timestamp || record.properties?.timestamp,
      type: record.type || record.properties?.tipo_marcador
    }));
    setTimelineData(prev => reset ? timelineEntries : [...prev, ...timelineEntries]);
  };

  const filterMarkersByDate = (selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange) => {
    if (!map || !selectedDate) return;
  
    //logger.log('Filtering markers by date...');
    //logger.log('Selected Date:', selectedDate);
    //logger.log('Days Range:', daysRange);
    //logger.log('Selected Sexo:', selectedSexo);
    //logger.log('Selected Condicion:', selectedCondicion);
    //logger.log('Edad Range:', edadRange);
    //logger.log('Sum Score Range:', sumScoreRange);
  
    const endDate = new Date(selectedDate);
    endDate.setDate(selectedDate.getDate() + daysRange);
  
    // Convert dates to timestamps for easier filtering
    const selectedTimestamp = selectedDate.getTime();
    const endTimestamp = endDate.getTime();
  
    //logger.log('Selected Timestamp:', selectedTimestamp);
    //logger.log('End Timestamp:', endTimestamp);
  
    // Attribute filters
    const attributeFilters = [];
    if (selectedSexo.length > 0) {
      attributeFilters.push(['in', ['get', 'sexo'], ['literal', selectedSexo]]);
    }
    if (selectedCondicion.length > 0) {
      attributeFilters.push(['in', ['get', 'condicion_localizacion'], ['literal', selectedCondicion]]);
    }
    attributeFilters.push([">=", ["to-number", ["get", "edad_momento_desaparicion"]], edadRange[0]]);
    attributeFilters.push(["<=", ["to-number", ["get", "edad_momento_desaparicion"]], edadRange[1]]);

    attributeFilters.push([">=", ["to-number", ["get", "sum_score"]], sumScoreRange[0]]);
    attributeFilters.push(["<=", ["to-number", ["get", "sum_score"]], sumScoreRange[1]]);
  

    //logger.log('Attribute Filters:', attributeFilters);
  
    // Date filters
    const dateFilters = [
      [">=", ["to-number", ["get", "timestamp"], 0], selectedTimestamp],
      ["<=", ["to-number", ["get", "timestamp"], 0], endTimestamp]
    ];
  
    //logger.log('Date Filters:', dateFilters);
  
    // Combined filters
    const combinedFilter = ['all', ...attributeFilters, ...dateFilters];
  
    //logger.log('Combined Filter:', combinedFilter);
  
    // Apply the combined filter to the "cedulaLayer"
    if (map.getLayer("cedulaLayer")) {
      try {
        //logger.log('Applying filter to cedulaLayer');
        map.setFilter("cedulaLayer", combinedFilter);
      } catch (e) {
        logger.error("Error applying filter to cedulaLayer:", e);
      }
    }

    // Apply the date filter to the "fosaLayer"
    if (map.getLayer("fosaLayer")) {
      try {
        const fosaDateFilters = [
          ["<=", ["to-number", ["get", "timestamp_start"], 0], endTimestamp],
          [">=", ["to-number", ["get", "timestamp_end"], 0], selectedTimestamp]
        ];
        map.setFilter("fosaLayer", ['all', ...fosaDateFilters]);
      } catch (e) {
        logger.error("Error applying filter to fosaLayer:", e);
      }
    }

    // Apply the date filter to the "noticiasLayer"
    if (map.getLayer("noticiasLayer")) {
      try {
        const noticiasDateFilters = [
          ["<=", ["to-number", ["get", "timestamp_start"], 0], endTimestamp],
          [">=", ["to-number", ["get", "timestamp_end"], 0], selectedTimestamp]
        ];
        map.setFilter("noticiasLayer", ['all', ...noticiasDateFilters]);
      } catch (e) {
        logger.error("Error applying filter to noticiasLayer:", e);
      }
    }
  
    // Update heatmap layers
    activeHeatmapCategories.forEach(category => {
      const layerId = `cedulaLayer-${category}`;
      if (map.getLayer(layerId)) {
        try {
          const categoryFilter = category === 'HOMBRE' || category === 'MUJER'
            ? ['==', ['get', 'sexo'], category]
            : ['==', ['get', 'condicion_localizacion'], category];
          const heatmapFilter = ['all', categoryFilter, ...attributeFilters, ...dateFilters];
          //logger.log(`Applying filter to heatmap layer: ${layerId}`);
          //logger.log('Heatmap Filter:', heatmapFilter);
          map.setFilter(layerId, heatmapFilter);
        } catch (e) {
          logger.error(`Error applying filter to heatmap layer ${layerId}:`, e);
        }
      }
    });
  };
  
  const avoidLayerOverlap = (records, tipo_marcador, selectedTimestamp, endTimestamp) => {
    ////logger.log('Clustering nodes with the same position');
  
    if (!Array.isArray(records)) {
        logger.error("Records should be an array");
        return [];
    }
  
    const clusterMap = new Map();

    ////logger.log(tipo_marcador, selectedTimestamp, endTimestamp)
    records.forEach(record => {
      const { timestamp, tipo_marcador: recordTipoMarcador } = record.properties;
      const coordinates = record.geometry.coordinates.join(',');
      if (record.properties.tipo_marcador === tipo_marcador) {
       // //logger.log('Record:', record);
        if (!clusterMap.has(coordinates)) {
          clusterMap.set(coordinates, { 
            type: 'Feature', 
            geometry: record.geometry, 
            properties: {
              tipo_marcador: "cluster", 
              count: 0, 
              originalNodes: [], 
              timestamp: timestamp
            }
          });
        }
        const cluster = clusterMap.get(coordinates);
        cluster.properties.count += 1;
        cluster.properties.originalNodes.push(record);
        // Ensure the timestamp is the minimum among the clustered nodes
        cluster.properties.timestamp = Math.min(cluster.properties.timestamp, timestamp);
      } 
    });
    
    const clusterFeatures = Array.from(clusterMap.values());
    ////logger.log('Cluster features', clusterFeatures);
    const geojsonData = {
      type: 'FeatureCollection',
      features: clusterFeatures
    }
    updateLayerData('forenseLayer', geojsonData, clusteringLayout);
};

  const value = {
    map, setMap,
    fetchedRecords, setFetchedRecords,
    forenseRecords, setForenseRecords,
    cedulaLayer, setCedulaLayer,
    forenseLayer, setForenseLayer,
    timelineData, setTimelineData,
    timeline, setTimeline,
    timelineControl, setTimelineControl,
    newDataFetched, setNewDataFetched,
    newForenseDataFetched, setNewForenseDataFetched,
    loading, setLoading,
    selectedDate, setSelectedDate,
    daysRange, setDaysRange,
    COLORS,
    POINT_RADIUS,
    clusteringLayout,
    sexoLayout,
    condicionLocalizacionLayout,
    fosasLayout,
    heatmapLayout,
    activeHeatmapCategories, setActiveHeatmapCategories,
    updateLayerData,
    filterMarkersByDate,
    mergeRecords,
    mergeWithLocal,
    refreshLocalData,
    localFosas,
    localNoticias,
    localCedulas,
    localVinculos,
    updateTimelineData,
    avoidLayerOverlap,
    selectedSexo, setSelectedSexo,
    selectedCondicion, setSelectedCondicion,
    edadRange, setEdadRange,
    sumScoreRange, setsumScoreRange,
    timeScale, setTimeScale,
    mapType, setMapType,
    colorScheme, setColorScheme,
    visibleComponents, setVisibleComponents,
    startDate, setStartDate,
    endDate, setEndDate,
    timelinePanelOpen, setTimelinePanelOpen,
    isTimelinePlaying,
    setIsTimelinePlaying,
    timelineVelocity,
    setTimelineVelocity,
    mapLoaded,
    setMapLoaded,
    selectedMarkerTypes,
    setSelectedMarkerTypes,
    loadingStatus,
    updateLoadingStatus,
    dataCounts,
    updateDataCount,
    autoStart,
    setAutoStart,
    showLoadingScreen,
    setShowLoadingScreen,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);