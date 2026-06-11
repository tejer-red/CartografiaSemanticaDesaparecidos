// filepath: /home/abundis/comision/CartografiaSemanticaDesaparecidos/frontend/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import 'leaflet/dist/leaflet.css'; // Import Leaflet's CSS

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataProvider>
      <Theme>
        <App />
      </Theme>
    </DataProvider>
  </StrictMode>,
);