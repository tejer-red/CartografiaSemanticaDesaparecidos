// Centralized Logger Configuration
// To enable/disable logs for a specific component, change its value here.
export const DEBUG_CONFIG = {
  MarkersForense: false,
  FetchForense: false,
  TabsComponent: false,
  GlobalTimeGraphData: false,
  ExampleComponent: false,
  TimelineSlider: false,
  HeaderCompact: false,
  InitialModal: false,
  BottomTimelinePanel: false,
  FetchFosas: true,
  FetchCedulas: true,
  FetchNoticias: true,
  LayerManager: true,
  AppLayout: false,
  NotebookList: false,
  MapMarkers: true,
  MapComponent: true,
  LayoutForm: false,
  MarkersNoticias: false,
  App: false,
  FilterForm: false,
  MarkersFosas: false,
  DataContext: true,
  layerManager: true,
  
  // Relaciones, Etiquetas e Ingesta
  LinkModal: true,
  LocalDataPanel: true,
  MiniNetworkModal: true,
  useLinks: true,
  useLocalData: true,
  notebook: true,
  useNavigationLog: true,
  ImportContextModal: true,
};

export const SESSION_STATUS = {
  current: 'sesión vacía'
};

class Logger {
  constructor(componentName) {
    this.componentName = componentName;
  }

  shouldLog() {
    // Default to false to suppress unlisted components
    return DEBUG_CONFIG[this.componentName] === true;
  }

  log(...args) {
    if (this.shouldLog()) {
      console.log(`[${this.componentName}] [${SESSION_STATUS.current}]`, ...args);
    }
  }

  error(...args) {
    if (this.shouldLog()) {
      console.error(`[${this.componentName}] [${SESSION_STATUS.current}]`, ...args);
    }
  }

  warn(...args) {
    if (this.shouldLog()) {
      console.warn(`[${this.componentName}] [${SESSION_STATUS.current}]`, ...args);
    }
  }

  info(...args) {
    if (this.shouldLog()) {
      console.info(`[${this.componentName}] [${SESSION_STATUS.current}]`, ...args);
    }
  }

  debug(...args) {
    if (this.shouldLog()) {
      console.debug(`[${this.componentName}] [${SESSION_STATUS.current}]`, ...args);
    }
  }
}

export const createLogger = (componentName) => new Logger(componentName);
export default createLogger;
