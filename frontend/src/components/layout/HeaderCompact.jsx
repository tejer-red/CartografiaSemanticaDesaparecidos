import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';

import createLogger from '../../utils/logger';
const logger = createLogger('HeaderCompact');


const HeaderCompact = ({ visibleComponents, toggleComponent, onNewDatasetClick }) => {
  const { id } = useParams();
  const location = useLocation();
  const currentTimestamp = Date.now();

  useEffect(() => {
    logger.log('HeaderCompact - Current location:', location);
    logger.log('HeaderCompact - Route params:', { id });
    logger.log('HeaderCompact - Full pathname:', location.pathname);
    logger.log('HeaderCompact - Route match:', location.pathname.includes("/cuaderno/"));
  }, [location, id]);

  return (
    <div className="HeaderCompact">
      <div className="header-info">
        {location.pathname.includes("/cuaderno/") ? (
          <span className="notebook-id">
            Cuaderno ID: {id || 'sin-id'} 
            <small style={{ marginLeft: '10px', color: '#666' }}>
              (Puede navegar este cuaderno en la pestaña "Bitácora de navegación")
            </small>
          </span>
        ) : (
          <span className="timestamp">
            {currentTimestamp}
            <small style={{ marginLeft: '10px', color: '#666' }}>
              Modifique las fechas para analizar las fichas de búsqueda
            </small>
          </span>
        )}
      </div>
      <div style={{display: 'none'}} className="toggle-controls">
        {Object.entries(visibleComponents).map(([key, value]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={value}
              onChange={() => toggleComponent(key)}
            />
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </label>
        ))}
      </div>
      <div>
        <button onClick={onNewDatasetClick}>
          Nuevo conjunto de datos
        </button>
      </div>
    </div>
  );
};

export default HeaderCompact;
