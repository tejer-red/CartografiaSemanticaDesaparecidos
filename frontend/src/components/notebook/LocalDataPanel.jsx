import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronRight, Plus, MapPin, Newspaper, FileText, Link2, Trash2 } from 'lucide-react';
import LinkModal from '../shared/LinkModal';
import '../../styles/LocalDataPanel.css';

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
  const { user } = useAuth();
  const { localFosas, localNoticias, localCedulas, localVinculos } = useData();
  
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSource, setLinkSource] = useState(null);

  const openLinkModal = (item, type) => {
    let title = 'Entidad';
    if (type === 'fosa') title = `Fosa en ${item.municipio}`;
    if (type === 'noticia') title = `Noticia: ${item.titular}`;
    if (type === 'cedula') title = `Cédula: ${item.nombre_completo}`;
    
    setLinkSource({ ...item, type, title });
    setLinkModalOpen(true);
  };

  return (
    <div className="local-data-panel">
      <div className="local-panel-header">
        <h3>Información de {user?.email?.split('@')[0] || 'Usuario'}</h3>
        <p className="local-panel-desc">Datos guardados localmente en este dispositivo.</p>
      </div>

      <div className="local-accordion-container">
        <AccordionItem 
          title="Fosas" 
          count={localFosas?.length || 0} 
          icon={MapPin} 
          defaultOpen={true}
          onAdd={() => alert('Para añadir una fosa, haz clic en el botón flotante del mapa +')}
        >
          {localFosas?.length === 0 ? (
            <p className="local-empty-text">No hay fosas locales registradas.</p>
          ) : (
            <ul className="local-list">
              {localFosas?.map(fosa => (
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
          count={localNoticias?.length || 0} 
          icon={Newspaper}
        >
          {localNoticias?.length === 0 ? (
            <p className="local-empty-text">No hay noticias locales registradas.</p>
          ) : (
            <ul className="local-list">
              {localNoticias?.map(noticia => (
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
          count={localCedulas?.length || 0} 
          icon={FileText}
        >
          {localCedulas?.length === 0 ? (
            <p className="local-empty-text">No hay cédulas locales registradas.</p>
          ) : (
            <ul className="local-list">
              {localCedulas?.map(cedula => (
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
          title="Vínculos Semánticos" 
          count={localVinculos?.length || 0} 
          icon={Link2}
        >
          {localVinculos?.length === 0 ? (
            <p className="local-empty-text">No has creado relaciones aún.</p>
          ) : (
            <ul className="local-list">
              {localVinculos?.map(vinculo => (
                <li key={vinculo.uuid} className="local-list-item">
                  <div className="local-item-content" style={{ fontSize: '11px' }}>
                    <strong>{vinculo.tipo_relacion.replace(/_/g, ' ')}</strong>
                    <span style={{ wordBreak: 'break-all' }}>{vinculo.source_uuid.substring(0,6)}... ➔ {vinculo.target_uuid.substring(0,6)}...</span>
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
