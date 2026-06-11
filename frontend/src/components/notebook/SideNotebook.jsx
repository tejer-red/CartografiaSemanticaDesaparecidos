import React, { useState } from 'react';
import Notebook from './Notebook';
import DateFormCompact from '../forms/DateFormCompact';
import { MapPin } from 'lucide-react'; // Replace FontAwesome with Lucide
import { useZIndex } from '../../utils/useZIndex';

const PANEL_WIDTH = 500;

const SideNotebook = ({
  handleSubmit,
  loading,
  fetchCedulas,
  setFetchCedulas,
  fetchForense,
  setFetchForense,
  fetchFosas,
  setFetchFosas,
  fetchNoticias,
  setFetchNoticias,
}) => {
  const [open, setOpen] = useState(false);
  const { zIndex, handleClick } = useZIndex('side-notebook');

  return (
    <div 
      id="side-notebook"
      onClick={handleClick}
    >
      {/* Rotated tab button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          top: 70,
          right: open ? PANEL_WIDTH + 45 : 45,
          zIndex: 8,
          background: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "8px 8px 0 0",
          padding: "12px 8px",
          cursor: "pointer",
          transform: "rotate(-90deg)",
          transformOrigin: "top right",
          fontSize: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <MapPin style={{ fontSize: 18 }} /> {/* Use Lucide icon */}
        <span style={{ fontWeight: 500, letterSpacing: 1 }}>
          Bitácora de navegación
        </span>
      </button>
      {/* Side panel */}
      <div
        className="side-notebook"
        style={{
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: zIndex,
          background: "#fff",
          boxShadow: "-2px 0 12px rgba(0,0,0,0.12)",
          borderLeft: "1px solid #eee",
          width: open ? PANEL_WIDTH + 1 : 0,
          minWidth: open ? PANEL_WIDTH : 0,
          maxWidth: open ? PANEL_WIDTH : 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <>
          <div>
            <DateFormCompact
              handleSubmit={handleSubmit}
              loading={loading}
              fetchCedulas={fetchCedulas}
              setFetchCedulas={setFetchCedulas}
              fetchForense={fetchForense}
              setFetchForense={setFetchForense}
              fetchFosas={fetchFosas}
              setFetchFosas={setFetchFosas}
              fetchNoticias={fetchNoticias}
              setFetchNoticias={setFetchNoticias}
            />
          </div>
          <div
            style={{
              minWidth: PANEL_WIDTH,
              maxWidth: 600,
              height: "100vh",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            <Notebook />
          </div>
        </>
      </div>
    </div>
  );
};

export default SideNotebook;
