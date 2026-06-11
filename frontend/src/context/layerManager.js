import createLogger from '../utils/logger';
const logger = createLogger('layerManager');

export const storeLayerData = (cacheMap, layerId, data) => {
  // Store data with a version/timestamp. We use explicit fetches to update.
  cacheMap.set(layerId, { data, version: Date.now() });
};

export const getLayerData = (cacheMap, layerId) => {
  const cached = cacheMap.get(layerId);
  return cached ? cached.data : null;
};

// Jitter offset ≈5 m
const JITTER_OFFSET = 0.00005;

const jitterFeature = (feature) => {
  const [lon, lat] = feature.geometry.coordinates;
  feature.geometry.coordinates = [
    lon + (Math.random() - 0.5) * JITTER_OFFSET,
    lat + (Math.random() - 0.5) * JITTER_OFFSET,
  ];
};

export const detectAndJitterOverlaps = (cacheMap) => {
  const coordsMap = new Map();
  const overlaps = [];

  cacheMap.forEach((cached, id) => {
    const geojson = cached.data;
    if (!geojson || !geojson.features) return;
    
    geojson.features.forEach(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) return;
      
      const coordKey = feature.geometry.coordinates.map(c => Number(c).toFixed(5)).join(',');
      if (!coordsMap.has(coordKey)) {
        coordsMap.set(coordKey, []);
      }
      coordsMap.get(coordKey).push({ layer: id, feature });
    });
  });

  logger.log(`[layerManager] detectAndJitterOverlaps: unique coords: ${coordsMap.size}`);

  coordsMap.forEach((items, coordKey) => {
    if (items.length > 1) {
      const distinctLayers = new Set(items.map(i => i.layer));
      if (distinctLayers.size > 1) {
        logger.log(`[layerManager] Overlap detected at ${coordKey} across layers:`, Array.from(distinctLayers));
        overlaps.push({ coordinates: coordKey, items });
        // Keep first feature unchanged, jitter the rest
        items.slice(1).forEach(item => {
          logger.log(`[layerManager] Jittering feature in layer ${item.layer}`);
          jitterFeature(item.feature);
        });
      }
    }
  });

  return overlaps;
};

export const applyVisibility = (map, layerId, markerType, selectedMarkerTypes) => {
  if (!map || !map.isStyleLoaded() || !map.getLayer(layerId)) return null;
  
  const isVisible = markerType ? selectedMarkerTypes.includes(markerType) : true;
  map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
  return isVisible;
};

export const generateTimelineEntries = (data) => {
  if (!data || !data.features) return [];
  return data.features.map(feature => ({
    timestamp: feature.properties.timestamp,
    type: feature.properties.tipo_marcador,
  }));
};
