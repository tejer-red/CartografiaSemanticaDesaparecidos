import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Info, X, Save, FolderOpen, List, Calendar, Plus, BookOpen, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import GlobalAuthIndicator from '../auth/GlobalAuthIndicator';
import createLogger from '../../utils/logger';
import './HeaderCompact.css';

const logger = createLogger('HeaderCompact');

const HeaderCompact = ({ visibleComponents, toggleComponent, onNewDatasetClick, onHeightChange }) => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const dataContext = useData();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    logger.log('HeaderCompact - Current location:', location);
  }, [location, id]);

  useEffect(() => {
    if (!headerRef.current || !onHeightChange) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Usamos getBoundingClientRect para precisión total de subpíxeles y márgenes
        onHeightChange(entry.target.getBoundingClientRect().height);
      }
    });

    observer.observe(headerRef.current);

    // Notificar altura inicial
    onHeightChange(headerRef.current.getBoundingClientRect().height);

    return () => {
      observer.disconnect();
    };
  }, [onHeightChange]);

  const handleSaveClick = () => {
    const currentInput = document.getElementById('notebook-id-input')?.value || id;
    window.dispatchEvent(new CustomEvent('saveNotebookRequested', { detail: { name: currentInput } }));
  };

  const handleLoadClick = () => {
    const targetId = prompt('Ingrese el ID del cuaderno a cargar:');
    if (targetId) {
      window.dispatchEvent(new CustomEvent('loadNotebookRequested', { detail: { id: targetId } }));
    }
  };

  const isNotebook = location.pathname.includes("/cuaderno/");

  return (
    <header className="HeaderCompact" ref={headerRef}>
      <div className="header-compact-container">
        {isNotebook ? (
          <>
            {/* Sección del Cuaderno */}
            <div className="header-section notebook-section">
              <div className="notebook-title-wrapper">
                <BookOpen size={18} className="icon-notebook" />
                <span className="label-notebook-id">Cuaderno:</span>
              </div>
              <input 
                id="notebook-id-input"
                type="text" 
                defaultValue={id || 'Nuevo Cuaderno'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    window.dispatchEvent(new CustomEvent('saveNotebookRequested', { detail: { name: e.target.value } }));
                  }
                }}
                className="notebook-input"
                title="Cambiar el nombre y presionar Enter para guardar"
              />
              <button 
                onClick={() => setShowInfoModal(true)}
                className="info-btn"
                title="Ver detalles del cuaderno"
              >
                <Info size={16} />
              </button>

              {showInfoModal && (
                <div className="session-info-dropdown">
                  <div className="dropdown-header">
                    <strong>Detalles de Sesión</strong>
                    <button className="close-dropdown-btn" onClick={() => setShowInfoModal(false)}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="dropdown-body">
                    <div className="info-item">
                      <span className="item-label">Responsable:</span>
                      <strong className="item-value">{user?.email || 'Usuario Local'}</strong>
                    </div>
                    <div className="info-item">
                      <span className="item-label">Fecha de creación:</span>
                      <strong className="item-value">
                        {(() => {
                          const parsedId = parseInt(id);
                          return !isNaN(parsedId) && parsedId > 1000000000000 
                            ? new Date(parsedId).toLocaleString('es-ES') 
                            : 'Creado localmente o importado';
                        })()}
                      </strong>
                    </div>
                    <div className="info-item">
                      <span className="item-label">Rango de datos:</span>
                      <strong className="item-value">
                        {dataContext.startDate ? new Date(dataContext.startDate).toLocaleDateString('es-ES') : 'Inicio'} a {dataContext.endDate ? new Date(dataContext.endDate).toLocaleDateString('es-ES') : 'Fin'}
                      </strong>
                    </div>
                    <hr className="dropdown-divider" />
                    <div className="info-stats-title">Estadísticas:</div>
                    <div className="info-stats-grid">
                      <div className="stat-box">
                        <span>Fosas Remotas</span>
                        <strong>{dataContext.remoteFosas?.features?.length || 0}</strong>
                      </div>
                      <div className="stat-box">
                        <span>Fosas Locales</span>
                        <strong>{dataContext.localFosas?.length || 0}</strong>
                      </div>
                      <div className="stat-box">
                        <span>Noticias Remotas</span>
                        <strong>{dataContext.remoteNoticias?.features?.length || 0}</strong>
                      </div>
                      <div className="stat-box">
                        <span>Noticias Locales</span>
                        <strong>{dataContext.localNoticias?.length || 0}</strong>
                      </div>
                      <div className="stat-box font-span-2">
                        <span>Cédulas Totales</span>
                        <strong>{dataContext.fetchedRecords?.features?.length || 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sección de Rango de Fechas */}
            <div className="header-section dates-section">
              <Calendar size={18} className="icon-calendar" />
              <div className="date-input-group">
                <label htmlFor="start-date-picker">Inicio:</label>
                <input
                  id="start-date-picker"
                  type="date"
                  value={dataContext.startDate ? new Date(dataContext.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => dataContext.setStartDate(e.target.value)}
                  className="date-picker-input"
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="end-date-picker">Fin:</label>
                <input
                  id="end-date-picker"
                  type="date"
                  value={dataContext.endDate ? new Date(dataContext.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => dataContext.setEndDate(e.target.value)}
                  className="date-picker-input"
                />
              </div>
            </div>

            {/* Sección de Acciones */}
            <div className="header-section actions-section">
              <button 
                onClick={handleSaveClick}
                className="action-icon-btn"
                title="Guardar este cuaderno en el servidor"
              >
                <Save size={16} />
                <span>Guardar</span>
              </button>
              <button 
                onClick={handleLoadClick}
                className="action-icon-btn"
                title="Cargar un cuaderno desde el servidor"
              >
                <FolderOpen size={16} />
                <span>Cargar</span>
              </button>
              <button 
                onClick={() => navigate('/cuaderno/lista')}
                className="action-icon-btn"
                title="Ver lista de cuadernos guardados"
              >
                <List size={16} />
                <span>Ver Lista</span>
              </button>
              {id && (
                <button 
                  onClick={() => {
                    const baseUrl = window.location.pathname.startsWith('/dist') ? '/dist' : '';
                    window.open(`${baseUrl}/visible/${id}`, '_blank');
                  }}
                  className="action-icon-btn"
                  title="Ver versión pública de este cuaderno en una pestaña nueva"
                >
                  <Eye size={16} />
                  <span>Ver Público</span>
                </button>
              )}
              <button 
                onClick={onNewDatasetClick}
                className="btn-accent"
                title="Crear un nuevo cuaderno"
              >
                <Plus size={16} />
                <span>Nuevo Cuaderno</span>
              </button>
              <div className="header-auth-wrapper" style={{ marginLeft: '8px' }}>
                <GlobalAuthIndicator />
              </div>
            </div>
          </>
        ) : (
          <div className="header-standalone-info">
            <span className="timestamp-badge">{Date.now()}</span>
            <small>Modifique las fechas para analizar las fichas de búsqueda</small>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderCompact;
