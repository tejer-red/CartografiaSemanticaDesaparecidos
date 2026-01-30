import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { calculateStats } from './filteredStats';


/**
 * notebook.js - Hook personalizado para gestión de cuadernos de notas
 * 
 * PROPÓSITO:
 * Permite guardar y restaurar estados de la aplicación junto con notas
 * del usuario. Los cuadernos se persisten en el backend PHP y se
 * sincronizan con localStorage.
 * 
 * FUNCIONALIDADES:
 * ================
 * 1. CAPTURA DE ESTADO
 *    - captureCurrentState(): Guarda snapshot completo de filtros, fechas,
 *      posición del mapa, configuración de visualización, etc.
 * 
 * 2. NOTAS
 *    - addNote(): Agrega nota CON estado capturado
 *    - addTextOnlyNote(): Agrega nota SIN estado (solo texto)
 *    - deleteNote(): Elimina nota por ID
 * 
 * 3. RESTAURACIÓN
 *    - restoreState(): Aplica un estado guardado previamente
 *    - Actualiza filtros, fechas, posición del mapa, etc.
 * 
 * 4. PERSISTENCIA
 *    - saveNotesToBackend(): Guarda cuaderno completo en servidor
 *    - loadNotesFromBackend(): Carga cuaderno por ID
 *    - listNotebooks(): Lista todos los cuadernos disponibles
 * 
 * FLUJO DE DATOS:
 * ---------------
 * Usuario crea nota → captureCurrentState() → guardar en notes[] 
 * → sincroniza con localStorage → opcionalmente saveNotesToBackend()
 * 
 * @param {Object} dataContext - Contexto de datos de la aplicación
 * @param {string} id - ID del cuaderno a cargar (opcional)
 * @param {function} navigate - Función de navegación de React Router
 * @returns {Object} Funciones y estados del cuaderno
 */

export function useNotebook(dataContext, id, navigate, onCloseModal) {

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
  const [noteTitle, setNoteTitle] = useState(''); // Title for the note
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notebookList, setNotebookList] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track if notebook has been modified
  const [loadedNotebookId, setLoadedNotebookId] = useState(id || null); // Track the loaded notebook ID

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
    console.log('[useEffect localStorage] Saving notes to localStorage:', notes);
    localStorage.setItem('datades-notebook', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (id) {
      loadNotesFromBackend(id);
    }
    // eslint-disable-next-line
  }, [id]);

  const generateContextSnippet = useCallback(() => {
    const parts = [];

    // Rango de fechas
    if (startDate && endDate) {
      parts.push(`Período: ${startDate} a ${endDate}`);
    }

    // Fecha seleccionada en timeline
    if (selectedDate) {
      const dateStr = selectedDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      parts.push(`Fecha: ${dateStr} (${daysRange} días)`);
    }

    // Filtros de sexo
    if (selectedSexo && selectedSexo.length > 0 && selectedSexo.length < 2) {
      parts.push(`Sexo: ${selectedSexo.join(', ')}`);
    }

    // Filtros de condición
    if (selectedCondicion && selectedCondicion.length > 0 && selectedCondicion.length < 3) {
      parts.push(`Condición: ${selectedCondicion.join(', ')}`);
    }

    // Rango de edad
    if (edadRange && (edadRange[0] > 0 || edadRange[1] < 100)) {
      parts.push(`Edad: ${edadRange[0]}-${edadRange[1]} años`);
    }

    // Layout - Tipo de mapa
    if (mapType) {
      const mapTypeLabel = mapType === 'heatmap' ? 'Mapa de calor' : 'Puntos';
      parts.push(`Vista: ${mapTypeLabel}`);
    }

    // Layout - Esquema de color
    if (colorScheme) {
      const colorLabel = colorScheme === 'sexo' ? 'Por sexo' : 'Por condición';
      parts.push(`Color: ${colorLabel}`);
    }

    // Zoom y Centro del mapa
    if (map) {
      const zoom = map.getZoom();
      const center = map.getCenter();
      parts.push(`Zoom: ${zoom.toFixed(1)}`);
      parts.push(`Centro: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`);
    }

    // Calcular estadísticas
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
    console.log('[addNote] Called with noteTitle:', noteTitle, 'newNote:', newNote);
    // Validate both fields are filled
    if (!noteTitle.trim() || !newNote.trim()) {
      console.log('[addNote] Title or note is empty, returning');
      alert('Por favor, completa tanto el título como la nota.');
      return;
    }
    const stateSnapshot = captureCurrentState();
    const contextSnippet = generateContextSnippet();
    console.log('[addNote] State snapshot captured:', stateSnapshot);
    console.log('[addNote] Context snippet:', contextSnippet);

    // Build the full text with title
    const fullText = `# ${noteTitle.trim()}\n${newNote.trim()}${contextSnippet}`;

    const newNoteEntry = {
      id: Date.now(),
      text: fullText,
      ...stateSnapshot
    };
    console.log('[addNote] New note entry created:', newNoteEntry);
    setNotes(prev => {
      const updated = [newNoteEntry, ...prev];
      console.log('[addNote] Updated notes array:', updated);
      return updated;
    });
    setNewNote('');
    setNoteTitle(''); // Clear title field
    setHasUnsavedChanges(true); // Mark as modified
    console.log('[addNote] Note added successfully, hasUnsavedChanges set to true');
  }, [newNote, noteTitle, captureCurrentState, generateContextSnippet]);

  const addTextOnlyNote = useCallback(() => {
    // Validate both fields are filled
    if (!noteTitle.trim() || !newNote.trim()) {
      alert('Por favor, completa tanto el título como la nota.');
      return;
    }
    const contextSnippet = generateContextSnippet();

    // Build the full text with title
    const fullText = `# ${noteTitle.trim()}\n${newNote.trim()}${contextSnippet}`;

    const newNoteEntry = {
      id: Date.now(),
      text: fullText,
      timestamp: new Date().toISOString(),
      state: null
    };
    setNotes(prev => [newNoteEntry, ...prev]);
    setNewNote('');
    setNoteTitle(''); // Clear title field
    setHasUnsavedChanges(true); // Mark as modified
  }, [newNote, noteTitle, generateContextSnippet]);

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

    // Cerrar modal en móvil si existe la función
    if (onCloseModal && typeof onCloseModal === 'function') {
      onCloseModal();
    }
  }, [
    setSelectedDate, setDaysRange, setSelectedSexo, setSelectedCondicion, setEdadRange,
    setsumScoreRange, setTimeScale, setMapType, setColorScheme, setVisibleComponents,
    map, setStartDate, setEndDate, onCloseModal
  ]);

  const deleteNote = useCallback((id) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    setHasUnsavedChanges(true); // Mark as modified
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
      const data = await response.json();
      alert('Notes saved successfully!');
      setHasUnsavedChanges(false); // Reset unsaved changes flag
      if (data.id) {
        setLoadedNotebookId(data.id); // Store the new notebook ID
      }
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
      setLoadedNotebookId(notebookId); // Store the loaded notebook ID
      setHasUnsavedChanges(false); // Reset unsaved changes flag
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
    noteTitle,
    setNoteTitle,
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
    hasUnsavedChanges,
    loadedNotebookId,
  };
}
