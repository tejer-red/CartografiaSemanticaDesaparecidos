import { useEffect } from 'react';
import { useData } from '../context/DataContext';

const CombinedFilterEffect = () => {
  const { map, combinedFilterState } = useData();

  useEffect(() => {
    if (map && combinedFilterState) {
      const cedulaFeatures = map.queryRenderedFeatures({ layers: ["cedulaLayer"], filter: combinedFilterState });
      console.log('Filtered cedula features:', cedulaFeatures);
    }
  }, [map, combinedFilterState]);

  return null; // This component doesn't render anything
};

export default CombinedFilterEffect;