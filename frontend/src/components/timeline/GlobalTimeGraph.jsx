// Este componente importa funciones utilitarias desde utils/globalTimeGraph.jsx
// y utiliza el contexto global (useData) para obtener y modificar el estado global de la app.
// Los datos y funciones relevantes se usan aquí para renderizar el gráfico principal.
// No comunica directamente con Notebook.jsx, pero ambos pueden compartir lógica/utilidades.

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceArea } from 'recharts';
import { useData } from '../../context/DataContext';
import { Calendar } from 'lucide-react'; // Replace FontAwesome import with Lucide
import {
  processMapData,         // Función para procesar datos del mapa según timeScale
  calculateDateRange,      // Función para calcular el rango de fechas
  CustomTooltip,           // Componente para el tooltip del gráfico
  handleTimeScaleChange,   // Handler para cambiar el timeScale
  handleDateClick          // Handler para seleccionar fecha en el gráfico
} from '../../utils/globalTimeGraph.jsx';

const GlobalTimeGraph = ({ onDateSelect }) => {
  // Obtiene estados y setters globales desde el contexto
  const {
    map,
    mapLoaded,
    showLoadingScreen,
    COLORS,
    selectedDate,
    timeScale,
    setSelectedDate,
    setTimeScale,
    setDaysRange,
    selectedSexo,          // Use these states instead of filters
    selectedCondicion,      // Use these states instead of filters
    newDataFetched,
    newForenseDataFetched
  } = useData();

  const [processedData, setProcessedData] = useState([]);
  const isLoading = !map || !mapLoaded;

  useEffect(() => {
    console.log('[GlobalTimeGraph] checking update. mapExists:', !!map, 'mapLoaded:', mapLoaded, 'showLoadingScreen:', showLoadingScreen, 'timeScale:', timeScale);
    if (isLoading || showLoadingScreen) {
      console.log('[GlobalTimeGraph] skipped processing (map loading or overlay is visible)');
      return;
    }
    
    // El mapa puede tardar unos ms en procesar los datos inyectados por FetchCedulas.
    // Usamos setTimeout para asegurar que _data esté disponible en los sources.
    const timer = setTimeout(() => {
      const data = processMapData(map, timeScale);
      console.log('[GlobalTimeGraph] processed map data features. Data points count:', data.length);
      setProcessedData(data);
    }, 500);

    return () => clearTimeout(timer);
  }, [map, mapLoaded, timeScale, showLoadingScreen, isLoading, newDataFetched, newForenseDataFetched]);

  if (isLoading) {
    return <div>Cargando GlobalTimeGraph...</div>;
  }

  const dateRange = calculateDateRange(selectedDate, timeScale);

  const handleClick = (e) => {
    handleDateClick(e, setSelectedDate, setDaysRange, timeScale);
  };

  return (
    <div className="GlobalTimeLine" style={{ width: '100%', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '5px', padding: '0px' }}>
        <div className="SelectTimeLineRange" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgb(51, 51, 51)', flex: '1 1 0%' }}>
          <Calendar size={14} style={{ color: "rgb(85, 85, 85)" }} />
          <span style={{ fontWeight: "bold", fontSize: "0.85em", whiteSpace: "nowrap" }}>Escala</span>
          <span style={{ fontSize: "0.75em", color: "rgb(0, 123, 255)", marginLeft: "8px", backgroundColor: "rgb(231, 241, 255)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}> — </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: '1 1 0%', justifyContent: 'flex-end' }}>
          {[
            { value: 'daily', label: 'Diario' },
            { value: 'weekly', label: 'Semanal' },
            { value: 'bi-weekly', label: 'Quincenal' },
            { value: 'monthly', label: 'Mensual' },
            { value: 'yearly', label: 'Anual' }
          ].map(option => {
            const isSelected = timeScale === option.value;
            return (
              <label
                key={option.value}
                style={{
                  fontSize: '0.7em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  backgroundColor: isSelected ? 'rgb(231, 241, 255)' : 'transparent',
                  borderRadius: '6px',
                  border: `1px solid ${isSelected ? 'rgb(0, 123, 255)' : 'rgb(221, 221, 221)'}`,
                  transition: '0.2s',
                  color: isSelected ? 'rgb(0, 123, 255)' : 'rgb(102, 102, 102)',
                  fontWeight: isSelected ? 600 : 400
                }}
              >
                <input
                  type="radio"
                  value={option.value}
                  name="timeScale"
                  checked={isSelected}
                  onChange={(e) => handleTimeScaleChange(e, setTimeScale)}
                  style={{ cursor: 'pointer', display: 'none' }}
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </div>

      {processedData.length === 0 && (
        <div className="PickScale">
          <span>
            No hay datos disponibles para la escala de tiempo seleccionada.
          </span>
        </div>
      )}

      {processedData.length > 0 && (
        <div style={{ flex: 1, minHeight: '100px' }}>
          <ResponsiveContainer width="100%" height={100}>
          <LineChart
            data={processedData}
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            onClick={handleClick}
          >
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {dateRange && (
              <ReferenceArea
                x1={dateRange.start}
                x2={dateRange.end}
                stroke="rgba(0, 0, 255, 0.6)"
                strokeWidth={2}
                fill="rgba(0, 0, 255, 0.2)"
              />
            )}
            {selectedSexo.includes('HOMBRE') && (
              <Line
                type="monotone"
                dataKey="HOMBRE"
                stroke={COLORS.HOMBRE.opacity100}
              />
            )}
            {selectedSexo.includes('MUJER') && (
              <Line
                type="monotone"
                dataKey="MUJER"
                stroke={COLORS.MUJER.opacity100}
              />
            )}
            {selectedCondicion.includes('CON VIDA') && (
              <Line
                type="monotone"
                dataKey="CON VIDA"
                stroke={COLORS.CON_VIDA.opacity100}
              />
            )}
            {selectedCondicion.includes('SIN VIDA') && (
              <Line
                type="monotone"
                dataKey="SIN VIDA"
                stroke={COLORS.SIN_VIDA.opacity100}
              />
            )}
            {selectedCondicion.includes('NO APLICA') && (
              <Line
                type="monotone"
                dataKey="NO APLICA"
                stroke={COLORS.NO_APLICA.opacity100}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        </div>
      )}
      {selectedDate && (
        <div
          className="SelectedDateLegend"
          style={{ marginBottom: "10px", textAlign: "center" }}
        >
          <strong>Rango de Fechas:</strong>{" "}
          {`${dateRange.start} a ${dateRange.end}`} <br />
          <span style={{ fontStyle: "italic", color: "#555" }}>
            Los datos están agregados según la escala de tiempo seleccionada.
          </span>
        </div>
      )}
    </div>
  );
};

export default GlobalTimeGraph;