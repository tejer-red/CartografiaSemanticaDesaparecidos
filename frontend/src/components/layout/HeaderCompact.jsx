import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';

import createLogger from '../../utils/logger';
const logger = createLogger('HeaderCompact');


import { Info, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const HeaderCompact = ({ visibleComponents, toggleComponent, onNewDatasetClick }) => {
  const { id } = useParams();
  const location = useLocation();
  const currentTimestamp = Date.now();
  const { user } = useAuth();
  const dataContext = useData();
  const [showInfoModal, setShowInfoModal] = React.useState(false);

  useEffect(() => {
    logger.log('HeaderCompact - Current location:', location);
    logger.log('HeaderCompact - Route params:', { id });
    logger.log('HeaderCompact - Full pathname:', location.pathname);
    logger.log('HeaderCompact - Route match:', location.pathname.includes("/cuaderno/"));
  }, [location, id]);

  return (
    <div className="HeaderCompact">
      <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {location.pathname.includes("/cuaderno/") ? (
          <>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Cuaderno ID:</span>
            <input 
              id="notebook-id-input"
              type="text" 
              defaultValue={id}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.target.value) {
                    window.dispatchEvent(new CustomEvent('saveNotebookRequested', { detail: { name: e.target.value } }));
                  }
                }
              }}
              style={{ 
                border: '1px solid #d1d5db', 
                borderRadius: '4px', 
                padding: '2px 8px', 
                fontSize: '13px', 
                width: '200px',
                background: 'white',
                outline: 'none'
              }}
              title="Cambiar el nombre y presionar Enter para guardar el cuaderno"
            />
            <button 
              onClick={() => setShowInfoModal(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
              title="Ver detalles del cuaderno"
            >
              <Info size={18} />
            </button>
            <small style={{ marginLeft: '10px', color: '#6b7280' }}>
              (Puede navegar este cuaderno en la "Bitácora de navegación")
            </small>

        {/* Fecha de inicio y fin del cuaderno */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <label style={{ fontSize: '12px', color: '#374151' }}>Fecha de inicio:</label>
          <input
            type="date"
            value={dataContext.startDate ? new Date(dataContext.startDate).toISOString().split('T')[0] : ''}
            onChange={(e) => dataContext.setStartDate(e.target.value)}
            style={{ padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
          <label style={{ fontSize: '12px', color: '#374151' }}>Fecha final:</label>
          <input
            type="date"
            value={dataContext.endDate ? new Date(dataContext.endDate).toISOString().split('T')[0] : ''}
            onChange={(e) => dataContext.setEndDate(e.target.value)}
            style={{ padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
          />
        </div>

            {showInfoModal && (
              <div style={{
                position: 'absolute', top: '40px', left: '20px', background: 'white', border: '1px solid #e5e7eb',
                borderRadius: '8px', padding: '16px', zIndex: 99999, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                width: '320px', fontSize: '13px', color: '#374151'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '14px' }}>Detalles de Sesión</strong>
                  <X size={16} style={{ cursor: 'pointer' }} onClick={() => setShowInfoModal(false)} />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Responsable:</span><br/>
                  <strong>{user?.email || 'Usuario Local'}</strong>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Fecha de creación:</span><br/>
                  <strong>
                    {(() => {
                      const parsedId = parseInt(id);
                      return !isNaN(parsedId) && parsedId > 1000000000000 
                        ? new Date(parsedId).toLocaleString() 
                        : 'Creado a partir de importación/guardado manual';
                    })()}
                  </strong>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Rango de datos:</span><br/>
                  <strong>{dataContext.startDate || 'Inicio'} a {dataContext.endDate || 'Fin'}</strong>
                </div>
                <hr style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ fontSize: '13px' }}>Estadísticas de Sesión:</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Fosas Fetched:</span><br/>
                    <strong>{dataContext.remoteFosas?.features?.length || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Fosas Locales:</span><br/>
                    <strong>{dataContext.localFosas?.length || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Noticias Fetched:</span><br/>
                    <strong>{dataContext.remoteNoticias?.features?.length || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Noticias Locales:</span><br/>
                    <strong>{dataContext.localNoticias?.length || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Cédulas Fetched:</span><br/>
                    <strong>{dataContext.fetchedRecords?.features?.length || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Cédulas Locales:</span><br/>
                    <strong>{dataContext.localCedulas?.length || 0}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Notas en Bitácora:</span><br/>
                    <strong>{(() => {
                      try {
                        const notesStr = localStorage.getItem(`datades-notebook-${id}`);
                        return notesStr ? JSON.parse(notesStr).length : 0;
                      } catch(e) { return 0; }
                    })()}</strong>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <button 
                onClick={() => {
                  const currentInput = document.getElementById('notebook-id-input')?.value || id;
                  window.dispatchEvent(new CustomEvent('saveNotebookRequested', { detail: { name: currentInput } }));
                }}
                style={{ padding: '4px 8px', fontSize: '12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', color: '#4b5563', fontWeight: 500 }}
                title="Guardar este cuaderno en el servidor remoto"
              >
                Guardar en servidor
              </button>
              <button 
                onClick={() => {
                  const targetId = prompt('Ingrese el ID del cuaderno a cargar:');
                  if (targetId) window.dispatchEvent(new CustomEvent('loadNotebookRequested', { detail: { id: targetId } }));
                }}
                style={{ padding: '4px 8px', fontSize: '12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', color: '#4b5563', fontWeight: 500 }}
                title="Cargar un cuaderno desde el servidor remoto"
              >
                Cargar del servidor
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('listNotebooksRequested'))}
                style={{ padding: '4px 8px', fontSize: '12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', color: '#4b5563', fontWeight: 500 }}
                title="Explorar todos los cuadernos remotos"
              >
                Listar cuadernos
              </button>
            </div>
          </>
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
