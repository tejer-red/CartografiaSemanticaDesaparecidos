import React, { createContext, useContext, useState, useEffect } from 'react';
import maplibregl from 'maplibre-gl';

/**
 * DataContext.jsx - Contexto global de estado de la aplicación
 * 
 * PROPÓSITO:
 * Centraliza todo el estado compartido entre componentes para:
 * - Mapa y layers (MapLibre GL)
 * - Datos de cédulas y forenses
 * - Filtros de búsqueda
 * - Configuración de visualización
 * - Estado de la timeline
 * 
 * NOTA: Este archivo tiene 35+ estados. Se recomienda refactorizar
 * en contextos separados (MapContext, FiltersContext, etc.) en una
 * futura iteración para mejorar mantenibilidad.
 * 
 * CATEGORÍAS DE ESTADO:
 * =====================
 * 1. MAPA: map, cedulaLayer, forenseLayer, mapLoaded, mapType
 * 2. DATOS: fetchedRecords, forenseRecords, mergedRecords
 * 3. FILTROS: selectedSexo, selectedCondicion, edadRange, sumScoreRange
 * 4. FECHAS: startDate, endDate, selectedDate, daysRange
 * 5. TIMELINE: timelineData, timeScale, isTimelinePlaying, timelineVelocity
 * 6. UI: visibleComponents, loading, colorScheme
 */

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  // ============================================================
  // CATEGORÍA 1: ESTADO DEL MAPA
  // ============================================================
  const [map, setMap] = useState(null);                    // Instancia MapLibre GL
  const [cedulaLayer, setCedulaLayer] = useState(null);    // Layer de marcadores de cédulas
  const [forenseLayer, setForenseLayer] = useState(null);  // Layer de marcadores forenses
  const [mapLoaded, setMapLoaded] = useState(false);       // Flag: mapa completamente cargado
  const [mapType, setMapType] = useState('point');         // Tipo: 'point' | 'heatmap' | 'cluster'
  const [activeHeatmapCategories, setActiveHeatmapCategories] = useState([]);

  // ============================================================
  // CATEGORÍA 2: DATOS DE REGISTROS
  // ============================================================
  const [fetchedRecords, setFetchedRecords] = useState([]);   // Cédulas de búsqueda
  const [forenseRecords, setForenseRecords] = useState([]);   // Registros forenses (PFSI)
  const [mergedRecords, setMergedRecords] = useState([]);     // Combinación para timeline

  // ============================================================
  // CATEGORÍA 3: FILTROS DE BÚSQUEDA
  // ============================================================
  const [selectedSexo, setSelectedSexo] = useState(['HOMBRE', 'MUJER']);
  const [selectedCondicion, setSelectedCondicion] = useState(['CON VIDA', 'SIN VIDA', 'NO APLICA']);
  const [edadRange, setEdadRange] = useState([0, 100]);       // Rango de edad [min, max]
  const [sumScoreRange, setsumScoreRange] = useState([0.5, 20]); // Score de relevancia

  // ============================================================
  // CATEGORÍA 4: FECHAS Y RANGOS TEMPORALES
  // ============================================================
  const [startDate, setStartDate] = useState('2023-01-01');   // Inicio del rango de consulta
  const [endDate, setEndDate] = useState('2024-01-01');       // Fin del rango de consulta
  const [selectedDate, setSelectedDate] = useState(null);      // Fecha seleccionada en timeline
  const [daysRange, setDaysRange] = useState(30);              // Días a mostrar desde selectedDate

  // ============================================================
  // CATEGORÍA 5: TIMELINE Y ANIMACIÓN
  // ============================================================
  const [timelineData, setTimelineData] = useState([]);        // Datos para el gráfico temporal
  const [timeline, setTimeline] = useState(null);
  const [timelineControl, setTimelineControl] = useState(null);
  const [timeScale, setTimeScale] = useState('monthly');       // 'daily'|'weekly'|'bi-weekly'|'monthly'|'yearly'
  const [timelinePanelOpen, setTimelinePanelOpen] = useState(true);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [timelineVelocity, setTimelineVelocity] = useState(1000); // ms entre frames

  // ============================================================
  // CATEGORÍA 6: UI Y VISUALIZACIÓN
  // ============================================================
  const [loading, setLoading] = useState(false);
  const [colorScheme, setColorScheme] = useState('sexo');      // 'sexo' | 'condicion'
  const [visibleComponents, setVisibleComponents] = useState({
    filterForm: true,
    currentState: true,
  });

  // Flags de control de fetch
  const [newDataFetched, setNewDataFetched] = useState(false);
  const [newForenseDataFetched, setNewForenseDataFetched] = useState(false);
  const [markersLoaded, setMarkersLoaded] = useState(false); // Track if markers have been loaded for the first time


  useEffect(() => {
    console.log('DataContext state initialized:', {
      mapType, setMapType,
      colorScheme, setColorScheme,
      visibleComponents
    });
  }, []);

  useEffect(() => {
    console.log('DataContext initialized with:', {
      visibleComponents,
      setVisibleComponents: typeof setVisibleComponents === 'function' ? 'function' : typeof setVisibleComponents
    });
  }, [visibleComponents]);

  useEffect(() => {
    console.log('DataContext: startDate updated:', startDate);
  }, [startDate]);

  useEffect(() => {
    console.log('DataContext: endDate updated:', endDate);
  }, [endDate]);

  useEffect(() => {
    console.log('DataProvider initialized with context values:', {
      startDate,
      endDate,
      visibleComponents,
      mapType,
      colorScheme,
    });
  }, [startDate, endDate, visibleComponents, mapType, colorScheme]);

  const COLORS = Object.fromEntries(
    ["MUJER", "HOMBRE", "CON_VIDA", "SIN_VIDA", "NO_APLICA", "UNKNOWN"].map((key) => {
      const fullColor = {
        MUJER: "rgba(255, 105, 180, 1)",
        HOMBRE: "rgba(30, 144, 255, 1)",
        CON_VIDA: "rgba(0, 128, 0, 1)",
        SIN_VIDA: "rgba(0, 0, 0, 1)",
        NO_APLICA: "rgba(255, 0, 0, 1)",
        UNKNOWN: "rgba(128, 128, 128, 1)"
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

  const [fetchId, setFetchId] = useState(0);                    // ID para triggerear fetches automáticos

  // Sincronización automática de datos con el mapa al cargar
  useEffect(() => {
    console.log('[useEffect updateLayers] Triggered:', {
      mapLoaded,
      hasMap: !!map,
      mapLoaded_func: map?.loaded(),
      hasCedulaData: fetchedRecords?.features?.length > 0,
      hasForenseData: forenseRecords?.features?.length > 0,
      hasTimelineData: timelineData?.length > 0
    });

    // Esperar a que el mapa esté completamente cargado Y haya datos
    if (!map || !map.loaded()) {
      console.log('[useEffect updateLayers] Map not ready yet, waiting...');
      return;
    }

    console.log('[useEffect updateLayers] Map is ready, loading layers...');

    let layersAdded = false;

    if (fetchedRecords?.features?.length > 0) {
      console.log('[useEffect updateLayers] Loading cedulaLayer with', fetchedRecords.features.length, 'features');
      updateLayerData('cedulaLayer', fetchedRecords, sexoLayout);
      layersAdded = true;
    }

    if (forenseRecords?.features?.length > 0) {
      console.log('[useEffect updateLayers] Loading forenseLayer with', forenseRecords.features.length, 'features');
      updateLayerData('forenseLayer', forenseRecords, clusteringLayout);
      layersAdded = true;
    }

    // Hide loading spinner when markers are first loaded AND timeline data is available
    if (layersAdded && !markersLoaded && Array.isArray(timelineData) && timelineData.length > 0) {
      console.log('[useEffect updateLayers] First markers loaded and timeline data ready, hiding spinner');
      setMarkersLoaded(true);
      setLoading(false);
    }
  }, [map, mapLoaded, fetchedRecords, forenseRecords, markersLoaded, timelineData]);

  // Aplicar filtros automáticamente cuando cambian
  useEffect(() => {
    console.log('[useEffect filterMarkers] Triggered with:', {
      mapLoaded,
      hasMap: !!map,
      hasLayer: map?.getLayer('cedulaLayer') ? 'yes' : 'no',
      selectedDate,
      daysRange,
      selectedSexo,
      selectedCondicion
    });

    if (mapLoaded && map && map.getLayer('cedulaLayer')) {
      console.log('[useEffect filterMarkers] Calling filterMarkersByDate...');
      filterMarkersByDate(selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange);
    } else {
      console.log('[useEffect filterMarkers] Conditions not met:', {
        mapLoaded,
        hasMap: !!map,
        hasLayer: map?.getLayer('cedulaLayer') ? 'yes' : 'no'
      });
    }
  }, [mapLoaded, map, selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange]);

  const addTooltip = (layerId) => {
    if (!map || !map.getLayer(layerId)) {
      console.error('Map not initialized or layer not found');
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

      // Agregar botón de cerrar en móvil después de crear el popup
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          const popupContent = popup.getElement()?.querySelector('.maplibregl-popup-content');
          if (popupContent && !popupContent.querySelector('.mobile-close-button')) {
            const closeButton = document.createElement('div');
            closeButton.className = 'mobile-close-button';
            closeButton.innerHTML = '<button>Cerrar</button>';
            closeButton.querySelector('button').addEventListener('click', () => {
              popup.remove();
            });
            popupContent.appendChild(closeButton);
          }
        }, 10);
      }
    });

    // Close popup when clicking elsewhere on the map
    map.on('click', (e) => {
      if (!map.queryRenderedFeatures(e.point, { layers: [layerId] }).length) {
        popup.remove();
      }
    });
  };
  const updateLayerData = (layerId, data, layoutConfig) => {
    console.log(`[updateLayerData] Called for ${layerId}:`, {
      hasData: !!data,
      dataType: data?.type,
      featureCount: data?.features?.length,
      hasMap: !!map,
      isStyleLoaded: map?.isStyleLoaded()
    });

    if (!data || !data.type || data.type !== 'FeatureCollection') {
      console.error("[updateLayerData] Input data is not a valid GeoJSON object.");
      return;
    }

    // Actualizar datos de la línea de tiempo
    // Solo reseteamos si es la cedulaLayer (fuente principal) para evitar borrar datos de otras fuentes
    if (layoutConfig !== clusteringLayout) {
      const timelineEntries = data.features.map(feature => ({
        timestamp: feature.properties?.timestamp || feature.timestamp,
        type: feature.properties?.tipo_marcador || feature.tipo_marcador,
      }));
      updateTimelineData(timelineEntries, layerId === 'cedulaLayer');
    }

    // Chequeo del mapa para la parte visual
    if (!map || !map.isStyleLoaded()) {
      console.log(`[updateLayerData] Map not ready for ${layerId}`);
      return;
    }

    if (map.getSource(layerId)) {
      console.log(`[updateLayerData] Updating existing source ${layerId} with ${data.features.length} features`);
      map.getSource(layerId).setData(data);
    } else {
      console.log(`[updateLayerData] Creating new source and layer ${layerId} with ${data.features.length} features`);
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
    }

    // Asegurar que los filtros actuales se apliquen a la nueva capa o datos
    if (layerId === 'cedulaLayer' && selectedDate) {
      filterMarkersByDate(selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange);
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
      ['==', ['get', 'sexo'], 'MUJER'], COLORS.MUJER.opacity100,
      ['==', ['get', 'sexo'], 'HOMBRE'], COLORS.HOMBRE.opacity100,
      COLORS.UNKNOWN.opacity100,
    ],
    'circle-stroke-width': 2,
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
    //console.log('Merging records');
    const mergedRecordsObj = [...cedulasRecords, ...forenseRecords];
    //console.log("Merged Records:", mergedRecordsObj);
    setMergedRecords(mergedRecordsObj);
    updateTimelineData(mergedRecordsObj);
  };

  const updateTimelineData = (records, reset = false) => {
    const timelineEntries = records.map(record => ({
      timestamp: record.timestamp || record.properties?.timestamp,
      type: record.type || record.properties?.tipo_marcador
    }));
    setTimelineData(prev => reset ? timelineEntries : [...prev, ...timelineEntries]);
  };

  const filterMarkersByDate = (selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange) => {
    console.log('[filterMarkersByDate] Called with:', {
      selectedDate,
      daysRange,
      selectedSexo,
      selectedCondicion,
      edadRange,
      sumScoreRange,
      hasMap: !!map,
      hasLayer: map?.getLayer('cedulaLayer') ? 'yes' : 'no'
    });

    if (!map) {
      console.log('[filterMarkersByDate] No map, returning');
      return;
    }

    // Attribute filters (siempre se aplican)
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

    let combinedFilter;

    // Si no hay fecha seleccionada, solo aplicar filtros de atributos
    if (!selectedDate) {
      console.log('[filterMarkersByDate] No selectedDate, showing ALL markers with attribute filters');
      combinedFilter = ['all', ...attributeFilters];
    } else {
      // Si hay fecha seleccionada, aplicar también filtros de fecha
      const endDate = new Date(selectedDate);
      endDate.setDate(selectedDate.getDate() + daysRange);

      const selectedTimestamp = selectedDate.getTime();
      const endTimestamp = endDate.getTime();

      console.log('[filterMarkersByDate] Date range:', {
        start: selectedDate.toISOString(),
        end: endDate.toISOString(),
        startTimestamp: selectedTimestamp,
        endTimestamp: endTimestamp
      });

      const dateFilters = [
        [">=", ["to-number", ["get", "timestamp"]], selectedTimestamp],
        ["<=", ["to-number", ["get", "timestamp"]], endTimestamp]
      ];

      combinedFilter = ['all', ...attributeFilters, ...dateFilters];
    }

    console.log('[filterMarkersByDate] Combined filter:', JSON.stringify(combinedFilter, null, 2));

    // Apply the combined filter to the "cedulaLayer"
    if (map.getLayer("cedulaLayer")) {
      console.log('[filterMarkersByDate] Applying filter to cedulaLayer');
      map.setFilter("cedulaLayer", combinedFilter);
    } else {
      console.log('[filterMarkersByDate] cedulaLayer not found!');
    }

    // Update heatmap layers
    activeHeatmapCategories.forEach(category => {
      const layerId = `cedulaLayer-${category}`;
      if (map.getLayer(layerId)) {
        const categoryFilter = category === 'HOMBRE' || category === 'MUJER'
          ? ['==', ['get', 'sexo'], category]
          : ['==', ['get', 'condicion_localizacion'], category];
        const heatmapFilter = ['all', categoryFilter, ...attributeFilters, ...(selectedDate ? dateFilters : [])];
        map.setFilter(layerId, heatmapFilter);
        console.log(`[filterMarkersByDate] Applied filter to heatmap layer: ${layerId}`);
      }
    });

    console.log('[filterMarkersByDate] Filter application complete');
  };

  const avoidLayerOverlap = (records, tipo_marcador, selectedTimestamp, endTimestamp) => {
    ////console.log('Clustering nodes with the same position');

    if (!Array.isArray(records)) {
      console.error("Records should be an array");
      return [];
    }

    const clusterMap = new Map();

    ////console.log(tipo_marcador, selectedTimestamp, endTimestamp)
    records.forEach(record => {
      const { timestamp, tipo_marcador: recordTipoMarcador } = record.properties;
      const coordinates = record.geometry.coordinates.join(',');
      if (record.properties.tipo_marcador === tipo_marcador) {
        // //console.log('Record:', record);
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
    ////console.log('Cluster features', clusterFeatures);
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
    heatmapLayout,
    activeHeatmapCategories, setActiveHeatmapCategories,
    updateLayerData,
    filterMarkersByDate,
    mergeRecords,
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
    fetchId,
    setFetchId,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);