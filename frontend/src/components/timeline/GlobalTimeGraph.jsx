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
    COLORS,
    selectedDate,
    timeScale,
    setSelectedDate,
    setTimeScale,
    setDaysRange,
    newDataFetched,
    newForenseDataFetched,
    selectedSexo,          // Use these states instead of filters
    selectedCondicion      // Use these states instead of filters
  } = useData();

  const [processedData, setProcessedData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!map) {
      setIsLoading(true);
      return;
    }
    const handleMapLoad = () => setIsLoading(false);
    if (!map.isStyleLoaded()) {
      map.once('load', handleMapLoad);
    } else {
      handleMapLoad();
    }
    return () => {
      if (map) map.off('load', handleMapLoad);
    };
  }, [map]);

  useEffect(() => {
    if (isLoading || !map || (!newDataFetched && !newForenseDataFetched)) {
      return;
    }
    setProcessedData(processMapData(map, timeScale));
  }, [map, timeScale, newDataFetched, newForenseDataFetched, isLoading]);

  if (isLoading) {
    return <div>Cargando GlobalTimeGraph...</div>;
  }

  const dateRange = calculateDateRange(selectedDate, timeScale);

  const handleClick = (e) => {
    handleDateClick(e, setSelectedDate, setDaysRange, timeScale);
  };

  return (
    <div
      className="GlobalTimeLine"
      style={{
        width: "100%",
        height: processedData.length > 0 ? "150px" : "40px",
      }}
    >
      <div className="GlobalTimeLine" style={{ marginBottom: "20px" }}>
        <div
          className="SelectTimeLineRange"
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "5px",
            width: "100%",
            padding: "0 1rem",
            flex: 1,
            flexDirection: "row",
            justifyContent: "flex-end",
          }}
        >
          <Calendar style={{ marginRight: "10px", color: "#555" }} /> {/* Use Lucide icon */}
          <span style={{ fontWeight: "bold", color: "#333" }}>
            Selecciona el formato de la línea de tiempo
          </span>
        </div>

        <label style={{ marginRight: "15px" }}>
          <input
            type="radio"
            value="daily"
            checked={timeScale === "daily"}
            onChange={(e) => handleTimeScaleChange(e, setTimeScale)}
          />{" "}
          Diario
        </label>
        <label style={{ marginRight: "15px" }}>
          <input
            type="radio"
            value="weekly"
            checked={timeScale === "weekly"}
            onChange={(e) => handleTimeScaleChange(e, setTimeScale)}
          />{" "}
          Semanal
        </label>
        <label style={{ marginRight: "15px" }}>
          <input
            type="radio"
            value="bi-weekly"
            checked={timeScale === "bi-weekly"}
            onChange={(e) => handleTimeScaleChange(e, setTimeScale)}
          />{" "}
          Quincenal
        </label>
        <label>
          <input
            type="radio"
            value="monthly"
            checked={timeScale === "monthly"}
            onChange={(e) => handleTimeScaleChange(e, setTimeScale)}
          />{" "}
          Mensual
        </label>
        <label style={{ marginRight: "15px" }}>
          <input
            type="radio"
            value="yearly"
            checked={timeScale === "yearly"}
            onChange={(e) => handleTimeScaleChange(e, setTimeScale)}
          />{" "}
          Anual
        </label>
      </div>

      {processedData.length === 0 && (
        <div className="PickScale">
          <span>
            No hay datos disponibles para la escala de tiempo seleccionada.
          </span>
        </div>
      )}

      {processedData.length > 0 && (
        <ResponsiveContainer>
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