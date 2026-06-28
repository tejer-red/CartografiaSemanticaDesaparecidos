import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { db } from '../lib/localDatabase';
import { calculateStats } from './filteredStats';

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
  const [noteTitle, setNoteTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notebookList, setNotebookList] = useState([]);

  const [isLoaded, setIsLoaded] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!id) {
      setNotes([]);
      return;
    }
    try {
      const logs = await db.navigation_logs
        .where('notebook_id')
        .equals(id)
        .sortBy('timestamp');
      // Format notes for backward compatibility
      setNotes(logs.reverse().map(l => ({
        id: l.id,
        text: l.note || l.text, // support old text field or new note field
        timestamp: l.timestamp,
        state: l.state
      })));
    } catch (e) {
      logger.error('Error loading navigation logs:', e);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setNotes([]);
      setIsLoaded(true);
      return;
    }
    const loadData = async () => {
      setIsLoaded(false);
      try {
        const nb = await db.notebooks.where('name').equals(id).first();
        if (nb && nb.configJSON) {
          const parsed = JSON.parse(nb.configJSON);
          logger.log('Loaded notebook config from IndexedDB:', parsed);
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
          
          setFetchId(prev => prev + 1);
        }
      } catch (e) {
        logger.error('Error loading notebook from IndexedDB:', e);
      }
      
      await loadLogs();
      setIsLoaded(true);
    };
    
    loadData();
    // eslint-disable-next-line
  }, [id]);

  // Unified effect to persist everything to IndexedDB
  useEffect(() => {
    if (!id || !isLoaded) return;
    const saveConfig = async () => {
      const configPayload = {
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
      
      try {
        const nb = await db.notebooks.where('name').equals(id).first();
        if (nb) {
          await db.notebooks.update(nb.id, { configJSON: JSON.stringify(configPayload), updated_at: new Date().toISOString() });
        } else {
          await db.notebooks.add({ name: id, configJSON: JSON.stringify(configPayload), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
        logger.log('Persisting notebook config to IndexedDB:', configPayload);
      } catch (e) {
        logger.error('Error persisting notebook to IndexedDB:', e);
      }
    };
    saveConfig();
  }, [
    id, isLoaded, startDate, endDate, selectedDate, daysRange,
    selectedSexo, selectedCondicion, edadRange, sumScoreRange,
    timeScale, mapType, colorScheme, visibleComponents
  ]);

  const generateContextSnippet = useCallback(() => {
    const parts = [];

    if (startDate && endDate) {
      parts.push(`Período: ${startDate} a ${endDate}`);
    }

    if (selectedDate) {
      const dateStr = selectedDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      parts.push(`Fecha: ${dateStr} (${daysRange} días)`);
    }

    if (selectedSexo && selectedSexo.length > 0 && selectedSexo.length < 2) {
      parts.push(`Sexo: ${selectedSexo.join(', ')}`);
    }

    if (selectedCondicion && selectedCondicion.length > 0 && selectedCondicion.length < 3) {
      parts.push(`Condición: ${selectedCondicion.join(', ')}`);
    }

    if (edadRange && (edadRange[0] > 0 || edadRange[1] < 100)) {
      parts.push(`Edad: ${edadRange[0]}-${edadRange[1]} años`);
    }

    if (mapType) {
      const mapTypeLabel = mapType === 'heatmap' ? 'Mapa de calor' : 'Puntos';
      parts.push(`Vista: ${mapTypeLabel}`);
    }

    if (colorScheme) {
      const colorLabel = colorScheme === 'sexo' ? 'Por sexo' : 'Por condición';
      parts.push(`Color: ${colorLabel}`);
    }

    if (map) {
      const zoom = map.getZoom();
      const center = map.getCenter();
      parts.push(`Zoom: ${zoom.toFixed(1)}`);
      parts.push(`Centro: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`);
    }

    const stats = calculateStats({
      map,
      selectedDate,
      daysRange,
      selectedSexo,
      selectedCondicion,
      edadRange,
      sumScoreRange
    });

    const statParts = [];
    if (stats) {
      statParts.push(`Total: ${stats.total}`);
      if (stats.bySexo) {
        Object.entries(stats.bySexo).forEach(([key, val]) => {
          statParts.push(`${key}: ${val}`);
        });
      }
      if (stats.byCondicion) {
        Object.entries(stats.byCondicion).forEach(([key, val]) => {
          statParts.push(`${key}: ${val}`);
        });
      }
      if (stats.ageStats && stats.ageStats.avg) {
        statParts.push(`Edad promedio: ${stats.ageStats.avg}`);
      }
    }

    if (parts.length === 0 && statParts.length === 0) return '';

    const listContext = parts.map(part => `  • ${part}`).join('\n');
    const listStats = statParts.map(part => `  • ${part}`).join('\n');

    let result = `\n---\n<details>\n<summary><b>[Contexto]</b></summary>\n${listContext}\n</details>`;
    if (listStats) {
      result += `\n<details>\n<summary><b>[Estadísticas]</b></summary>\n${listStats}\n</details>`;
    }
    result += `\n---`;

    return result;
  }, [
    startDate, endDate, selectedDate, daysRange, selectedSexo, selectedCondicion,
    edadRange, mapType, colorScheme, map, sumScoreRange
  ]);

  const captureCurrentState = useCallback(() => {
    const mapState = map ? {
      center: map.getCenter(),
      zoom: map.getZoom()
    } : null;

    return {
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
    };
    // eslint-disable-next-line
  }, [
    selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange,
    timeScale, map, mapType, colorScheme, visibleComponents, startDate, endDate
  ]);

  const addNote = useCallback(async () => {
    if (!noteTitle.trim() || !newNote.trim() || !id) {
      alert('Por favor, completa tanto el título como la nota.');
      return;
    }
    const stateSnapshot = captureCurrentState();
    const contextSnippet = generateContextSnippet();
    const fullText = `# ${noteTitle.trim()}\n${newNote.trim()}${contextSnippet}`;
    
    const newNoteEntry = {
      notebook_id: id,
      text: fullText,
      timestamp: new Date().toISOString(),
      state: stateSnapshot
    };
    try {
      await db.navigation_logs.add(newNoteEntry);
      await loadLogs();
      setNewNote('');
    } catch(e) {
      logger.error('Error adding note:', e);
    }
  }, [newNote, captureCurrentState, id, loadLogs]);

  const addTextOnlyNote = useCallback(async () => {
    if (!noteTitle.trim() || !newNote.trim() || !id) {
      alert('Por favor, completa tanto el título como la nota.');
      return;
    }
    const fullText = `# ${noteTitle.trim()}\n${newNote.trim()}`;
    const newNoteEntry = {
      notebook_id: id,
      text: fullText,
      timestamp: new Date().toISOString(),
      state: null
    };
    try {
      await db.navigation_logs.add(newNoteEntry);
      await loadLogs();
      setNewNote('');
    } catch(e) {
      logger.error('Error adding text note:', e);
    }
  }, [newNote, id, loadLogs]);

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

  const deleteNote = useCallback(async (noteId) => {
    try {
      await db.navigation_logs.delete(noteId);
      await loadLogs();
    } catch (e) {
      logger.error('Error deleting note:', e);
    }
  }, [loadLogs]);

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
      
      const configPayload = {
        startDate: startDate || '',
        endDate: endDate || '',
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

      const payload = {
        id, // pass id so backend knows which one to update if supported
        notes,
        name,
        startDate: startDate || '',
        endDate: endDate || ''
        // we can also pass configJSON but backend might not support it yet
      };
      logger.log('Saving notes to the backend...');
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
      alert('Notes saved successfully!');

      
      if (name !== id) {
        logger.log(`Name changed from ${id} to ${name}. Migrating local storage and IndexedDB...`);
        
        try {
          // create new or update name in IndexedDB
          const existingNb = await db.notebooks.where('name').equals(id).first();
          if (existingNb) {
            await db.notebooks.update(existingNb.id, { name: name, updated_at: new Date().toISOString() });
          } else {
             await db.notebooks.add({ name: name, configJSON: JSON.stringify(configPayload), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
          }

          logger.log('Executing Dexie transaction for migration...');
          await db.transaction('rw', db.local_fosas, db.local_noticias, db.local_cedulas, db.local_vinculos, db.navigation_logs, async () => {
            const fC = await db.local_fosas.filter(f => f.notebook_id === id).modify({ notebook_id: name });
            const nC = await db.local_noticias.filter(n => n.notebook_id === id).modify({ notebook_id: name });
            const cC = await db.local_cedulas.filter(c => c.notebook_id === id).modify({ notebook_id: name });
            const vC = await db.local_vinculos.filter(v => v.notebook_id === id).modify({ notebook_id: name });
            const lC = await db.navigation_logs.filter(l => l.notebook_id === id).modify({ notebook_id: name });
            logger.log(`Migration stats: Fosas(${fC}), Noticias(${nC}), Cedulas(${cC}), Vinculos(${vC}), Logs(${lC})`);
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
  }, [id, notes, startDate, endDate, selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange, timeScale, mapType, colorScheme, visibleComponents, navigate]);

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
      logger.log('Loaded notebook data from backend:', data);
      
      // Save backend notes to IndexedDB if they don't exist? For now just populate context dates
      
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
  }, [setStartDate, setEndDate, setSelectedDate, setTimeScale, setFetchId]);

  const listNotebooks = useCallback(async () => {
    try {
      // First gather local notebooks
      const localNbs = await db.notebooks.toArray();
      
      try {
        const response = await fetch(`${API_BASE_URL}/notebooks`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // merge local and remote?
            const merged = [...data.notebooks];
            for (let l of localNbs) {
               if (!merged.find(m => (typeof m === 'string' ? m : m.name) === l.name)) {
                  merged.push({ id: l.name, name: l.name, created_at: l.created_at, isLocal: true });
               }
            }
            setNotebookList(merged);
            setIsModalOpen(true);
            return;
          }
        }
      } catch (e) {
        logger.error('Failed to fetch remote notebooks:', e);
      }
      
      // fallback to local only
      const mappedLocal = localNbs.map(l => ({ id: l.name, name: l.name, created_at: l.created_at, isLocal: true }));
      setNotebookList(mappedLocal);
      setIsModalOpen(true);
      
    } catch (error) {
      alert('Error fetching notebooks.');
      logger.error('Error fetching notebooks:', error);
    }
  }, []);

  return {
    notes,
    noteTitle,
    newNote,
    isPanelOpen,
    isModalOpen,
    notebookList,
    setNoteTitle,
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
