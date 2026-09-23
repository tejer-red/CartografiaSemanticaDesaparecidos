import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { 
  Search, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Layers, 
  Skull, 
  Link as LinkIcon
} from 'lucide-react';

const PanelHallazgosCorpus = () => {
  const { map, remoteNoticias, setGlobalLinkModal, selectedDate, daysRange } = useData();
  const [searchMunicipio, setSearchMunicipio] = useState('');
  const [filterByTimeline, setFilterByTimeline] = useState(true);
  const [viewportFeatures, setViewportFeatures] = useState([]);

  // Extraer todas las noticias de hallazgo de corpus en memoria
  const allCorpusFeatures = useMemo(() => {
    if (!remoteNoticias || !remoteNoticias.features) return [];
    return remoteNoticias.features.filter(f => f.properties?.subtipo === 'noticia_corpus');
  }, [remoteNoticias]);

  // Actualizar las noticias visibles dentro del viewport del mapa
  const updateVisibleFeatures = () => {
    if (!map || allCorpusFeatures.length === 0) {
      setViewportFeatures(allCorpusFeatures);
      return;
    }

    try {
      const bounds = map.getBounds();
      if (!bounds) {
        setViewportFeatures(allCorpusFeatures);
        return;
      }

      const visible = allCorpusFeatures.filter(feature => {
        const coords = feature.geometry?.coordinates;
        if (!coords || coords.length < 2) return false;
        const [lng, lat] = coords;
        return bounds.contains([lng, lat]);
      });

      setViewportFeatures(visible);
    } catch (e) {
      setViewportFeatures(allCorpusFeatures);
    }
  };

  // Escuchar movimientos y cambios de zoom del mapa
  useEffect(() => {
    if (!map) return;

    updateVisibleFeatures();
    const handleMove = () => updateVisibleFeatures();

    map.on('moveend', handleMove);
    map.on('zoomend', handleMove);

    return () => {
      map.off('moveend', handleMove);
      map.off('zoomend', handleMove);
    };
  }, [map, allCorpusFeatures]);

  // Filtros combinados: texto, municipio, colectivo, cantidad de cuerpos y ventana temporal del timeline
  const filteredHallazgos = useMemo(() => {
    let minTime = null;
    let maxTime = null;
    if (filterByTimeline && selectedDate) {
      minTime = new Date(selectedDate).getTime();
      maxTime = minTime + ((daysRange || 30) * 86400000);
    }

    return viewportFeatures.filter(item => {
      const p = item.properties || {};
      const titular = p.titular || '';
      const resumen = p.resumen || '';
      const municipio = p.municipio || p.municipio_extraido || '';
      const cuerpos = parseInt(p.total_cuerpos || p.total_cuerpos_estimado || 0, 10);

      // Filtro Temporal del Timeline
      if (minTime !== null && maxTime !== null) {
        const itemTime = Number(p.timestamp || p.timestamp_start || 0);
        const itemEndTime = Number(p.timestamp_end || itemTime);
        if (itemTime > 0) {
          // Intersección con la ventana activa del timeline
          if (itemTime > maxTime || itemEndTime < minTime) {
            return false;
          }
        }
      }

      // Filtro Municipio
      if (searchMunicipio.trim()) {
        const term = searchMunicipio.toLowerCase().trim();
        const matchesMun = municipio.toLowerCase().includes(term);
        const matchesTit = titular.toLowerCase().includes(term);
        if (!matchesMun && !matchesTit) return false;
      }

      return true;
    });
  }, [viewportFeatures, searchMunicipio, filterByTimeline, selectedDate, daysRange]);

  // Centrar el mapa y enfocar un hallazgo
  const handleSelectHallazgo = (feature) => {
    if (!map) return;
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) return;

    map.easeTo({
      center: coords,
      zoom: Math.max(map.getZoom(), 12),
      duration: 800
    });
  };

  const handleOpenLinkModal = (feature) => {
    const props = feature.properties || {};
    setGlobalLinkModal({
      isOpen: true,
      sourceEntity: {
        ...props,
        type: 'noticia',
        titular: props.titular,
        title: props.titular || `Hallazgo en ${props.municipio || 'Jalisco'}`,
        geometry: feature.geometry,
        lat: feature.geometry?.coordinates?.[1],
        lng: feature.geometry?.coordinates?.[0]
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Controles de Filtrado */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Visibles en mapa: <strong style={{ color: '#d97706' }}>{filteredHallazgos.length}</strong> de {allCorpusFeatures.length}
          </span>
        </div>

        {/* Buscador de Municipio */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '8px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Filtrar por municipio o palabra..."
            value={searchMunicipio}
            onChange={(e) => setSearchMunicipio(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              color: '#0f172a',
              fontSize: '11px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Toggle sincronizar con Timeline */}
        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={filterByTimeline}
              onChange={(e) => setFilterByTimeline(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#007bff' }}
            />
            Sincronizar con Timeline
          </label>
          {filterByTimeline && selectedDate && (
            <span style={{ fontSize: '9px', color: '#0284c7', fontWeight: 600 }}>
              Ventana: {daysRange || 30} días
            </span>
          )}
        </div>
      </div>

      {/* Lista de Hallazgos */}
      <div style={{
        maxHeight: '360px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingRight: '2px'
      }}>
        {filteredHallazgos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 10px',
            color: '#64748b',
            fontSize: '12px',
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <Layers size={24} style={{ margin: '0 auto 6px', opacity: 0.5, color: '#94a3b8' }} />
            <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Sin hallazgos en este viewport</p>
            <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>
              Mueva el mapa o ajuste los filtros de búsqueda
            </small>
          </div>
        ) : (
          filteredHallazgos.map((item) => {
            const p = item.properties || {};
            const totalCuerpos = p.total_cuerpos || p.total_cuerpos_estimado;
            const totalRestos = p.total_restos || p.total_restos_estimado;

            return (
              <div
                key={p.id || p.uuid}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #f59e0b',
                  borderRadius: '6px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* Cabecera */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    color: '#b45309', 
                    fontSize: '11px', 
                    fontWeight: 700 
                  }}>
                    <MapPin size={12} />
                    {p.municipio || p.municipio_extraido || 'Jalisco'}
                    {p.colonia ? ` (Col. ${p.colonia})` : ''}
                  </span>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    color: '#64748b', 
                    fontSize: '10px' 
                  }}>
                    <Calendar size={11} />
                    {p.fecha || 'Sin fecha'}
                  </span>
                </div>

                {/* Titular */}
                <h4 
                  onClick={() => handleSelectHallazgo(item)}
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0f172a',
                    lineHeight: '1.35',
                    cursor: 'pointer'
                  }}
                  title="Clic para centrar en el mapa"
                >
                  {p.titular}
                </h4>

                {/* Resumen */}
                {p.resumen && (
                  <p style={{
                    margin: 0,
                    fontSize: '10px',
                    color: '#334155',
                    lineHeight: '1.35',
                    backgroundColor: '#f8fafc',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {p.resumen}
                  </p>
                )}

                {/* Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {totalCuerpos ? (
                    <span style={{
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: '1px solid #fecaca',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '3px'
                    }}>
                      {totalCuerpos} cuerpo{totalCuerpos > 1 ? 's' : ''}
                    </span>
                  ) : null}
                  {totalRestos ? (
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '3px'
                    }}>
                      {totalRestos} restos/bolsas
                    </span>
                  ) : null}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleSelectHallazgo(item)}
                    style={{
                      flex: 1,
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '5px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Centrar
                  </button>
                  <button
                    onClick={() => handleOpenLinkModal(item)}
                    style={{
                      backgroundColor: 'var(--primary-color, #007bff)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    title="Vincular con caso"
                  >
                    <LinkIcon size={12} />
                    Vincular
                  </button>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#0284c7',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '5px 8px',
                        fontSize: '11px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title="Abrir nota original"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PanelHallazgosCorpus;
