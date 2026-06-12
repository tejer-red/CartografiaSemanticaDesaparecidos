import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useData } from './context/DataContext'; // Remove DataProvider import
import { useAuth } from './context/AuthContext';
import { API_BASE_URL } from './config';
import { FetchCedulas, FetchForense, FetchFosas, FetchNoticias } from './components/data';
import { MapComponent, LocalDataFAB } from './components/map';
import { LoginScreen } from './components/auth';
import { AppLayout, LoadingOverlay } from './components/layout';
import './styles/FilterForm.css'; // Import FilterForm styles

import createLogger from './utils/logger';
const logger = createLogger('App');



const App = () => {
  const [fetchCedulas, setFetchCedulas] = useState(true);
  const [fetchForense, setFetchForense] = useState(true);
  const [fetchFosas, setFetchFosas] = useState(true);
  const [fetchNoticias, setFetchNoticias] = useState(true);
  const [fetchId, setFetchId] = useState(0);
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
  } = useData(); // Use DataContext for shared state

  // State for NotebookLoad modal in Tab 5
  const [isNotebookModalOpen, setIsNotebookModalOpen] = useState(false);
  const [notebookList, setNotebookList] = useState([]);

  // Debug-enabled listNotebooks for Tab 5
  const listNotebooksApp = async () => {
    logger.log('Tab5: listNotebooks called');
    try {
      const response = await fetch(`${API_BASE_URL}/notebooks`);
      if (!response.ok) throw new Error('Failed to fetch notebooks');
      const data = await response.json();
      logger.log('Tab5: listNotebooks response', data);
      if (data.success) {
        setNotebookList(data.notebooks);
        setIsNotebookModalOpen(true);
        logger.log('Tab5: Modal should open now');
      } else {
        alert('No notebooks found.');
      }
    } catch (error) {
      alert('Error fetching notebooks.');
      logger.error('Tab5: Error fetching notebooks:', error);
    }
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
      ) : !user ? (
        <LoginScreen />
      ) : (
        <>
          <LoadingOverlay />
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
          <div className="Map">
            <MapComponent />
          </div>
          <Suspense fallback={<div>Loading...</div>}>
            <Router basename="/dist">
              <Routes>
                <Route path="/cuaderno/:id" element={
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
                } />
                <Route path="/" element={
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
                } />
              </Routes>
            </Router>
          </Suspense>
          <LocalDataFAB />
        </>
      )}
    </>
  );
};

export default App;