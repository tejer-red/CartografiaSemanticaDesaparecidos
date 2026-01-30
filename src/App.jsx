import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useData } from './context/DataContext'; // Remove DataProvider import
import { API_BASE_URL, USE_PASSWORD } from './config';
import FetchCedulas from './components/FetchCedulas';
import FetchForense from './components/FetchForense';
import MapComponent from './components/MapComponent';
import PasswordCheck from './components/PasswordCheck';
import AppLayout from './components/AppLayout';
import LoadingSpinner from './components/LoadingSpinner';
import VisibleNotebook from './components/VisibleNotebook';
import MainMap from './components/MainMap';
import './styles/FilterForm.css'; // Import FilterForm styles


const App = () => {
  const [fetchCedulas, setFetchCedulas] = useState(true);
  const [fetchForense, setFetchForense] = useState(true);
  const [isFormsVisible, setIsFormsVisible] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!USE_PASSWORD);
  const [toolbarTab, setToolbarTab] = useState('tab1'); // State for toolbar tabs

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
    fetchId,
    setFetchId,
  } = useData(); // Use DataContext for shared state

  // State for NotebookLoad modal in Tab 5
  const [isNotebookModalOpen, setIsNotebookModalOpen] = useState(false);
  const [notebookList, setNotebookList] = useState([]);

  // Debug-enabled listNotebooks for Tab 5
  const listNotebooksApp = async () => {
    console.log('Tab5: listNotebooks called');
    try {
      const response = await fetch(`${API_BASE_URL}/list.php`);
      if (!response.ok) throw new Error('Failed to fetch notebooks');
      const data = await response.json();
      console.log('Tab5: listNotebooks response', data);
      if (data.success) {
        setNotebookList(data.notebooks);
        setIsNotebookModalOpen(true);
        console.log('Tab5: Modal should open now');
      } else {
        alert('No notebooks found.');
      }
    } catch (error) {
      alert('Error fetching notebooks.');
      console.error('Tab5: Error fetching notebooks:', error);
    }
  };

  useEffect(() => {
    console.log('App received visibleComponents:', visibleComponents);
    console.log('setVisibleComponents is:', typeof setVisibleComponents);
  }, [visibleComponents, setVisibleComponents]);

  useEffect(() => {
    console.log('isFormsVisible state updated:', isFormsVisible);
  }, [isFormsVisible]);

  // check changes in start and end date
  useEffect(() => {
    console.log('App: startDate updated:', startDate);
  }, [startDate]);

  useEffect(() => {
    console.log('App: endDate updated:', endDate);
  }, [endDate]);

  useEffect(() => {
    if (window.location.hostname === 'localhost') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    console.log('App: Context values from useData():', {
      startDate,
      endDate,
      visibleComponents,
      mapType,
      colorScheme,
    });
  }, [startDate, endDate, visibleComponents, mapType, colorScheme]);

  const handleDateSelect = (start, end) => {
    console.log('Date selected in GlobalTimeGraph:', { start, end });
    setStartDate(start); // Update via DataContext
    setEndDate(end);     // Update via DataContext
    setFetchId(prev => prev + 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted');
    setLoading(true);
    setFetchId(prev => prev + 1); // Increment the fetchId to trigger useEffect in child components
    console.log('Fetch ID incremented:', fetchId + 1);
  };

  const handleFetchComplete = () => {
    console.log('Fetch complete');
    setLoading(false);
  };

  const toggleFormsVisibility = () => {
    console.log('Toggling forms visibility. Current state:', isFormsVisible);
    setIsFormsVisible(!isFormsVisible);
    console.log('New forms visibility state:', !isFormsVisible);
  };

  const toggleComponent = (component) => {
    console.log('Toggling component:', component);
    console.log('Current state before toggle:', visibleComponents);

    if (typeof setVisibleComponents === 'function') {
      setVisibleComponents(prev => {
        const updated = { ...prev, [component]: !prev[component] };
        console.log('New visibility state after toggle:', updated);
        return updated;
      });
    } else {
      console.error('setVisibleComponents is not a function!');
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
      <LoadingSpinner visible={loading} />
      {!isAuthenticated ? (
        <PasswordCheck onAuthenticated={() => setIsAuthenticated(true)} />
      ) : (
        <>
          <Router basename="/dist">
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
            </div>
            <MainMap />
            <Suspense fallback={<div>Loading...</div>}>
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
                    listNotebooksApp={listNotebooksApp}
                  />
                } />
                <Route path="/visible/:id" element={<VisibleNotebook />} />
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
                    listNotebooksApp={listNotebooksApp}
                  />
                } />
              </Routes>
            </Suspense>
          </Router>
        </>
      )}
    </>
  );
};

export default App;