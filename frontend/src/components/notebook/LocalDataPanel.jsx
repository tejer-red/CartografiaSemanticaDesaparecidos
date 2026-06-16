import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalData } from '../../hooks/useLocalData';
import { ChevronDown, ChevronRight, Plus, MapPin, Newspaper, FileText, Link2, Info, Search } from 'lucide-react';
import LinkModal from '../shared/LinkModal';
import SemanticLinkInfoModal from '../shared/SemanticLinkInfoModal';
import MiniNetworkModal from '../shared/MiniNetworkModal';
import ImportContextModal from './ImportContextModal';
import createLogger from '../../utils/logger';
import '../../styles/LocalDataPanel.css';

const logger = createLogger('LocalDataPanel');

const AccordionItem = ({ title, count, icon: Icon, children, defaultOpen = false, onAdd }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="local-accordion-item">
      <div 
        className={`local-accordion-header ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="local-accordion-title">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Icon size={16} />
          <span>{title}</span>
          <span className="local-badge">{count}</span>
        </div>
        {onAdd && (
          <button 
            className="local-add-btn" 
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            title={`Añadir ${title}`}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="local-accordion-content">
          {children}
        </div>
      )}
    </div>
  );
};

const LocalDataPanel = () => {
  const { user, signOut } = useAuth();
  const { localFosas, localNoticias, localCedulas, localVinculos, fetchedRecords, forenseRecords, refreshLocalData } = useData();
  const { addLocalFosa, addLocalNoticia, addLocalCedula, clearAllLocalData } = useLocalData();
  
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSource, setLinkSource] = useState(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [selectedVinculo, setSelectedVinculo] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importEntityData, setImportEntityData] = useState(null);
  const [importEntityType, setImportEntityType] = useState(null);

  const notebookId = window.location.pathname.match(/\/cuaderno\/([^\/]+)/)?.[1];
  const filteredFosas = localFosas?.filter(f => f.notebook_id === notebookId) || [];
  const filteredNoticias = localNoticias?.filter(n => n.notebook_id === notebookId) || [];
  const filteredCedulas = localCedulas?.filter(c => c.notebook_id === notebookId) || [];
  const filteredVinculos = localVinculos?.filter(v => v.notebook_id === notebookId) || [];

  const openLinkModal = (item, type) => {
    let title = 'Entidad';
    if (type === 'fosa') title = `Fosa en ${item.municipio}`;
    if (type === 'noticia') title = `Noticia: ${item.titular}`;
    if (type === 'cedula') title = `Cédula: ${item.nombre_completo}`;
    
    setLinkSource({ ...item, type, title });
    setLinkModalOpen(true);
  };

  React.useEffect(() => {
    const handleOpenImportModal = (e) => {
      logger.log('Recibido evento openImportModal:', e.detail);
      if (e.detail && e.detail.type && e.detail.data) {
        openImportModal(e.detail.type, e.detail.data);
      }
    };
    window.addEventListener('openImportModal', handleOpenImportModal);
    return () => window.removeEventListener('openImportModal', handleOpenImportModal);
  }, []);

  const openImportModal = (type, data) => {
    setImportEntityType(type);
    setImportEntityData(data);
    setImportModalOpen(true);
  };

  const handleAddFosa = () => {
    const lat = 20.6 + Math.random() * 0.5;
    const lng = -103.3 - Math.random() * 0.5;
    openImportModal('fosa', { lat, lng, municipio: 'Zapopan (Local)', estado: 'Jalisco', fecha_hallazgo: new Date().toISOString().split('T')[0] });
  };

  const handleAddNoticia = () => {
    const lat = 20.6 + Math.random() * 0.5;
    const lng = -103.3 - Math.random() * 0.5;
    openImportModal('noticia', { lat, lng, titular: 'Hallazgo reportado localmente', url: 'https://ejemplo.com', fecha: new Date().toISOString().split('T')[0] });
  };

  const [cedulaSearchTerm, setCedulaSearchTerm] = useState('');
  const [showCedulaSearch, setShowCedulaSearch] = useState(false);
  const [cedulaSearchResults, setCedulaSearchResults] = useState([]);

  const handleSearchCedula = (e) => {
    const term = e.target.value;
    setCedulaSearchTerm(term);
    if (term.length < 3) {
      setCedulaSearchResults([]);
      return;
    }
    const results = [];
    if (forenseRecords && forenseRecords.features) {
      forenseRecords.features.forEach(f => {
        const props = f.properties;
        if (props && props.nombre_completo && props.nombre_completo.toLowerCase().includes(term.toLowerCase())) {
          results.push(props);
        }
      });
    }
    setCedulaSearchResults(results.slice(0, 5));
  };

  const handleAddRemoteCedulaToLocal = (cedula) => {
    openImportModal('cedula', {
      ...cedula,
      isLocal: true,
      original_uuid: cedula.uuid || cedula.id
    });
  };

  return (
    <div className="local-data-panel">
      <div className="local-panel-header">
        <h3>Información de {user?.email?.split('@')[0] || 'Usuario'}</h3>
        <p className="local-panel-desc">Datos guardados localmente en este dispositivo.</p>
        <button 
          onClick={async () => {
            if (window.confirm('¿Seguro que deseas borrar todos los datos de la sesión local (IndexedDB)? Esto no cerrará tu sesión.')) {
              await clearAllLocalData();
              refreshLocalData();
            }
          }}
          style={{ marginTop: '10px', width: '100%', padding: '6px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
        >
          Borrar base local
        </button>
      </div>

      <div className="local-accordion-container">
        <AccordionItem 
          title="Fosas" 
          count={filteredFosas.length} 
          icon={MapPin} 
          defaultOpen={true}
          onAdd={handleAddFosa}
        >
          {filteredFosas.length === 0 ? (
            <p className="local-empty-text">No hay fosas locales registradas.</p>
          ) : (
            <ul className="local-list">
              {filteredFosas.map(fosa => (
                <li key={fosa.uuid} className="local-list-item">
                  <div className="local-item-content">
                    <strong>Fosa en {fosa.municipio || 'Ubicación desconocida'}</strong>
                    <span>{fosa.fecha_hallazgo}</span>
                  </div>
                  <div className="local-item-actions">
                    <button onClick={() => openLinkModal(fosa, 'fosa')} title="Vincular"><Link2 size={14} /></button>
                    {/* Add delete logic inside useLocalData if needed, not implemented for brevity */}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AccordionItem>

        <AccordionItem 
          title="Noticias" 
          count={filteredNoticias.length} 
          icon={Newspaper}
          onAdd={handleAddNoticia}
        >
          {filteredNoticias.length === 0 ? (
            <p className="local-empty-text">No hay noticias locales registradas.</p>
          ) : (
            <ul className="local-list">
              {filteredNoticias.map(noticia => (
                <li key={noticia.uuid} className="local-list-item">
                  <div className="local-item-content">
                    <strong>{noticia.titular || 'Sin titular'}</strong>
                    <a href={noticia.url} target="_blank" rel="noreferrer" className="local-link">Ver fuente</a>
                  </div>
                  <div className="local-item-actions">
                    <button onClick={() => openLinkModal(noticia, 'noticia')} title="Vincular"><Link2 size={14} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AccordionItem>

        <AccordionItem 
          title="Cédulas" 
          count={filteredCedulas.length} 
          icon={FileText}
          onAdd={() => setShowCedulaSearch(!showCedulaSearch)}
        >
          {showCedulaSearch && (
            <div style={{ padding: '10px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
                <input 
                  type="text" 
                  placeholder="Buscar cédula remota para importar..." 
                  value={cedulaSearchTerm}
                  onChange={handleSearchCedula}
                  style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontSize: '12px' }}
                />
              </div>
              {cedulaSearchResults.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '5px 0 0 0', border: '1px solid #d1d5db', borderRadius: '4px', maxHeight: '100px', overflowY: 'auto', background: 'white' }}>
                  {cedulaSearchResults.map((res, i) => (
                    <li key={i} onClick={() => handleAddRemoteCedulaToLocal(res)} style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '11px' }}>
                      <strong>{res.nombre_completo}</strong>
                      <span style={{ display: 'block', color: '#6b7280' }}>Pinchar para importar a local</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {filteredCedulas.length === 0 ? (
            <p className="local-empty-text">No hay cédulas locales registradas.</p>
          ) : (
            <ul className="local-list">
              {filteredCedulas.map(cedula => (
                <li key={cedula.uuid} className="local-list-item">
                  <div className="local-item-content">
                    <strong>{cedula.nombre_completo || 'Desconocido'}</strong>
                    <span>{cedula.estatus}</span>
                  </div>
                  <div className="local-item-actions">
                    <button onClick={() => openLinkModal(cedula, 'cedula')} title="Vincular"><Link2 size={14} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AccordionItem>

        <AccordionItem 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Relaciones y Etiquetas
              <button 
                onClick={(e) => { e.stopPropagation(); setInfoModalOpen(true); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#6366f1' }}
                title="¿Qué son las relaciones y etiquetas?"
              >
                <Info size={14} />
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelectedVinculo(null);
                  setNetworkModalOpen(true); 
                }}
                style={{ background: '#4f46e5', border: 'none', cursor: 'pointer', display: 'flex', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}
              >
                Visualizar Red
              </button>
            </div>
          }
          count={filteredVinculos?.length || 0} 
          icon={Link2}
        >
          {filteredVinculos?.length === 0 ? (
            <p className="local-empty-text">No has creado relaciones aún.</p>
          ) : (
            <ul className="local-list">
              {filteredVinculos?.map(vinculo => (
                <li 
                  key={vinculo.uuid} 
                  className="local-list-item" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedVinculo(vinculo);
                    setNetworkModalOpen(true);
                  }}
                  title="Ver visualización en red"
                >
                  <div className="local-item-content" style={{ fontSize: '11px' }}>
                    <strong>{vinculo.tipo_relacion === 'ETIQUETA' ? 'ETIQUETA' : vinculo.tipo_relacion.replace(/_/g, ' ')}</strong>
                    <span style={{ wordBreak: 'break-all' }}>
                      {vinculo.tipo_relacion === 'ETIQUETA' 
                        ? `${vinculo.source_uuid.substring(0,6)}... ⟷ ${vinculo.target_uuid.replace('TAG-', '')}`
                        : `${vinculo.source_uuid.substring(0,6)}... ➔ ${vinculo.target_uuid.substring(0,6)}...`
                      }
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AccordionItem>
      </div>

      <div className="local-panel-footer">
        <AlertTriangleIcon size={16} color="#d97706" />
        <p>Estos datos viven solo en este dispositivo. La sincronización encriptada no está habilitada.</p>
      </div>

      {linkModalOpen && linkSource && (
        <LinkModal 
          isOpen={linkModalOpen} 
          onClose={() => setLinkModalOpen(false)} 
          sourceEntity={linkSource}
          sourceTitle={linkSource.title}
        />
      )}

      {infoModalOpen && (
        <SemanticLinkInfoModal 
          isOpen={infoModalOpen} 
          onClose={() => setInfoModalOpen(false)} 
        />
      )}

        <MiniNetworkModal
          isOpen={networkModalOpen}
          onClose={() => setNetworkModalOpen(false)}
          vinculo={selectedVinculo}
          allVinculos={!selectedVinculo ? filteredVinculos : []}
          localFosas={localFosas}
          localNoticias={localNoticias}
          localCedulas={localCedulas}
          fetchedRecords={fetchedRecords}
          forenseRecords={forenseRecords}
        />

      {importModalOpen && importEntityData && (
        <ImportContextModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          entityData={importEntityData}
          entityType={importEntityType}
          onImportComplete={() => {
            refreshLocalData();
            if (importEntityType === 'cedula') {
              setCedulaSearchTerm('');
              setCedulaSearchResults([]);
              setShowCedulaSearch(false);
            }
          }}
        />
      )}
    </div>
  );
};

// Quick inline icon component to avoid extra imports
const AlertTriangleIcon = ({ size, color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

export default LocalDataPanel;
