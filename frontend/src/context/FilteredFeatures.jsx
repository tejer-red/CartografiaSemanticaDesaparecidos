
import createLogger from '../utils/logger';
const logger = createLogger('FilteredFeatures');

const getFilteredFeatures = (map, selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange, fallbackRecords = null) => {
    if (!selectedDate) return [];
  
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);
    endDate.setDate(endDate.getDate() + daysRange);
  
    const selectedTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
  
    let filteredFeatures = [];

    // 1. Intentar querySourceFeatures si map está disponible y la fuente existe
    if (map && typeof map.querySourceFeatures === 'function' && map.getSource('cedulaLayer')) {
      try {
        const attributeFilters = [];
        if (selectedSexo && selectedSexo.length > 0) {
          attributeFilters.push(['in', ['get', 'sexo'], ['literal', selectedSexo]]);
        }
        if (selectedCondicion && selectedCondicion.length > 0) {
          attributeFilters.push(['in', ['get', 'condicion_localizacion'], ['literal', selectedCondicion]]);
        }
        if (edadRange) {
          attributeFilters.push([">=", ["to-number", ["get", "edad_momento_desaparicion"]], edadRange[0]]);
          attributeFilters.push(["<=", ["to-number", ["get", "edad_momento_desaparicion"]], edadRange[1]]);
        }
        if (sumScoreRange) {
          attributeFilters.push([">=", ["to-number", ["get", "sum_score"]], sumScoreRange[0]]);
          attributeFilters.push(["<=", ["to-number", ["get", "sum_score"]], sumScoreRange[1]]);
        }
      
        const dateFilters = [
          [">=", ["to-number", ["get", "timestamp"]], selectedTimestamp],
          ["<=", ["to-number", ["get", "timestamp"]], endTimestamp]
        ];
      
        const combinedFilter = ['all', ...attributeFilters, ...dateFilters];
        filteredFeatures = map.querySourceFeatures('cedulaLayer', {
          filter: combinedFilter
        }) || [];
      } catch (err) {
        logger.warn('Error in querySourceFeatures, falling back to memory filtering:', err);
        filteredFeatures = [];
      }
    }

    // 2. Si MapLibre devolvió 0 features (por ejemplo, fuera de viewport o no rasterizados) y tenemos fallbackRecords, filtrar en JS
    if (filteredFeatures.length === 0 && fallbackRecords && Array.isArray(fallbackRecords.features)) {
      filteredFeatures = fallbackRecords.features.filter(f => {
        const p = f.properties || {};
        if (p.tipo_marcador && p.tipo_marcador !== 'cedula_busqueda') return false;

        // Fecha
        const ts = Number(p.timestamp);
        if (isNaN(ts) || ts < selectedTimestamp || ts > endTimestamp) return false;

        // Sexo
        if (selectedSexo && selectedSexo.length > 0 && !selectedSexo.includes(p.sexo)) return false;

        // Condicion
        if (selectedCondicion && selectedCondicion.length > 0) {
          const cond = p.condicion_localizacion || 'NO APLICA';
          if (!selectedCondicion.includes(cond)) return false;
        }

        // Edad
        if (edadRange) {
          const age = Number(p.edad_momento_desaparicion);
          if (!isNaN(age) && (age < edadRange[0] || age > edadRange[1])) return false;
        }

        // Sum score
        if (sumScoreRange) {
          const score = Number(p.sum_score);
          if (!isNaN(score) && (score < sumScoreRange[0] || score > sumScoreRange[1])) return false;
        }

        return true;
      });
    }
  
    logger.log('Filtered Features count:', filteredFeatures.length);
    return filteredFeatures;
  };
  
  export default getFilteredFeatures;