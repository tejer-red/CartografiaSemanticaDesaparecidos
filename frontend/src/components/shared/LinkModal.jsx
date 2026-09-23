import React, { useState, useEffect } from 'react';
import { useLinks, RELATION_TYPES } from '../../hooks/useLinks';
import { useData } from '../../context/DataContext';
import { X, Link as LinkIcon, Search, Tag } from 'lucide-react';
import '../../styles/FilterForm.css'; // Reusing general form styles

const LinkModal = ({ isOpen, onClose, sourceEntity, sourceTitle }) => {
  const { createLink, getLinksForEntity, deleteLink } = useLinks();
  const { fetchedRecords, forenseRecords, localFosas, localNoticias, localCedulas } = useData();
  
  const [mode, setMode] = useState('ENTIDAD'); // 'ENTIDAD' | 'ETIQUETA'
  const [targetUuid, setTargetUuid] = useState('');
  const [tagName, setTagName] = useState('');
  const [relationType, setRelationType] = useState(RELATION_TYPES.RELACIONADO_CON);
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [existingLinks, setExistingLinks] = useState([]);

  const resolveEntityName = (uuid) => {
    const strUuid = String(uuid);
    if (strUuid.startsWith('TAG-')) return strUuid.replace('TAG-', '');
    let found = localNoticias?.find(n => String(n.uuid) === strUuid || String(n.id) === strUuid);
    if (found) return found.titular;
    found = localFosas?.find(f => String(f.uuid) === strUuid || String(f.id) === strUuid);
    if (found) return `Fosa en ${found.municipio}`;
    found = localCedulas?.find(c => String(c.uuid) === strUuid || String(c.id) === strUuid);
    if (found) return found.nombre_completo;
    found = fetchedRecords?.features?.find(f => String(f.properties.uuid || f.properties.id) === strUuid);
    if (found) return found.properties.titular || `Fosa en ${found.properties.municipio}`;
    found = forenseRecords?.features?.find(f => String(f.properties.uuid || f.properties.id) === strUuid);
    if (found) return found.properties.nombre_completo;
    return 'Entidad Desconocida';
  };

  const loadLinks = async () => {
    if (sourceEntity && isOpen) {
      try {
        const links = await getLinksForEntity(sourceEntity.uuid || sourceEntity.id);
        setExistingLinks(links);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadLinks();
  }, [isOpen, sourceEntity, getLinksForEntity]);

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

      if (localNoticias) {
        localNoticias.forEach(n => {
          if (n.titular && n.titular.toLowerCase().includes(term)) {
            results.push({ id: n.uuid, label: n.titular, type: 'Noticia (Local)', original: n });
          }
        });
      }
      
      if (localFosas) {
        localFosas.forEach(f => {
          if (f.municipio && f.municipio.toLowerCase().includes(term)) {
            results.push({ id: f.uuid, label: `Fosa en ${f.municipio}`, type: 'Fosa (Local)', original: f });
          }
        });
      }

      if (localCedulas) {
        localCedulas.forEach(c => {
          if (c.nombre_completo && c.nombre_completo.toLowerCase().includes(term)) {
            results.push({ id: c.uuid, label: c.nombre_completo, type: 'Cédula (Local)', original: c });
          }
        });
      }

      if (fetchedRecords && fetchedRecords.features) {
        fetchedRecords.features.forEach(f => {
          const props = f.properties;
          if (!props) return;
          if (props.tipo_marcador === 'noticia' && props.titular && props.titular.toLowerCase().includes(term)) {
            results.push({ id: props.uuid || props.id, label: props.titular, type: 'Noticia (Remota)', original: f });
          } else if (props.municipio && props.municipio.toLowerCase().includes(term)) {
            results.push({ id: props.uuid || props.id, label: `Fosa en ${props.municipio}`, type: 'Fosa (Remota)', original: f });
          }
        });
      }

      if (forenseRecords && forenseRecords.features) {
        forenseRecords.features.forEach(f => {
          const props = f.properties;
          if (!props) return;
          if (props.nombre_completo && props.nombre_completo.toLowerCase().includes(term)) {
            results.push({ id: props.uuid || props.id, label: props.nombre_completo, type: 'Cédula (Remota)', original: f });
          }
        });
      }

      setSearchResults(results.slice(0, 8)); // Limit results
    };

    searchLocalEntities();
  }, [searchTerm, localNoticias, localFosas, localCedulas, fetchedRecords, forenseRecords]);

  // Cálculo de casos candidatos sugeridos por proximidad espacio-temporal
  const suggestedCandidates = React.useMemo(() => {
    if (!sourceEntity) return [];

    let sLat = sourceEntity.lat || sourceEntity.properties?.lat;
    let sLng = sourceEntity.lng || sourceEntity.properties?.lng;
    if (!sLat && sourceEntity.geometry?.coordinates) {
      sLng = sourceEntity.geometry.coordinates[0];
      sLat = sourceEntity.geometry.coordinates[1];
    }

    const sMunicipio = (sourceEntity.municipio || sourceEntity.municipio_extraido || '').toUpperCase();
    let sTime = sourceEntity.timestamp || (sourceEntity.fecha ? new Date(sourceEntity.fecha).getTime() : null);

    const candidates = [];
    const pool = [
      ...(fetchedRecords?.features || []).map(f => ({ ...f.properties, geometry: f.geometry, raw: f })),
      ...(forenseRecords?.features || []).map(f => ({ ...f.properties, geometry: f.geometry, raw: f })),
      ...(localCedulas || []).map(c => ({ ...c, isLocal: true, raw: c }))
    ];

    // Función distancia Haversine en kilómetros
    const getDistKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    pool.forEach(item => {
      const id = item.id_cedula_busqueda || item.uuid || item.id;
      if (!id || id === (sourceEntity.uuid || sourceEntity.id || sourceEntity.id_cedula_busqueda)) return;

      let cLat = item.lat || item.geometry?.coordinates?.[1];
      let cLng = item.lng || item.geometry?.coordinates?.[0];
      if (!cLat && item.lat_long) {
        const parts = item.lat_long.split(',').map(Number);
        cLat = parts[0];
        cLng = parts[1];
      }

      let distKm = null;
      if (sLat && sLng && cLat && cLng) {
        distKm = getDistKm(sLat, sLng, cLat, cLng);
      }

      const cMunicipio = (item.municipio || item.municipio_desaparicion || '').toUpperCase();
      const sameMunicipio = sMunicipio && cMunicipio && (sMunicipio.includes(cMunicipio) || cMunicipio.includes(sMunicipio));

      let diffDays = null;
      let cTime = item.timestamp || (item.fecha_desaparicion ? new Date(item.fecha_desaparicion).getTime() : null);
      if (sTime && cTime && !isNaN(cTime) && !isNaN(sTime)) {
        diffDays = Math.round(Math.abs(sTime - cTime) / (1000 * 60 * 60 * 24));
      }

      // Priorizar candidatos con cercanía geográfica (< 35 km o mismo municipio)
      if (distKm !== null && (distKm < 35 || sameMunicipio)) {
        candidates.push({
          id,
          title: item.nombre_completo || `Cédula ${id.slice(0, 8)}`,
          municipio: item.municipio || 'Jalisco',
          fecha: item.fecha_desaparicion || 'N/D',
          distKm: distKm ? Math.round(distKm * 10) / 10 : null,
          diffDays,
          item
        });
      }
    });

    return candidates
      .sort((a, b) => {
        if (a.distKm !== null && b.distKm !== null && Math.abs(a.distKm - b.distKm) > 5) {
          return a.distKm - b.distKm;
        }
        return (a.diffDays || 9999) - (b.diffDays || 9999);
      })
      .slice(0, 5);
  }, [sourceEntity, fetchedRecords, forenseRecords, localCedulas]);

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
        
        // Determinar lat/lng para dibujar líneas luego en el mapa (si aplican)
        let sLat = sourceEntity.lat || sourceEntity.properties?.lat;
        let sLng = sourceEntity.lng || sourceEntity.properties?.lng;
        if (!sLat && sourceEntity.geometry?.coordinates) {
           sLng = sourceEntity.geometry.coordinates[0];
           sLat = sourceEntity.geometry.coordinates[1];
        }

        let targetData = searchResults.find(r => r.id === targetUuid)?.original;
        let tLat = targetData?.lat || targetData?.properties?.lat;
        let tLng = targetData?.lng || targetData?.properties?.lng;
        if (!tLat && targetData?.geometry?.coordinates) {
           tLng = targetData.geometry.coordinates[0];
           tLat = targetData.geometry.coordinates[1];
        }

        window.dispatchEvent(new CustomEvent('addRelationNoteRequested', {
          detail: {
            source_uuid: sourceEntity.uuid || sourceEntity.id,
            target_uuid: targetUuid,
            tipo_relacion: relationType,
            descripcion: description,
            sourceTitle: sourceTitle,
            targetTitle: searchTerm,
            sourceCoords: (sLat && sLng) ? [sLng, sLat] : null,
            targetCoords: (tLat && tLng) ? [tLng, tLat] : null
          }
        }));
      }
      setTagName('');
      setTargetUuid('');
      setSearchTerm('');
      setDescription('');
      loadLinks(); // Reload existing links
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
          <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Entidad Principal:</span>
          <strong style={{ color: '#111827' }}>{sourceTitle || 'Entidad seleccionada'}</strong>
        </div>

        {existingLinks.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#374151' }}>Relaciones y Etiquetas Actuales</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
              {existingLinks.map(link => {
                const isSource = link.source_uuid === (sourceEntity.uuid || sourceEntity.id);
                const otherUuid = isSource ? link.target_uuid : link.source_uuid;
                const isTag = link.tipo_relacion === 'ETIQUETA' || otherUuid.startsWith('TAG-');
                return (
                  <li key={link.uuid} style={{ fontSize: '12px', background: isTag ? '#ede9fe' : '#f0fdf4', padding: '6px 10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      <strong style={{ color: isTag ? '#6d28d9' : '#166534' }}>{isTag ? 'Etiqueta:' : link.tipo_relacion}</strong>{' '}
                      {resolveEntityName(otherUuid)}
                    </span>
                    <button 
                      onClick={async () => { await deleteLink(link.uuid); loadLinks(); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
                    >&times;</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#374151', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>Añadir Nueva Relación o Etiqueta</h3>
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
              
              {/* Sección de Sugerencias Semi-Supervisadas por Proximidad Espacio-Temporal */}
              {suggestedCandidates.length > 0 && (
                <div style={{ marginBottom: '12px', padding: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    ⚡ Casos sugeridos por proximidad espacio-temporal:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {suggestedCandidates.map((cand) => (
                      <div
                        key={cand.id}
                        onClick={() => {
                          setTargetUuid(cand.id);
                          setSearchTerm(cand.title);
                          setRelationType(RELATION_TYPES.MENCIONA_HALLAZGO || RELATION_TYPES.RELACIONADO_CON);
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          backgroundColor: targetUuid === cand.id ? '#fef3c7' : '#ffffff',
                          border: targetUuid === cand.id ? '1px solid #f59e0b' : '1px solid #e5e7eb',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '12px', color: '#1e293b', display: 'block' }}>{cand.title}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {cand.municipio} • Desap: {cand.fecha}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {cand.distKm !== null && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', display: 'block' }}>
                              ~{cand.distKm} km
                            </span>
                          )}
                          {cand.diffDays !== null && (
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                              ±{cand.diffDays} días
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="input-wrapper">
                <Search size={18} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="O escribe para buscar otra cédula, fosa o nota..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {searchResults.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '5px 0 0 0', border: '1px solid #d1d5db', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', background: 'white' }}>
                  {searchResults.map((result, i) => (
                    <li 
                      key={i} 
                      onClick={() => {
                        setTargetUuid(result.id);
                        setSearchTerm(result.label);
                        // Do NOT clear searchResults here so handleSubmit can find original data
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
