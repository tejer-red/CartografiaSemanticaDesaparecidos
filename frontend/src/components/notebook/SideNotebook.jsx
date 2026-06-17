import React, { useState } from 'react';
import Notebook from './Notebook';
import LocalDataPanel from './LocalDataPanel';
import DateFormCompact from '../forms/DateFormCompact';
import { MapPin, Database } from 'lucide-react'; // Replace FontAwesome with Lucide
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
  const [activeTab, setActiveTab] = useState('notebook'); // 'notebook' or 'ingesta'
  const { zIndex, handleClick } = useZIndex('side-notebook');

  const toggleTab = (tab) => {
    if (open && activeTab === tab) {
      setOpen(false);
    } else {
      setActiveTab(tab);
      setOpen(true);
    }
  };

  return (
    <div 
      id="side-notebook"
      onClick={handleClick}
    >
      {/* Rotated tab button 1: Notebook */}
      <button
        onClick={() => toggleTab('notebook')}
        style={{
          position: "fixed",
          top: 70,
          right: open ? PANEL_WIDTH + 45 : 45,
          zIndex: 8,
          background: activeTab === 'notebook' && open ? "#0056b3" : "#007bff",
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
          transition: "right 0.3s ease, background 0.2s",
        }}
      >
        <MapPin style={{ fontSize: 18 }} />
        <span style={{ fontWeight: 500, letterSpacing: 1 }}>
          Bitácora de navegación
        </span>
      </button>

      {/* Rotated tab button 2: Ingesta */}
      <button
        onClick={() => toggleTab('ingesta')}
        style={{
          position: "fixed",
          top: 290, // Moved down to prevent overlap
          right: open ? PANEL_WIDTH + 45 : 45,
          zIndex: 8,
          background: activeTab === 'ingesta' && open ? "#4f46e5" : "#6366f1",
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
          transition: "right 0.3s ease, background 0.2s",
        }}
      >
        <Database style={{ fontSize: 18 }} />
        <span style={{ fontWeight: 500, letterSpacing: 1 }}>
          Ingesta de datos
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
          transition: "width 0.3s ease, min-width 0.3s ease, max-width 0.3s ease",
        }}
      >
        <>
          <div style={{ height: '100%', display: activeTab === 'notebook' ? 'flex' : 'none', flexDirection: 'column' }}>
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
          </div>

          <div
            style={{
              display: activeTab === 'ingesta' ? 'flex' : 'none',
              minWidth: PANEL_WIDTH,
              maxWidth: 600,
              height: "100vh",
              background: "#f9fafb", // slightly different background for ingesta
              flexDirection: "column",
              boxSizing: "border-box",
              overflowY: "auto"
            }}
          >
            <LocalDataPanel />
          </div>
        </>
      </div>
    </div>
  );
};

export default SideNotebook;
