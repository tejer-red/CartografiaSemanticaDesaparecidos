import React, { useEffect } from 'react';
import { useTimelineSlider } from '../utils/timeLineSlider';
import { useData } from '../context/DataContext';
import { ArrowLeft, ArrowRight, Play, Pause, Turtle, Rabbit, ArrowRightCircle, Square } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const TimelineSlider = () => {
  const { timelinePanelOpen } = useData();
  const isMobile = useIsMobile();
  const {
    isPlaying,
    selectedDate,
    minDate,
    maxDate,
    velocity,
    setVelocity,
    stepBackward,
    stepForward,
    togglePlayPause,
    handleDateChange,
    timelineData,
    daysRange,
  } = useTimelineSlider();

  // Add this useEffect to handle initial date selection
  useEffect(() => {
    if (timelineData && timelineData.length > 0 && !selectedDate && minDate) {
      console.log('TimelineSlider: Setting initial date to:', minDate);
      handleDateChange(minDate);
    }
  }, [timelineData, minDate, selectedDate, handleDateChange]);

  const formatDateToSpanish = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!Array.isArray(timelineData) || timelineData.length === 0) {
    return <p>Esperando datos de timeline...</p>;
  }

  if (!minDate || !maxDate) return <p>No se cargaron los datos.</p>;

  return (
    <div
      style={{
        display: timelinePanelOpen ? "flex" : "none",
        padding: isMobile ? '4px 8px' : 8,
        flexDirection: "column",
        alignItems: "center",
        gap: isMobile ? "5px" : "10px",
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ width: '100%', textAlign: 'center' }}>
        <span
          style={{
            textAlign: "center",
            marginBottom: isMobile ? "5px" : "10px",
            color: "#666",
            fontSize: isMobile ? "0.8em" : "0.9em",
            display: timelinePanelOpen ? "none" : "block",
          }}
        >
          {selectedDate ? (
            <>
              {formatDateToSpanish(selectedDate)}
              <br />
              <small style={{ color: "#999" }}>Rango de {daysRange} días</small>
            </>
          ) : (
            "Selecciona una fecha"
          )}
        </span>
        <div
          className="timelinebuttons"
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "15px" : "10px",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => stepBackward(daysRange)}
            style={{
              background: "#007bff",
              border: "none",
              cursor: "pointer",
              color: "white",
              borderRadius: "5px",
              padding: isMobile ? "6px" : "8px",
              display: 'flex'
            }}
            title={`Retroceder:
- Días de rango: ${daysRange}
- Rango de selección: ${selectedDate
                ? new Date(selectedDate.getTime() - daysRange * 86400000)
                  .toISOString()
                  .slice(0, 10)
                : ""
              } a ${selectedDate ? selectedDate.toISOString().slice(0, 10) : ""}`}
          >
            <ArrowLeft size={isMobile ? 18 : 20} />
          </button>
          <button
            onClick={togglePlayPause}
            style={{
              background: "#007bff",
              border: "none",
              cursor: "pointer",
              color: "white",
              borderRadius: "5px",
              padding: isMobile ? "6px" : "8px",
              display: 'flex'
            }}
            title={`Resumen:
- Días de rango: ${daysRange}
- Velocidad: ${velocity}ms
- Fecha de inicio: ${selectedDate ? selectedDate.toISOString().slice(0, 10) : ""
              }
- Rango de selección: ${selectedDate ? selectedDate.toISOString().slice(0, 10) : ""
              } a ${selectedDate
                ? new Date(selectedDate.getTime() + daysRange * 86400000)
                  .toISOString()
                  .slice(0, 10)
                : ""
              }`}
          >
            {isPlaying ? <Pause size={isMobile ? 18 : 20} /> : <Play size={isMobile ? 18 : 20} />}
          </button>
          <button
            onClick={() => stepForward(daysRange)}
            style={{
              background: "#007bff",
              border: "none",
              cursor: "pointer",
              color: "white",
              borderRadius: "5px",
              padding: isMobile ? "6px" : "8px",
              display: 'flex'
            }}
            title={`Avanzar:
- Días de rango: ${daysRange}
- Rango de selección: ${selectedDate ? selectedDate.toISOString().slice(0, 10) : ""
              } a ${selectedDate
                ? new Date(selectedDate.getTime() + daysRange * 86400000)
                  .toISOString()
                  .slice(0, 10)
                : ""
              }`}
          >
            <ArrowRight size={isMobile ? 18 : 20} />
          </button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "5px",
          width: '100%'
        }}
      >
        <div className="rangeTime" style={{ display: "flex", alignItems: "center", gap: "5px", width: '100%', justifyContent: 'center' }}>
          <ArrowRightCircle
            size={isMobile ? 16 : 20}
            title={minDate ? minDate.toISOString().slice(0, 10) : ""}
            style={{ flexShrink: 0 }}
          />
          <input
            type="range"
            min={minDate.getTime()}
            max={maxDate.getTime()}
            value={selectedDate ? selectedDate.getTime() : minDate.getTime()}
            onChange={(e) => handleDateChange(new Date(Number(e.target.value)))}
            style={{ width: isMobile ? '70%' : 150 }}
          />
          <Square
            size={isMobile ? 16 : 20}
            title={maxDate ? maxDate.toISOString().slice(0, 10) : ""}
            style={{ flexShrink: 0 }}
          />
        </div>
        <div className="rangeSpeed" style={{ alignItems: "center", gap: "5px", display: timelinePanelOpen ? "flex" : "none", width: '100%', justifyContent: 'center' }}>
          <Rabbit size={isMobile ? 16 : 20} title="Velocidad mínima: 2000ms" style={{ flexShrink: 0 }} />
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={velocity}
            onChange={(e) => setVelocity(Number(e.target.value))}
            style={{ width: isMobile ? '70%' : 150 }}
          />
          <Turtle size={isMobile ? 16 : 20} title="Velocidad máxima: 100ms" style={{ flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
};

export default TimelineSlider;