import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import useIsMobile from '../../hooks/useIsMobile';
import InitialModal from './InitialModal';
import LeftSideBar from './LeftSideBar';
import HeaderCompact from './HeaderCompact';
import SideNotebook from '../notebook/SideNotebook';
import BottomTimelinePanel from './BottomTimelinePanel';
import { MobileActionBar } from './mobile';
import SemanticGraph from '../analysis/SemanticGraph';
import { X, Network } from 'lucide-react';

const AppLayout = ({
  visibleComponents,
  toggleComponent,
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
  isNotebookRoute,
  listNotebooksApp
}) => {
  const [activePanel, setActivePanel] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(58);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const { isInitialModalOpen, setIsInitialModalOpen } = useData();
  const isMobile = useIsMobile();

  const handlePanelHover = (panelName) => {
    setActivePanel(panelName);
  };

  const getPanelStyle = (panelName) => ({
    zIndex: activePanel === panelName ? 10 : 1
  });

  return (
    <div className="panel">
      <HeaderCompact 
        visibleComponents={visibleComponents}
        toggleComponent={toggleComponent}
        onNewDatasetClick={() => setIsInitialModalOpen(true)}
        onOpenGraphClick={() => setIsGraphModalOpen(true)}
        onHeightChange={setHeaderHeight}
      />
      <InitialModal
        isOpen={isInitialModalOpen}
        onClose={() => setIsInitialModalOpen(false)}
        isNotebookRoute={isNotebookRoute}
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
        listNotebooksApp={listNotebooksApp}
      />
      <LeftSideBar 
        onMouseEnter={() => handlePanelHover('leftSidebar')}
        onMouseLeave={() => handlePanelHover(null)}
        style={getPanelStyle('leftSidebar')}
        headerHeight={headerHeight}
      />
      <SideNotebook
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
        onMouseEnter={() => handlePanelHover('sideNotebook')}
        onMouseLeave={() => handlePanelHover(null)}
        style={getPanelStyle('sideNotebook')}
        headerHeight={headerHeight}
      />
      <BottomTimelinePanel 
        onMouseEnter={() => handlePanelHover('bottomTimeline')}
        onMouseLeave={() => handlePanelHover(null)}
        style={getPanelStyle('bottomTimeline')}
      />

      {/* Renderizado condicional móvil rescatado de rama 2.0 */}
      {isMobile && <MobileActionBar />}

      {/* Modal / Vista de Pantalla Completa del Grafo Semántico & Ontología */}
      {isGraphModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            padding: '12px 20px',
            borderRadius: '10px 10px 0 0',
            border: '1px solid #1e293b',
            color: '#f8fafc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: 600 }}>
              <Network size={22} color="#38bdf8" />
              <span>Grafo Semántico & Ontología de Desapariciones (Jalisco)</span>
              <span style={{ fontSize: '12px', background: '#0284c7', padding: '2px 8px', borderRadius: '12px' }}>
                PostgreSQL Abeja
              </span>
            </div>
            <button 
              onClick={() => setIsGraphModalOpen(false)}
              style={{
                background: '#1e293b',
                border: 'none',
                color: '#f8fafc',
                cursor: 'pointer',
                borderRadius: '6px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500
              }}
            >
              <X size={18} />
              Cerrar Vista
            </button>
          </div>
          <div style={{
            flex: 1,
            backgroundColor: '#020617',
            borderRadius: '0 0 10px 10px',
            border: '1px solid #1e293b',
            borderTop: 'none',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <SemanticGraph />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
