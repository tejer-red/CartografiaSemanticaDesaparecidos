// Centralized Logger Configuration
// To enable/disable logs for a specific component, change its value here.
export const DEBUG_CONFIG = {
  MarkersForense: false,
  FetchForense: true,
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
  LayerManager: false,
  AppLayout: false,
  NotebookList: false,
  MapMarkers: false,
  MapComponent: false,
  LayoutForm: false,
  MarkersNoticias: false,
  App: false,
  FilterForm: false,
  MarkersFosas: false,
  DataContext: true,
  layerManager: true,
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
      console.log(`[${this.componentName}]`, ...args);
    }
  }

  error(...args) {
    if (this.shouldLog()) {
      console.error(`[${this.componentName}]`, ...args);
    }
  }

  warn(...args) {
    if (this.shouldLog()) {
      console.warn(`[${this.componentName}]`, ...args);
    }
  }

  info(...args) {
    if (this.shouldLog()) {
      console.info(`[${this.componentName}]`, ...args);
    }
  }

  debug(...args) {
    if (this.shouldLog()) {
      console.debug(`[${this.componentName}]`, ...args);
    }
  }
}

export const createLogger = (componentName) => new Logger(componentName);
export default createLogger;
