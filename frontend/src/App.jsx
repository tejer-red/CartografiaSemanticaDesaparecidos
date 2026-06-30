import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useData } from './context/DataContext'; // Remove DataProvider import
import { useAuth } from './context/AuthContext';
import { API_BASE_URL } from './config';
import { FetchCedulas, FetchForense, FetchFosas, FetchNoticias } from './components/data';
import { MapComponent } from './components/map';
import { LoginScreen } from './components/auth';
import { AppLayout, LoadingOverlay, LandingPage } from './components/layout';
import { VisibleNotebook, NotebookListPage } from './components/notebook';
import LinkModal from './components/shared/LinkModal';
import './styles/FilterForm.css'; // Import FilterForm styles

import createLogger from './utils/logger';
const logger = createLogger('App');



const App = () => {
  const location = useLocation();
  const [fetchCedulas, setFetchCedulas] = useState(true);
  const [fetchForense, setFetchForense] = useState(true);
  const [fetchFosas, setFetchFosas] = useState(true);
  const [fetchNoticias, setFetchNoticias] = useState(true);
  const [isFormsVisible, setIsFormsVisible] = useState(true);
  const [toolbarTab, setToolbarTab] = useState('tab1'); // State for toolbar tabs
  const { user, loading: authLoading } = useAuth();

  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    loading,
    setLoading,
    visibleComponents,
    setVisibleComponents,
    mapType,
    colorScheme,
    setTimelineData,
    setShowLoadingScreen,
    globalLinkModal,
    setGlobalLinkModal,
    fetchId,
    setFetchId
  } = useData(); // Use DataContext for shared state

  const navigate = useNavigate();

  // Redirect to new notebook list page
  const listNotebooksApp = () => {
    logger.log('Redirecting to notebooks list page');
    navigate('/cuaderno/lista');
  };

  useEffect(() => {
    logger.log('App received visibleComponents:', visibleComponents);
    logger.log('setVisibleComponents is:', typeof setVisibleComponents);
  }, [visibleComponents, setVisibleComponents]);

  useEffect(() => {
    logger.log('isFormsVisible state updated:', isFormsVisible);
  }, [isFormsVisible]);

  // check changes in start and end date
  useEffect(() => {
    logger.log('App: startDate updated:', startDate);
  }, [startDate]);

  useEffect(() => {
    logger.log('App: endDate updated:', endDate);
  }, [endDate]);

  useEffect(() => {
    logger.log('App: Context values from useData():', {
      startDate,
      endDate,
      visibleComponents,
      mapType,
      colorScheme,
    });
  }, [startDate, endDate, visibleComponents, mapType, colorScheme]);

  const handleDateSelect = (start, end) => {
    logger.log('Date selected in GlobalTimeGraph:', { start, end });
    setTimelineData([]); // Clear previous timeline data
    setStartDate(start); // Update via DataContext
    setEndDate(end);     // Update via DataContext
    setFetchId(prev => prev + 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    logger.log('Form submitted');
    setTimelineData([]); // Clear previous timeline data
    setLoading(true);
    setShowLoadingScreen(true);
    setFetchId(prev => prev + 1); // Increment the fetchId to trigger useEffect in child components
    logger.log('Fetch ID incremented:', fetchId + 1);
  };

  const handleFetchComplete = () => {
    logger.log('Fetch complete');
    setLoading(false);
  };

  const toggleFormsVisibility = () => {
    logger.log('Toggling forms visibility. Current state:', isFormsVisible);
    setIsFormsVisible(!isFormsVisible);
    logger.log('New forms visibility state:', !isFormsVisible);
  };

  const toggleComponent = (component) => {
    logger.log('Toggling component:', component);
    logger.log('Current state before toggle:', visibleComponents);

    if (typeof setVisibleComponents === 'function') {
      setVisibleComponents(prev => {
        const updated = { ...prev, [component]: !prev[component] };
        logger.log('New visibility state after toggle:', updated);
        return updated;
      });
    } else {
      logger.error('setVisibleComponents is not a function!');
    }
  };

  const isNotebookRoute = location.pathname.includes('/cuaderno/') && !location.pathname.includes('lista');
  const isVisibleRoute = location.pathname.includes('/visible/');
  const shouldRenderMapAndFetchers = isVisibleRoute || (isNotebookRoute && user);

  return (
    <>
      <style>
        {`
          .rt-TabsTriggerInnerHidden, .rt-BaseTabListTriggerInnerHidden {
            display: none !important;
          }
        `}
      </style>
      {authLoading ? (
        <LoadingOverlay />
      ) : (
        <>
          <LoadingOverlay />
          {/* Solo cargar fetchers y mapa si estamos en una ruta interactiva de cuaderno (y logueado) o visible, excluyendo el listado */}
          {shouldRenderMapAndFetchers && (
            <>
              <div className="AbstractFetching">
                 <FetchCedulas
                  fetchCedulas={fetchCedulas}
                  fetchId={fetchId}
                  onFetchComplete={handleFetchComplete}
                />
                <FetchForense
                  fetchForense={fetchForense}
                  fetchId={fetchId}
                  onFetchComplete={handleFetchComplete}
                />
                <FetchFosas
                  fetchFosas={fetchFosas}
                  fetchId={fetchId}
                  onFetchComplete={handleFetchComplete}
                />
                <FetchNoticias
                  fetchNoticias={fetchNoticias}
                  fetchId={fetchId}
                  onFetchComplete={handleFetchComplete}
                />
              </div>
              <div className={`Map ${location.pathname.includes('/visible/') ? 'visible-view-map' : ''}`}>
                <MapComponent key={location.pathname.includes('/visible/') ? 'map-visible' : 'map-cuaderno'} />
              </div>
            </>
          )}
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              {/* Redirecciones de /dist */}
              <Route path="/dist" element={<Navigate to="/" replace />} />
              <Route path="/dist/cuadernos/lista" element={<Navigate to="/cuaderno/lista" replace />} />
              <Route path="/dist/cuaderno/lista" element={<Navigate to="/cuaderno/lista" replace />} />
              <Route path="/dist/visible/:id" element={<Navigate to="/visible/:id" replace />} />
              <Route path="/cuadernos/lista" element={<Navigate to="/cuaderno/lista" replace />} />

              {/* Rutas Públicas */}
              <Route path="/" element={<LandingPage listNotebooksApp={listNotebooksApp} />} />
              <Route path="/cuaderno/lista" element={<NotebookListPage />} />
              <Route path="/visible/:id" element={<VisibleNotebook />} />
              
              {/* Rutas Privadas */}
              <Route path="/cuaderno/nuevo" element={
                user ? (
                  <AppLayout
                    isNotebookRoute={false}
                    visibleComponents={visibleComponents}
                    toggleComponent={toggleComponent}
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
                ) : (
                  <LoginScreen />
                )
              } />
              <Route path="/cuaderno/:id" element={
                user ? (
                  <AppLayout
                    isNotebookRoute={true}
                    visibleComponents={visibleComponents}
                    toggleComponent={toggleComponent}
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
                ) : (
                  <LoginScreen />
                )
              } />
            </Routes>
          </Suspense>
          
          {globalLinkModal?.isOpen && globalLinkModal?.sourceEntity && (
            <LinkModal 
              isOpen={globalLinkModal.isOpen}
              onClose={() => setGlobalLinkModal({ isOpen: false, sourceEntity: null })}
              sourceEntity={globalLinkModal.sourceEntity}
              sourceTitle={globalLinkModal.sourceEntity.title}
            />
          )}
        </>
      )}
    </>
  );
};

export default App;