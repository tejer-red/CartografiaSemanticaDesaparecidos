/**
 * main.jsx - Punto de entrada de la aplicación
 * 
 * ESTRUCTURA DE PROVIDERS:
 * 1. StrictMode - Detecta problemas potenciales en desarrollo
 * 2. ToastProvider - Sistema de notificaciones (disponible globalmente)
 * 3. DataProvider - Estado global de la aplicación (mapa, filtros, etc.)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import 'leaflet/dist/leaflet.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </ToastProvider>
  </StrictMode>,
);