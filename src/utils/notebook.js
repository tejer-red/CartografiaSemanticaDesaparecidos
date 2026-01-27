import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

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
    setVisibleComponents
  } = dataContext;

  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notebookList, setNotebookList] = useState([]);

  useEffect(() => {
    const savedNotes = localStorage.getItem('datades-notebook');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Error loading notes from localStorage:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('datades-notebook', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (id) {
      loadNotesFromBackend(id);
    }
    // eslint-disable-next-line
  }, [id]);

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

  const saveNotesToBackend = useCallback(async () => {
    try {
      const name = prompt('Enter a name for the notebook:');
      if (!name) {
        alert('Notebook name is required to save.');
        return;
      }
      const payload = {
        notes,
        name,
        startDate: startDate || '',
        endDate: endDate || ''
      };
      alert('Saving notes to the backend...');
      const response = await fetch(`${API_BASE_URL}/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save notes to backend');
      alert('Notes saved successfully!');
    } catch (error) {
      alert('Error saving notes to backend.');
      console.error('Error saving notes to backend:', error);
    }
  }, [notes, startDate, endDate]);

  const loadNotesFromBackend = useCallback(async (notebookId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/load.php?id=${notebookId}`);
      if (!response.ok) throw new Error('Failed to load notes from backend');
      const data = await response.json();
      setNotes(data.notes || []);
      if (data.startDate) setStartDate(data.startDate);
      if (data.endDate) setEndDate(data.endDate);
      if (data.selectedDate) setSelectedDate(new Date(data.selectedDate));
      if (data.timeScale) setTimeScale(data.timeScale);
    } catch (error) {
      console.error('Notebook: Error loading notes from backend:', error);
    }
  }, [setNotes, setStartDate, setEndDate, setSelectedDate, setTimeScale]);

  const listNotebooks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/list.php`);
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
      console.error('Error fetching notebooks:', error);
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
