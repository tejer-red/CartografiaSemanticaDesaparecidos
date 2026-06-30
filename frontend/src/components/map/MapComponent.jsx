import React, { useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import createLogger from '../../utils/logger';
const logger = createLogger('MapComponent');


const MapComponent = () => {
  const { map, setMap, setMapLoaded } = useData();
  const mapContainer = useRef(null);
  const contextLostRef = useRef(false);
  const localMapRef = useRef(null);

  useEffect(() => {
    if (!localMapRef.current && !contextLostRef.current) {
      try {
        const newMap = new maplibregl.Map({
          container: mapContainer.current,
          style: 'https://tiles.stadiamaps.com/styles/osm_bright.json?api_key=cf6b8388-7d50-4714-8aac-6ecb7fedd428',
          center: [-103.349609, 20.659698],
          zoom: 8,
          preserveDrawingBuffer: false,
          antialias: false,
          maxParallelImageRequests: 4
        });

        localMapRef.current = newMap;

        // Handle WebGL context events
        newMap.on('webglcontextlost', (e) => {
          if (e && e.originalEvent) e.originalEvent.preventDefault();
          logger.log('WebGL context lost');
          contextLostRef.current = true;
          setMapLoaded(false);
        });

        newMap.on('webglcontextrestored', () => {
          logger.log('WebGL context restored');
          contextLostRef.current = false;
        });

        newMap.on('load', () => {
          setMap(newMap);
        });

        newMap.on('style.load', () => {
          setMap(newMap);
          setMapLoaded(true); // Set mapLoaded to true when style is loaded
          logger.log('Map and style loaded successfully');
        });

        // Event listener for relation highlights
        const handleToggleRelationHighlight = (e) => {
          const relation = e.detail;
          
          if (!newMap || !newMap.isStyleLoaded()) return;

          // Always remove previous if exists
          if (newMap.getLayer('highlight-relation-line')) {
            newMap.removeLayer('highlight-relation-line');
            newMap.removeSource('highlight-relation-source');
          }

          if (relation && relation.sourceCoords && relation.targetCoords) {
            // Draw new line
            newMap.addSource('highlight-relation-source', {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [relation.sourceCoords, relation.targetCoords]
                }
              }
            });

            newMap.addLayer({
              id: 'highlight-relation-line',
              type: 'line',
              source: 'highlight-relation-source',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#4f46e5',
                'line-width': 4,
                'line-dasharray': [2, 2],
                'line-opacity': 0.8
              }
            });
            
            // Opcional: Centrar el mapa para que se vean ambos puntos
            const bounds = new maplibregl.LngLatBounds()
              .extend(relation.sourceCoords)
              .extend(relation.targetCoords);
            newMap.fitBounds(bounds, { padding: 80, duration: 800 });
          }
        };

        window.addEventListener('toggleRelationHighlight', handleToggleRelationHighlight);
        newMap.relationListener = handleToggleRelationHighlight; // To clean up later

      } catch (error) {
        logger.error("Error initializing map:", error);
      }
    }

    return () => {
      if (localMapRef.current) {
        if (localMapRef.current.relationListener) {
          window.removeEventListener('toggleRelationHighlight', localMapRef.current.relationListener);
        }
        localMapRef.current.remove();
        localMapRef.current = null;
        setMap(null);
        setMapLoaded(false);
      }
    };
  }, []);

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default MapComponent;