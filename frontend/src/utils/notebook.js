import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

import createLogger from '../utils/logger';
const logger = createLogger('notebook');


export function useNotebook(dataContext, id, navigate) {
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    selectedDate,
    setSelectedDate,
    daysRange,
    selectedSexo,
    setSelectedSexo,
    selectedCondicion,
    setSelectedCondicion,
    edadRange,
    setEdadRange,
    sumScoreRange,
    setsumScoreRange,
    timeScale,
    setTimeScale,
    map,
    setDaysRange,
    mapType,
    setMapType,
    colorScheme,
    setColorScheme,
    visibleComponents,
    setVisibleComponents,
    setFetchId
  } = dataContext;

  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notebookList, setNotebookList] = useState([]);

  const storageKey = id ? `datades-notebook-${id}` : 'datades-notebook';

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotes([]);
      setIsLoaded(true);
      return;
    }
    const loadData = async () => {
      setIsLoaded(false);
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          logger.log('Loaded notebook from localStorage:', parsed);
          if (Array.isArray(parsed)) {
            // Backward compatibility: it was just notes array
            setNotes(parsed);
          } else {
            // Unified schema
            setNotes(parsed.notes || []);
            if (parsed.startDate) setStartDate(parsed.startDate);
            if (parsed.endDate) setEndDate(parsed.endDate);
            if (parsed.selectedDate) setSelectedDate(new Date(parsed.selectedDate));
            if (parsed.daysRange !== undefined) setDaysRange(parsed.daysRange);
            if (parsed.selectedSexo) setSelectedSexo(parsed.selectedSexo);
            if (parsed.selectedCondicion) setSelectedCondicion(parsed.selectedCondicion);
            if (parsed.edadRange) setEdadRange(parsed.edadRange);
            if (parsed.sumScoreRange) setsumScoreRange(parsed.sumScoreRange);
            if (parsed.timeScale) setTimeScale(parsed.timeScale);
            if (parsed.mapType) setMapType(parsed.mapType);
            if (parsed.colorScheme) setColorScheme(parsed.colorScheme);
            if (parsed.visibleComponents) setVisibleComponents(parsed.visibleComponents);
          }
          setFetchId(prev => prev + 1);
          setIsLoaded(true);
          return;
        } catch (e) {
          logger.error('Error loading notebook from localStorage:', e);
        }
      }
      
      // Fallback: Try loading from backend if it existed
      let backendLoaded = false;
      if (id) {
        backendLoaded = await loadNotesFromBackend(id);
      }
      setIsLoaded(true);
    };
    
    loadData();
    // eslint-disable-next-line
  }, [id, storageKey]);

  // Unified effect to persist everything to localStorage
  useEffect(() => {
    if (!id || !isLoaded) return;
    const configPayload = {
      notes,
      startDate,
      endDate,
      selectedDate: selectedDate ? selectedDate.toISOString() : null,
      daysRange,
      selectedSexo,
      selectedCondicion,
      edadRange,
      sumScoreRange,
      timeScale,
      mapType,
      colorScheme,
      visibleComponents
    };
    logger.log('Persisting notebook state to localStorage:', configPayload);
    localStorage.setItem(storageKey, JSON.stringify(configPayload));
  }, [
    id, storageKey, isLoaded, notes, startDate, endDate, selectedDate, daysRange,
    selectedSexo, selectedCondicion, edadRange, sumScoreRange,
    timeScale, mapType, colorScheme, visibleComponents
  ]);

  const captureCurrentState = useCallback(() => {
    const timestamp = new Date().toISOString();
    const mapState = map ? {
      center: map.getCenter(),
      zoom: map.getZoom()
    } : null;

    return {
      timestamp,
      state: {
        selectedDate: selectedDate ? selectedDate.toISOString() : null,
        daysRange,
        selectedSexo: [...selectedSexo],
        selectedCondicion: [...selectedCondicion],
        edadRange: [...edadRange],
        sumScoreRange: [...sumScoreRange],
        timeScale,
        mapState,
        mapType,
        colorScheme,
        visibleComponents: visibleComponents ? { ...visibleComponents } : null,
        startDate,
        endDate
      }
    };
    // eslint-disable-next-line
  }, [
    selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange,
    timeScale, map, mapType, colorScheme, visibleComponents, startDate, endDate
  ]);

  const addNote = useCallback(() => {
    if (!newNote.trim()) return;
    const stateSnapshot = captureCurrentState();
    const newNoteEntry = {
      id: Date.now(),
      text: newNote,
      ...stateSnapshot
    };
    setNotes(prev => [newNoteEntry, ...prev]);
    setNewNote('');
  }, [newNote, captureCurrentState]);

  const addTextOnlyNote = useCallback(() => {
    if (!newNote.trim()) return;
    const newNoteEntry = {
      id: Date.now(),
      text: newNote,
      timestamp: new Date().toISOString(),
      state: null
    };
    setNotes(prev => [newNoteEntry, ...prev]);
    setNewNote('');
  }, [newNote]);

  const restoreState = useCallback((savedState) => {
    if (!savedState) return;
    if (savedState.selectedDate) setSelectedDate(new Date(savedState.selectedDate));
    setDaysRange(savedState.daysRange);
    setSelectedSexo(savedState.selectedSexo);
    setSelectedCondicion(savedState.selectedCondicion);
    setEdadRange(savedState.edadRange);
    setsumScoreRange(savedState.sumScoreRange);
    setTimeScale(savedState.timeScale);
    if (savedState.mapType) setMapType(savedState.mapType);
    if (savedState.colorScheme) setColorScheme(savedState.colorScheme);
    if (savedState.visibleComponents && typeof setVisibleComponents === 'function') {
      setVisibleComponents(savedState.visibleComponents);
    }
    if (savedState.mapState && map) {
      map.flyTo({
        center: [savedState.mapState.center.lng, savedState.mapState.center.lat],
        zoom: savedState.mapState.zoom
      });
    }
    if (savedState.startDate) setStartDate(savedState.startDate);
    if (savedState.endDate) setEndDate(savedState.endDate);
  }, [
    setSelectedDate, setDaysRange, setSelectedSexo, setSelectedCondicion, setEdadRange,
    setsumScoreRange, setTimeScale, setMapType, setColorScheme, setVisibleComponents,
    map, setStartDate, setEndDate
  ]);

  const deleteNote = useCallback((id) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  }, []);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const saveNotesToBackend = useCallback(async (customName) => {
    try {
      const name = typeof customName === 'string' ? customName : prompt('Enter a name for the notebook:');
      if (!name) {
        alert('Notebook name is required to save.');
        return;
      }
      const payload = {
        id, // pass id so backend knows which one to update if supported
        notes,
        name,
        startDate: startDate || '',
        endDate: endDate || ''
      };
      logger.log('Saving notes to the backend...');
      // Log the payload being sent to backend
      logger.log('Saving notebook payload:', payload);
      console.log('Saving notebook payload:', payload);
      const response = await fetch(`${API_BASE_URL}/notebooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        logger.error(`Backend returned ${response.status} ${response.statusText}`);
        throw new Error('Failed to save notes to backend');
      }
      const saveResult = await response.json();
      logger.log('Backend save successful. Response:', saveResult);
      console.log('Backend save successful. Response:', saveResult);
      alert('Notes saved successfully!');

      
      if (name !== id) {
        logger.log(`Name changed from ${id} to ${name}. Migrating local storage and IndexedDB...`);
        localStorage.setItem(`datades-notebook-${name}`, JSON.stringify(notes));
        
        try {
          // Dynamically import db to avoid circular deps if any, or just normal import
          const { db } = await import('../lib/localDatabase');
          logger.log('Executing Dexie transaction for migration...');
          await db.transaction('rw', db.local_fosas, db.local_noticias, db.local_cedulas, db.local_vinculos, async () => {
            const fC = await db.local_fosas.filter(f => f.notebook_id === id).modify({ notebook_id: name });
            const nC = await db.local_noticias.filter(n => n.notebook_id === id).modify({ notebook_id: name });
            const cC = await db.local_cedulas.filter(c => c.notebook_id === id).modify({ notebook_id: name });
            const vC = await db.local_vinculos.filter(v => v.notebook_id === id).modify({ notebook_id: name });
            logger.log(`Migration stats: Fosas(${fC}), Noticias(${nC}), Cedulas(${cC}), Vinculos(${vC})`);
          });
          logger.log(`IndexedDB records successfully migrated to new notebook_id: ${name}`);
        } catch(e) {
          logger.error('Failed to migrate IndexedDB records:', e);
          window.history.pushState({}, '', `/cuaderno/${name}`);
        }

        logger.log(`Navigating to /cuaderno/${name}...`);
        navigate(`/cuaderno/${name}`, { replace: true });
      } else {
        logger.log('Name has not changed, skipping migration and navigation.');
      }
    } catch (error) {
      alert('Error saving notes to backend.');
      logger.error('Error saving notes to backend:', error);
    }
  }, [id, notes, startDate, endDate, navigate]);

  const loadNotesFromBackend = useCallback(async (notebookId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}`);
      if (!response.ok) {
        if (response.status === 404) {
          // This is a local session that hasn't been saved to backend yet, perfectly normal.
          return false;
        }
        throw new Error('Failed to load notes from backend: ' + response.statusText);
      }
      const data = await response.json();
      // Debug output of loaded notebook data
      logger.log('Loaded notebook data from backend:', data);
      console.log('Loaded notebook data from backend:', data);
      setNotes(data.notes || []);
      
      // Automatically apply the dates and trigger fetch
      let dateChanged = false;
      if (data.startDate) {
        setStartDate(data.startDate);
        dateChanged = true;
      }
      if (data.endDate) {
        setEndDate(data.endDate);
        dateChanged = true;
      }
      
      if (dateChanged && setFetchId) {
        logger.log('Dates changed from notebook load, triggering data fetch...');
        setFetchId(prev => prev + 1);
      }
      
      if (data.selectedDate) setSelectedDate(new Date(data.selectedDate));
      if (data.timeScale) setTimeScale(data.timeScale);
      
      return true;
    } catch (error) {
      logger.error('Notebook: Error loading notes from backend:', error);
      return false;
    }
  }, [setNotes, setStartDate, setEndDate, setSelectedDate, setTimeScale, setFetchId]);

  const listNotebooks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notebooks`);
      if (!response.ok) throw new Error('Failed to fetch notebooks');
      const data = await response.json();
      if (data.success) {
        setNotebookList(data.notebooks);
        setIsModalOpen(true);
      } else {
        alert('No notebooks found.');
      }
    } catch (error) {
      alert('Error fetching notebooks.');
      logger.error('Error fetching notebooks:', error);
    }
  }, []);

  // Optionally, expose setIsModalOpen for closing modal from Notebook
  return {
    notes,
    newNote,
    isPanelOpen,
    isModalOpen,
    notebookList,
    setIsPanelOpen,
    setNewNote,
    addNote,
    addTextOnlyNote,
    saveNotesToBackend,
    loadNotesFromBackend,
    listNotebooks,
    deleteNote,
    restoreState,
    formatTimestamp,
    setIsModalOpen,
  };
}
