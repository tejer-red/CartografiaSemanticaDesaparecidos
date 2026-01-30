import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapComponent = ({ minimal = false }) => {
  const { map, setMap, setMapLoaded } = useData();
  const mapContainer = useRef(null);
  const contextLostRef = useRef(false);
  const location = useLocation();

  const isVisibleRoute = location.pathname.includes('/visible/');
  const effectiveMinimal = minimal || isVisibleRoute;

  useEffect(() => {
    if (mapContainer.current && !map) {
      console.log('MapComponent: Initializing new map instance');
      try {
        const newMap = new maplibregl.Map({
          container: mapContainer.current,
          style: 'https://tiles.stadiamaps.com/styles/osm_bright.json?api_key=cf6b8388-7d50-4714-8aac-6ecb7fedd428',
          center: [-103.349609, 20.659698],
          zoom: 8,
          preserveDrawingBuffer: true,
          antialias: false,
          maxParallelImageRequests: 4,
          interactive: !effectiveMinimal,
          attributionControl: !effectiveMinimal
        });

        // Handle WebGL context events
        newMap.on('webglcontextlost', () => {
          console.log('WebGL context lost');
          contextLostRef.current = true;
        });

        newMap.on('webglcontextrestored', () => {
          console.log('WebGL context restored');
          contextLostRef.current = false;
        });

        newMap.on('load', () => {
          console.log('MapComponent: map loaded');
          setMap(newMap);
        });

        newMap.on('style.load', () => {
          console.log('MapComponent: style loaded');
          setMap(newMap);
          setMapLoaded(true);
        });
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    }
  }, [mapContainer, map, setMap, setMapLoaded, effectiveMinimal]);

  useEffect(() => {
    if (map) {
      console.log('MapComponent: Resizing map due to layout change');
      setTimeout(() => {
        map.resize();
      }, 500);
    }
  }, [isVisibleRoute, map]);

  // El cleanup solo debe ocurrir si el componente se desmonta de verdad
  useEffect(() => {
    return () => {
      // Nota: No removemos el mapa aquí si el componente solo se re-renderiza
      // MapLibre maneja mejor la persistencia si no lo borramos agresivamente
    };
  }, []);

  return <div ref={mapContainer} className="map-container" />;
};

export default MapComponent;