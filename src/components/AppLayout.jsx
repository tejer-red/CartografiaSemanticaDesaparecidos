import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import InitialModal from './InitialModal';
import LeftSideBar from './LeftSideBar';
import HeaderCompact from './HeaderCompact';
import SideNotebook from './SideNotebook';
import BottomTimelinePanel from './BottomTimelinePanel';
import TimelineSlider from './TimelineSlider';
import FilterFormWrapper from './FilterFormWrapper';
import { MobileActionBar } from './mobile';
import useIsMobile from '../hooks/useIsMobile';

/**
 * AppLayout - Layout principal de la aplicación
 * 
 * PROCESO:
 * 1. Detecta si es viewport mobile (< 768px)
 * 2. En desktop: muestra paneles tradicionales
 * 3. En mobile: muestra mapa fullscreen + barra de acciones flotante
 */
const AppLayout = ({
  visibleComponents,
  toggleComponent,
  handleSubmit,
  loading,
  fetchCedulas,
  setFetchCedulas,
  fetchForense,
  setFetchForense,
  isNotebookRoute,
  listNotebooksApp
}) => {
  const [activePanel, setActivePanel] = useState(null);
  const isMobile = useIsMobile(); // Hook para detectar mobile
  const { id: notebookId } = useParams(); // Obtener ID del cuaderno desde URL

  const handlePanelHover = (panelName) => {
    setActivePanel(panelName);
  };

  const getPanelStyle = (panelName) => ({
    zIndex: activePanel === panelName ? 10 : 1
  });

  // Modal inicial se muestra en ambos layouts
  const initialModal = (
    <InitialModal
      isNotebookRoute={isNotebookRoute}
      notebookId={notebookId}
      handleSubmit={handleSubmit}
      loading={loading}
      fetchCedulas={fetchCedulas}
      setFetchCedulas={setFetchCedulas}
      fetchForense={fetchForense}
      setFetchForense={setFetchForense}
      listNotebooksApp={listNotebooksApp}
    />
  );

  // Layout mobile: mapa + timeline siempre visible + barra de acciones
  if (isMobile) {
    return (
      <div className="panel mobile-layout">
        {initialModal}

        {/* FilterFormWrapper DEBE estar siempre montado para sincronizar filtros con mapa */}
        <FilterFormWrapper />

        {/* Timeline siempre visible en mobile - fijo arriba de la barra */}
        <div
          className="mobile-timeline-fixed"
          style={{
            position: 'fixed',
            bottom: 70, // Arriba de la barra de acciones (70px)
            left: 0,
            right: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid #e5e5e5',
            padding: '8px',
            zIndex: 9998,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <TimelineSlider />
        </div>

        {/* MobileActionBar incluye los modales */}
        <MobileActionBar />

        {/* Padding inferior para evitar que el contenido quede bajo los controles */}
        <div style={{ paddingBottom: '180px' }} />
      </div>
    );
  }

  // Layout desktop: paneles tradicionales
  return (
    <div className="panel">
      <HeaderCompact
        visibleComponents={visibleComponents}
        toggleComponent={toggleComponent}
      />
      {initialModal}
      <LeftSideBar
        onMouseEnter={() => handlePanelHover('leftSidebar')}
        onMouseLeave={() => handlePanelHover(null)}
        style={getPanelStyle('leftSidebar')}
      />
      <SideNotebook
        handleSubmit={handleSubmit}
        loading={loading}
        fetchCedulas={fetchCedulas}
        setFetchCedulas={setFetchCedulas}
        fetchForense={fetchForense}
        setFetchForense={setFetchForense}
        onMouseEnter={() => handlePanelHover('sideNotebook')}
        onMouseLeave={() => handlePanelHover(null)}
        style={getPanelStyle('sideNotebook')}
      />
      <BottomTimelinePanel
        onMouseEnter={() => handlePanelHover('bottomTimeline')}
        onMouseLeave={() => handlePanelHover(null)}
        style={getPanelStyle('bottomTimeline')}
      />
    </div>
  );
};

export default AppLayout;

