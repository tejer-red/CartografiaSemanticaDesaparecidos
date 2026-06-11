import { useEffect, useRef, useCallback } from 'react';

import createLogger from '../utils/logger';
const logger = createLogger('filterForm');


// Add debounce utility
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

// Handlers desacoplados para los filtros
export function useFilterFormHandlers(dataContext) {
  // Desestructura setters del contexto
  const {
    setSelectedSexo,
    setSelectedCondicion,
    setSelectedMarkerTypes,
    setEdadRange,
    setsumScoreRange,
    filterMarkersByDate
  } = dataContext;

  // Handler para filtro de sexo
  const handleSexoChange = (e) => {
    const { value, checked } = e.target;
    setSelectedSexo((prev) => {
      const updated = checked ? [...prev, value] : prev.filter((item) => item !== value);
      logger.log(`[FilterForm] Sexo filter updated:`, updated);
      return updated;
    });
  };

  // Handler para filtro de condición
  const handleCondicionChange = (e) => {
    const { value, checked } = e.target;
    setSelectedCondicion((prev) => {
      const updated = checked ? [...prev, value] : prev.filter((item) => item !== value);
      logger.log(`[FilterForm] Condición filter updated:`, updated);
      return updated;
    });
  };

  // Handler para filtro de tipo de marcador
  const handleMarkerTypeChange = (e) => {
    const { value, checked } = e.target;
    setSelectedMarkerTypes((prev) => {
      const updated = checked ? [...prev, value] : prev.filter((item) => item !== value);
      logger.log(`[FilterForm] Marker type filter updated:`, updated);
      return updated;
    });
  };

  // Debounced map update
  const debouncedFilterUpdate = useDebounce((selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange) => {
    if (!selectedDate) return;
    filterMarkersByDate(selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange);
  }, 1);

  // Handler para rango de edad con actualización visual inmediata
  const handleEdadRangeChange = (values) => {
    logger.log('[FilterForm] Handling edad range change:', values);
    // Actualización visual inmediata
    setEdadRange(values);
    // Solo actualizar el mapa si hay una fecha seleccionada
    if (dataContext.selectedDate) {
      debouncedFilterUpdate(
        dataContext.selectedDate,
        dataContext.daysRange,
        dataContext.selectedSexo,
        dataContext.selectedCondicion,
        values,
        dataContext.sumScoreRange
      );
    }
  };

  // Handler para rango de score con actualización visual inmediata
  const handleSumScoreRangeChange = (values) => {
    logger.log('[FilterForm] Handling sum score change:', values);
    // Actualización visual inmediata
    setsumScoreRange(values);
    // Solo actualizar el mapa si hay una fecha seleccionada
    if (dataContext.selectedDate) {
      debouncedFilterUpdate(
        dataContext.selectedDate,
        dataContext.daysRange,
        dataContext.selectedSexo,
        dataContext.selectedCondicion,
        dataContext.edadRange,
        values
      );
    }
  };

  return {
    handleSexoChange,
    handleCondicionChange,
    handleMarkerTypeChange,
    handleEdadRangeChange,
    handleSumScoreRangeChange
  };
}

// Efectos y lógica de aplicación de filtros
export function useFilterFormEffects(dataContext) {
  const filtersInitialized = useRef(false);

  useEffect(() => {
    const {
      map,
      selectedDate,
      daysRange,
      selectedSexo,
      selectedCondicion,
      edadRange,
      sumScoreRange,
      filterMarkersByDate
    } = dataContext;

    // Inicialización de filtros después del slider de tiempo
    if (selectedDate && daysRange !== undefined) {
      if (!filtersInitialized.current) {
        logger.log('[FilterForm] Initializing filters after time slider is set...');
        filtersInitialized.current = true;
      }
      applyFilters();
    }

    // Aplica los filtros al mapa
    function applyFilters() {
      if (!map || !filtersInitialized.current) return;
      logger.log('[FilterForm] Applying filters with:', {
        selectedDate,
        daysRange,
        selectedSexo,
        selectedCondicion,
        edadRange,
        sumScoreRange,
      });
      filterMarkersByDate(selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange);
    }
    // eslint-disable-next-line
  }, [
    dataContext.selectedSexo,
    dataContext.selectedCondicion,
    dataContext.edadRange,
    dataContext.sumScoreRange,
    dataContext.selectedDate,
    dataContext.daysRange,
    dataContext.map
  ]);
}
