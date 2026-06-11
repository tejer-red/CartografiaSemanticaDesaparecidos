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
    console.log('GlobalTimeGraphData: processMapData', processed);
    console.log('GlobalTimeGraphData: calculateDateRange', range);
    console.log('GlobalTimeGraphData: CustomTooltip', CustomTooltip);
    console.log('GlobalTimeGraphData: handleTimeScaleChange', handleTimeScaleChange);
    console.log('GlobalTimeGraphData: handleDateClick', handleDateClick);
    console.log('GlobalTimeGraphData: map', map);
    console.log('GlobalTimeGraphData: COLORS', COLORS);
    console.log('GlobalTimeGraphData: selectedDate', selectedDate);
    console.log('GlobalTimeGraphData: timeScale', timeScale);
    console.log('GlobalTimeGraphData: setSelectedDate', setSelectedDate);
    console.log('GlobalTimeGraphData: setTimeScale', setTimeScale);
    console.log('GlobalTimeGraphData: newDataFetched', newDataFetched);
    console.log('GlobalTimeGraphData: newForenseDataFetched', newForenseDataFetched);
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
