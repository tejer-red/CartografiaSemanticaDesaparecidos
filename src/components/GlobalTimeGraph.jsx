// Este componente importa funciones utilitarias desde utils/globalTimeGraph.jsx
// y utiliza el contexto global (useData) para obtener y modificar el estado global de la app.
// Los datos y funciones relevantes se usan aquí para renderizar el gráfico principal.
// No comunica directamente con Notebook.jsx, pero ambos pueden compartir lógica/utilidades.

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceArea } from 'recharts';
import { useData } from '../context/DataContext';
import { Calendar } from 'lucide-react';
import {
  processMapData,
  calculateDateRange,
  CustomTooltip,
  handleTimeScaleChange,
  handleDateClick
} from '../utils/globalTimeGraph.jsx';
import useIsMobile from '../hooks/useIsMobile';

const GlobalTimeGraph = ({ onDateSelect }) => {
  const isMobile = useIsMobile();
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
    selectedSexo,
    selectedCondicion,
    fetchedRecords,
    forenseRecords,
    daysRange
  } = useData();

  const [processedData, setProcessedData] = useState([]);
  const [isHoveringChart, setIsHoveringChart] = useState(false);

  useEffect(() => {
    const data = processMapData(fetchedRecords, forenseRecords, timeScale);
    console.log('[GlobalTimeGraph] processedData:', data);
    console.log('[GlobalTimeGraph] processedData sample:', data.slice(0, 3));
    console.log('[GlobalTimeGraph] selectedSexo:', selectedSexo);
    console.log('[GlobalTimeGraph] selectedCondicion:', selectedCondicion);
    console.log('[GlobalTimeGraph] fetchedRecords:', fetchedRecords);
    console.log('[GlobalTimeGraph] forenseRecords:', forenseRecords);
    setProcessedData(data);
  }, [timeScale, fetchedRecords, forenseRecords]);


  const dateRange = calculateDateRange(selectedDate, timeScale, processedData);

  const handleClick = (e) => {
    handleDateClick(e, setSelectedDate, setDaysRange, timeScale);
  };

  const scaleOptions = [
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'bi-weekly', label: 'Quincenal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' }
  ];

  return (
    <div
      className="GlobalTimeLine"
      style={{
        width: "100%",
        minHeight: isMobile ? "350px" : "200px",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: "15px" }}>
        <div
          className="SelectTimeLineRange"
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
            width: "100%",
            padding: isMobile ? "0 5px" : "0 1rem",
            justifyContent: isMobile ? "center" : "flex-end",
          }}
        >
          <Calendar size={18} style={{ marginRight: "10px", color: "#555" }} />
          <span style={{ fontWeight: "bold", color: "#333", fontSize: isMobile ? '0.9em' : '1em' }}>
            Escala de tiempo
          </span>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: isMobile ? '8px' : '15px',
          justifyContent: 'center',
          padding: '0 5px'
        }}>
          {scaleOptions.map((option) => (
            <label
              key={option.value}
              style={{
                fontSize: isMobile ? '0.8em' : '0.9em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: isMobile ? '4px 8px' : '0',
                backgroundColor: isMobile && timeScale === option.value ? '#e7f1ff' : 'transparent',
                borderRadius: '4px',
                border: isMobile ? `1px solid ${timeScale === option.value ? '#007bff' : '#ddd'}` : 'none'
              }}
            >
              <input
                type="radio"
                name="timeScale"
                value={option.value}
                checked={timeScale === option.value}
                onChange={(e) => handleTimeScaleChange(e, setTimeScale)}
                style={{ cursor: 'pointer' }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {processedData.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          No hay datos disponibles para la escala de tiempo seleccionada.
        </div>
      )}

      {processedData.length > 0 && (
        <div style={{ flex: 1, minHeight: isMobile ? '200px' : '150px' }}>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 150}>
            <LineChart
              data={processedData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              onClick={handleClick}
              onMouseEnter={() => setIsHoveringChart(true)}
              onMouseLeave={() => setIsHoveringChart(false)}
            >
              <XAxis dataKey="date" fontSize={10} minTickGap={20} />
              <YAxis fontSize={10} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />

              {/* Área de referencia mejorada con mejor visibilidad */}
              {dateRange && dateRange.start && dateRange.end && (
                <ReferenceArea
                  x1={dateRange.start}
                  x2={dateRange.end}
                  stroke="#007bff"
                  strokeWidth={isHoveringChart ? 4 : 3}
                  strokeOpacity={isHoveringChart ? 1 : 0.8}
                  fill="#007bff"
                  fillOpacity={isHoveringChart ? 0.25 : 0.15}
                  label={{
                    value: `Seleccionado: ${dateRange.start} → ${dateRange.end}`,
                    position: 'top',
                    fill: '#007bff',
                    fontSize: isMobile ? 9 : 11,
                    fontWeight: 'bold'
                  }}
                  ifOverflow="extendDomain"
                />
              )}

              {selectedSexo.includes('HOMBRE') && (
                <Line type="monotone" dataKey="HOMBRE" stroke={COLORS.HOMBRE.opacity100} dot={!isMobile} strokeWidth={2} />
              )}
              {selectedSexo.includes('MUJER') && (
                <Line type="monotone" dataKey="MUJER" stroke={COLORS.MUJER.opacity100} dot={!isMobile} strokeWidth={2} />
              )}
              {selectedCondicion.includes('CON VIDA') && (
                <Line type="monotone" dataKey="CON VIDA" stroke={COLORS.CON_VIDA.opacity100} dot={!isMobile} strokeWidth={2} />
              )}
              {selectedCondicion.includes('SIN VIDA') && (
                <Line type="monotone" dataKey="SIN VIDA" stroke={COLORS.SIN_VIDA.opacity100} dot={!isMobile} strokeWidth={2} />
              )}
              {selectedCondicion.includes('NO APLICA') && (
                <Line type="monotone" dataKey="NO APLICA" stroke={COLORS.NO_APLICA.opacity100} dot={!isMobile} strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedDate && dateRange && (
        <div style={{
          marginTop: "10px",
          textAlign: "center",
          fontSize: isMobile ? '0.75em' : '0.85em',
          padding: '10px 15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '8px',
          border: '2px solid #007bff',
          boxShadow: '0 2px 4px rgba(0,123,255,0.1)'
        }}>
          <div style={{ marginBottom: '5px' }}>
            <strong style={{ color: '#007bff', fontSize: '1.1em' }}>📅 Segmento Temporal Seleccionado</strong>
          </div>
          <div style={{ color: '#333' }}>
            <span style={{ fontWeight: 'bold' }}>Inicio:</span> {dateRange.start}
            <span style={{ margin: '0 8px', color: '#007bff' }}>→</span>
            <span style={{ fontWeight: 'bold' }}>Fin:</span> {dateRange.end}
          </div>
          <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#666' }}>
            <span style={{ fontWeight: 'bold' }}>Escala:</span> {
              timeScale === 'daily' ? 'Diaria' :
                timeScale === 'weekly' ? 'Semanal' :
                  timeScale === 'bi-weekly' ? 'Quincenal' :
                    timeScale === 'monthly' ? 'Mensual' :
                      timeScale === 'yearly' ? 'Anual' : timeScale
            } | <span style={{ fontWeight: 'bold' }}>Rango:</span> {dateRange.daysRange || daysRange} días
          </div>
        </div>
      )}

    </div>
  );
};

export default GlobalTimeGraph;