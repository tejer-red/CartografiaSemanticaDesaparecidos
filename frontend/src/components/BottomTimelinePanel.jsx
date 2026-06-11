import React, { useState } from 'react';
import TimelineSlider from './TimelineSlider';
import LayoutForm from './LayoutForm';
import Clustering from './Clustering';
import GlobalTimeGraph from './GlobalTimeGraph';
import { useData } from '../context/DataContext';
import { Timer } from 'lucide-react';
import { useZIndex } from '../utils/useZIndex';

const PANEL_HEIGHT = 300;

const BottomTimelinePanel = () => {
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = useData();
  
  const [open, setOpen] = useState(false);
  const { zIndex, handleClick } = useZIndex('bottom-timeline');

  const handleDateSelect = (start, end) => {
    console.log('Date selected in GlobalTimeGraph:', { start, end });
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div 
      id="bottom-timeline"
      onClick={handleClick}
    >
      <div className={open ? '' : 'TimelineSliderOpen'}
        style={{
          display: open ? "none" : "block",
          position: "fixed",
          bottom: 0,
          left: 5,
          zIndex: zIndex,
          background: "#fff",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.12)",
          borderTop: "1px solid #eee",
          borderRadius: "8px 8px 0 0",
          padding: "8px 16px",
        }}
      >
        <TimelineSlider />
      </div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: open ? PANEL_HEIGHT : 0,
          left: 410,
          transform: "translateX(-50%)",
          zIndex: zIndex,
          background: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "8px 8px 0 0",
          padding: "8px 16px",
          cursor: "pointer",
          fontSize: 14,
          boxShadow: "0 -2px 8px rgba(0,0,0,0.10)",
          display: "flex",
          alignItems: "center",
          transition: "all 0.1s ease",
          gap: 6,
        }}
      >
        <Timer size={18} />
        <span style={{ fontWeight: 500, letterSpacing: 1 }}>
          Línea del tiempo / Visualización
        </span>
      </button>

      <div
        className="TimelineSlider"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: open ? PANEL_HEIGHT : 0,
          background: "#fff",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.12)",
          borderTop: "1px solid #eee",
          transition: "height 0.1s ease",
          overflow: "hidden",
          zIndex: zIndex,
        }}
      >
        <div className="FormsContainer">
          <TimelineSlider />
          <LayoutForm />
        </div>
        <Clustering type="personas_sin_identificar" />
        <GlobalTimeGraph
          className="GlobalTimeGraph"
          onDateSelect={handleDateSelect}
        />
      </div>
    </div>
  );
};

export default BottomTimelinePanel;
