import React, { createContext, useContext, useState, useEffect } from 'react';
import maplibregl from 'maplibre-gl';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [map, setMap] = useState(null);
  const [fetchedRecords, setFetchedRecords] = useState([]);
  const [forenseRecords, setForenseRecords] = useState([]);
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
  const [selectedMarkerTypes, setSelectedMarkerTypes] = useState(['cedula_busqueda', 'fosa']);

  useEffect(() => {
    if (!map) return;

    try {
      if (map.getLayer('cedulaLayer')) {
        const visible = selectedMarkerTypes.includes('cedula_busqueda') ? 'visible' : 'none';
        map.setLayoutProperty('cedulaLayer', 'visibility', visible);
      }
    } catch (e) {
      console.warn('Error setting visibility for cedulaLayer', e);
    }

    try {
      if (map.getLayer('fosaLayer')) {
        const visible = selectedMarkerTypes.includes('fosa') ? 'visible' : 'none';
        map.setLayoutProperty('fosaLayer', 'visibility', visible);
      }
    } catch (e) {
      console.warn('Error setting visibility for fosaLayer', e);
    }
  }, [selectedMarkerTypes, map]);

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
    if (!map || !map.isStyleLoaded()) {
      return;
    }
  
    if (!data || !data.type || data.type !== 'FeatureCollection') {
      console.error("Input data given to 'forenseLayer' is not a valid GeoJSON object.");
      return;
    }
    //console.log('Updating layer data:', layerId, layoutConfig);
    //console.log('Data:', data);
    if (map.getSource(layerId)) {
      map.getSource(layerId).setData(data);
    } else {
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
  
    if (layoutConfig === clusteringLayout) {
      return
    }
    // Update timeline data
    const timelineEntries = data.features.map(feature => ({
      timestamp: feature.properties.timestamp,
      type: feature.properties.tipo_marcador,
    }));
  
    updateTimelineData(timelineEntries, false);

    if (selectedDate) {
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

  const fosasLayout = {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['to-number', ['get', 'total_cuerpos']],
      0, 6,
      5, 10,
      20, 15,
      100, 22
    ],
    'circle-color': COLORS.FOSA.opacity30,
    'circle-stroke-color': COLORS.FOSA.opacity100,
    'circle-stroke-width': 2.5,
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
    //console.log('Updating timeline data');
    const timelineEntries = records.map(record => ({
      timestamp: record.timestamp || record.properties?.timestamp,
      type: record.type || record.properties?.tipo_marcador
    }));
    setTimelineData(prev => reset ? timelineEntries : [...prev, ...timelineEntries]);
  };

  const filterMarkersByDate = (selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange) => {
    if (!map || !selectedDate) return;
  
    //console.log('Filtering markers by date...');
    //console.log('Selected Date:', selectedDate);
    //console.log('Days Range:', daysRange);
    //console.log('Selected Sexo:', selectedSexo);
    //console.log('Selected Condicion:', selectedCondicion);
    //console.log('Edad Range:', edadRange);
    //console.log('Sum Score Range:', sumScoreRange);
  
    const endDate = new Date(selectedDate);
    endDate.setDate(selectedDate.getDate() + daysRange);
  
    // Convert dates to timestamps for easier filtering
    const selectedTimestamp = selectedDate.getTime();
    const endTimestamp = endDate.getTime();
  
    //console.log('Selected Timestamp:', selectedTimestamp);
    //console.log('End Timestamp:', endTimestamp);
  
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
  

    //console.log('Attribute Filters:', attributeFilters);
  
    // Date filters
    const dateFilters = [
      [">=", ["to-number", ["get", "timestamp"]], selectedTimestamp],
      ["<=", ["to-number", ["get", "timestamp"]], endTimestamp]
    ];
  
    //console.log('Date Filters:', dateFilters);
  
    // Combined filters
    const combinedFilter = ['all', ...attributeFilters, ...dateFilters];
  
    //console.log('Combined Filter:', combinedFilter);
  
    // Apply the combined filter to the "cedulaLayer"
    if (map.getLayer("cedulaLayer")) {
      //console.log('Applying filter to cedulaLayer');
      map.setFilter("cedulaLayer", combinedFilter);
    }

    // Apply the date filter to the "fosaLayer"
    if (map.getLayer("fosaLayer")) {
      const fosaDateFilters = [
        ["<=", ["to-number", ["get", "timestamp_start"]], endTimestamp],
        [">=", ["to-number", ["get", "timestamp_end"]], selectedTimestamp]
      ];
      map.setFilter("fosaLayer", ['all', ...fosaDateFilters]);
    }
  
    // Update heatmap layers
    activeHeatmapCategories.forEach(category => {
      const layerId = `cedulaLayer-${category}`;
      if (map.getLayer(layerId)) {
        const categoryFilter = category === 'HOMBRE' || category === 'MUJER'
          ? ['==', ['get', 'sexo'], category]
          : ['==', ['get', 'condicion_localizacion'], category];
        const heatmapFilter = ['all', categoryFilter, ...attributeFilters, ...dateFilters];
        //console.log(`Applying filter to heatmap layer: ${layerId}`);
        //console.log('Heatmap Filter:', heatmapFilter);
        map.setFilter(layerId, heatmapFilter);
      }
    });
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
    fosasLayout,
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
    selectedMarkerTypes,
    setSelectedMarkerTypes,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);