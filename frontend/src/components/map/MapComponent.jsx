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
          preserveDrawingBuffer: true,
          antialias: false,
          maxParallelImageRequests: 4
        });

        localMapRef.current = newMap;

        // Handle WebGL context events
        newMap.on('webglcontextlost', () => {
          logger.log('WebGL context lost');
          contextLostRef.current = true;
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
      } catch (error) {
        logger.error("Error initializing map:", error);
      }
    }

    return () => {
      if (localMapRef.current) {
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