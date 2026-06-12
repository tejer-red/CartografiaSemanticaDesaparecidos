import React, { useState, useEffect } from 'react';
import { useLinks, RELATION_TYPES } from '../../hooks/useLinks';
import { useData } from '../../context/DataContext';
import { X, Link as LinkIcon, Search, Tag } from 'lucide-react';
import '../../styles/FilterForm.css'; // Reusing general form styles

const LinkModal = ({ isOpen, onClose, sourceEntity, sourceTitle }) => {
  const { createLink } = useLinks();
  // In the future this will read local and remote datasets from context to search for targets
  const { fetchedRecords, forenseRecords, localFosas, localNoticias, localCedulas } = useData();
  
  const [mode, setMode] = useState('ENTIDAD'); // 'ENTIDAD' | 'ETIQUETA'
  const [targetUuid, setTargetUuid] = useState('');
  const [tagName, setTagName] = useState('');
  const [relationType, setRelationType] = useState(RELATION_TYPES.RELACIONADO_CON);
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock search logic (will be refined when DataContext hybrid logic is fully connected in Phase 4)
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 3) {
      setSearchResults([]);
      return;
    }

    // Basic local search implementation for the prototype
    const searchLocalEntities = () => {
      const results = [];
      const term = searchTerm.toLowerCase();

      // Search in local data (assuming they are arrays of objects with properties)
      if (localNoticias) {
        localNoticias.forEach(n => {
          if (n.titular && n.titular.toLowerCase().includes(term)) {
            results.push({ id: n.uuid, label: n.titular, type: 'Noticia (Local)' });
          }
        });
      }
      
      if (localFosas) {
        localFosas.forEach(f => {
          if (f.municipio && f.municipio.toLowerCase().includes(term)) {
            results.push({ id: f.uuid, label: `Fosa en ${f.municipio}`, type: 'Fosa (Local)' });
          }
        });
      }

      setSearchResults(results.slice(0, 5)); // Limit results
    };

    searchLocalEntities();
  }, [searchTerm, localNoticias, localFosas, localCedulas]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'ENTIDAD' && !targetUuid) return;
    if (mode === 'ETIQUETA' && !tagName.trim()) return;
    
    setLoading(true);
    try {
      if (mode === 'ETIQUETA') {
        await createLink(sourceEntity.uuid || sourceEntity.id, `TAG-${tagName.trim()}`, 'ETIQUETA', description);
      } else {
        await createLink(sourceEntity.uuid || sourceEntity.id, targetUuid, relationType, description);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al crear el vínculo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-overlay" style={{ zIndex: 6000 }}>
      <div className="login-screen-content" style={{ maxWidth: '500px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={20} color="#6b7280" />
        </button>
        
        <h2 className="login-title">
          <LinkIcon size={24} />
          Crear Relación o Etiqueta
        </h2>

        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Vincular desde:</span>
          <strong style={{ color: '#111827' }}>{sourceTitle || 'Entidad seleccionada'}</strong>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            onClick={() => setMode('ENTIDAD')}
            style={{ flex: 1, padding: '8px', border: '1px solid #6366f1', background: mode === 'ENTIDAD' ? '#6366f1' : 'transparent', color: mode === 'ENTIDAD' ? 'white' : '#6366f1', borderRadius: '6px', cursor: 'pointer' }}
          >
            Conectar Entidad
          </button>
          <button 
            onClick={() => setMode('ETIQUETA')}
            style={{ flex: 1, padding: '8px', border: '1px solid #10b981', background: mode === 'ETIQUETA' ? '#10b981' : 'transparent', color: mode === 'ETIQUETA' ? 'white' : '#10b981', borderRadius: '6px', cursor: 'pointer' }}
          >
            <Tag size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Crear Etiqueta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'ENTIDAD' ? (
            <>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Tipo de Relación</label>
              <select 
                value={relationType}
                onChange={(e) => setRelationType(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                {Object.keys(RELATION_TYPES).map(key => (
                  <option key={key} value={key}>{key.replace(/_/g, ' ')}</option>
                ))}
              </select>

              <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginTop: '10px' }}>Buscar Destino</label>
              <div className="input-wrapper">
                <Search size={18} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Escribe para buscar (ej. título de noticia)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {searchResults.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, border: '1px solid #d1d5db', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                  {searchResults.map(result => (
                    <li 
                      key={result.id} 
                      onClick={() => {
                        setTargetUuid(result.id);
                        setSearchTerm(result.label);
                        setSearchResults([]);
                      }}
                      style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', backgroundColor: targetUuid === result.id ? '#eff6ff' : 'white' }}
                    >
                      <div style={{ fontWeight: 500 }}>{result.label}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{result.type}</div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Nombre de la Etiqueta</label>
              <input
                type="text"
                placeholder="Ej. Cartel Jalisco, Caso Ayotzinapa, Bimestre 1"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
              />
            </>
          )}

          <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginTop: '10px' }}>Descripción (Opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles sobre esta relación..."
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px', boxSizing: 'border-box' }}
          />

          <button type="submit" className="submit-button" disabled={loading || (mode === 'ENTIDAD' && !targetUuid) || (mode === 'ETIQUETA' && !tagName.trim())} style={{ marginTop: '20px' }}>
            {loading ? 'Guardando...' : (mode === 'ETIQUETA' ? 'Añadir Etiqueta' : 'Confirmar Relación')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LinkModal;
