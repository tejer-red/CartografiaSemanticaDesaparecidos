// filepath: /home/abundis/comision/CartografiaSemanticaDesaparecidos/frontend/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter as Router } from 'react-router-dom';
import { DataProvider } from './context/DataContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import 'leaflet/dist/leaflet.css'; // Import Leaflet's CSS

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Router basename="/dist">
        <DataProvider>
          <App />
        </DataProvider>
      </Router>
    </AuthProvider>
  </StrictMode>,
);