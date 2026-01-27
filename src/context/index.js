/**
 * context/index.js - Exportaciones centralizadas de contextos
 * 
 * Este archivo permite importar todos los contextos desde un solo lugar:
 * 
 * import { useMap, useFilters, useTimeline, useUI, useRecords } from './context';
 * 
 * O usar el wrapper combinado:
 * import { AppProviders, useData } from './context';
 */

// Contextos individuales
export { MapProvider, useMap } from './MapContext';
export { FiltersProvider, useFilters } from './FiltersContext';
export { TimelineProvider, useTimeline } from './TimelineContext';
export { UIProvider, useUI } from './UIContext';
export { RecordsProvider, useRecords } from './RecordsContext';
export { ToastProvider, useToast } from './ToastContext';

// Re-exportar DataProvider para compatibilidad hacia atrás
export { DataProvider, useData } from './DataContext';
