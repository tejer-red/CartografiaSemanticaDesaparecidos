import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        preserveDrawingBuffer: true, // Helps with WebGL context
        antialias: false // Reduce WebGL load
      });

      // Add an event listener to confirm map initialization
      map.current.on('load', () => {
        console.log('Map has been initialized');
      });
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return <div ref={mapContainer} className="map-container" />;
}

export default Map;