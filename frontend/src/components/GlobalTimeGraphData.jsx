// Este componente recibe como props los datos y funciones globales desde Notebook.jsx.
// Usa las mismas funciones utilitarias que GlobalTimeGraph.jsx para procesar y mostrar (en consola)
// los datos relevantes. No modifica el estado global, solo lo muestra para depuración.

import React, { useEffect } from 'react';
import {
  processMapData,
  calculateDateRange,
  CustomTooltip,
  handleTimeScaleChange,
  handleDateClick
} from '../utils/globalTimeGraph.jsx';

import createLogger from '../utils/logger';
const logger = createLogger('GlobalTimeGraphData');

const GlobalTimeGraphData = ({
  map,
  COLORS,
  selectedDate,
  timeScale,
  setSelectedDate,
  setTimeScale,
  newDataFetched,
  newForenseDataFetched,
}) => {
  useEffect(() => {
    // Aquí se usan las funciones utilitarias y se muestran los resultados en consola.
    if (!map) return;
    const processed = processMapData(map, timeScale);
    const range = calculateDateRange(selectedDate, timeScale);
    logger.log('GlobalTimeGraphData: processMapData', processed);
    logger.log('GlobalTimeGraphData: calculateDateRange', range);
    logger.log('GlobalTimeGraphData: CustomTooltip', CustomTooltip);
    logger.log('GlobalTimeGraphData: handleTimeScaleChange', handleTimeScaleChange);
    logger.log('GlobalTimeGraphData: handleDateClick', handleDateClick);
    logger.log('GlobalTimeGraphData: map', map);
    logger.log('GlobalTimeGraphData: COLORS', COLORS);
    logger.log('GlobalTimeGraphData: selectedDate', selectedDate);
    logger.log('GlobalTimeGraphData: timeScale', timeScale);
    logger.log('GlobalTimeGraphData: setSelectedDate', setSelectedDate);
    logger.log('GlobalTimeGraphData: setTimeScale', setTimeScale);
    logger.log('GlobalTimeGraphData: newDataFetched', newDataFetched);
    logger.log('GlobalTimeGraphData: newForenseDataFetched', newForenseDataFetched);
  }, [
    map,
    COLORS,
    selectedDate,
    timeScale,
    setSelectedDate,
    setTimeScale,
    newDataFetched,
    newForenseDataFetched,
  ]);

  return (
    <>
    {/*
    <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
      <strong>GlobalTimeGraphData Debug:</strong>
      <div>Check console for detailed output.</div>
    </div>
    */}
    </>
  );
};

export default GlobalTimeGraphData;
