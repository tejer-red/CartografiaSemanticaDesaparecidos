import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import useIsMobile from '../../hooks/useIsMobile';
import InitialModal from './InitialModal';
import LeftSideBar from './LeftSideBar';
import HeaderCompact from './HeaderCompact';
import SideNotebook from '../notebook/SideNotebook';
import BottomTimelinePanel from './BottomTimelinePanel';
import { MobileActionBar } from './mobile';

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
      />
      <BottomTimelinePanel 
        onMouseEnter={() => handlePanelHover('bottomTimeline')}
        onMouseLeave={() => handlePanelHover(null)}
        style={getPanelStyle('bottomTimeline')}
      />

      {/* Renderizado condicional móvil rescatado de rama 2.0 */}
      {isMobile && <MobileActionBar />}
    </div>
  );
};

export default AppLayout;
