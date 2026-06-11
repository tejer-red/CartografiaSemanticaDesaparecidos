import { useEffect } from 'react';
import { useData } from '../context/DataContext';

import createLogger from '../utils/logger';
const logger = createLogger('CombinedFilterEffect');


const CombinedFilterEffect = () => {
  const { map, combinedFilterState } = useData();

  useEffect(() => {
    if (map && combinedFilterState) {
      const cedulaFeatures = map.queryRenderedFeatures({ layers: ["cedulaLayer"], filter: combinedFilterState });
      logger.log('Filtered cedula features:', cedulaFeatures);
    }
  }, [map, combinedFilterState]);

  return null; // This component doesn't render anything
};

export default CombinedFilterEffect;