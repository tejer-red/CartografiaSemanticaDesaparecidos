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
  const [selectedColectivo, setSelectedColectivo] = useState('ALL');
  const [minCuerpos, setMinCuerpos] = useState(0);
  const [filterByTimeline, setFilterByTimeline] = useState(true);
  const [viewportFeatures, setViewportFeatures] = useState([]);

  // Colectivos buscadores conocidos en Jalisco
  const colectivosList = [
    { id: 'ALL', name: 'Todos los colectivos' },
    { id: 'GUERREROS', name: 'Guerreros Buscadores', regex: /guerreros buscadores/i },
    { id: 'MADRES', name: 'Madres Buscadoras', regex: /madres buscadoras/i },
    { id: 'LOBOS', name: 'Lobos Buscadores', regex: /lobos buscadores/i },
    { id: 'CORAZONES', name: 'Corazones Unidos', regex: /corazones unidos/i },
    { id: 'ENTRE_CIELO_Y_TIERRA', name: 'Entre Cielo y Tierra', regex: /entre cielo y tierra/i },
    { id: 'OTRO', name: 'Otros colectivos / Sin colectivo', regex: null }
  ];

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

      // Filtro Colectivo
      if (selectedColectivo !== 'ALL') {
        const target = colectivosList.find(c => c.id === selectedColectivo);
        if (target && target.regex) {
          const match = target.regex.test(titular) || target.regex.test(resumen);
          if (!match) return false;
        } else if (selectedColectivo === 'OTRO') {
          const matchedAnyKnown = colectivosList.some(c => c.regex && (c.regex.test(titular) || c.regex.test(resumen)));
          if (matchedAnyKnown) return false;
        }
      }

      // Filtro mínimo de cuerpos
      if (minCuerpos > 0 && cuerpos < minCuerpos) {
        return false;
      }

      return true;
    });
  }, [viewportFeatures, searchMunicipio, selectedColectivo, minCuerpos, filterByTimeline, selectedDate, daysRange]);

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
        backgroundColor: '#0f172a',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Visibles en mapa: <strong style={{ color: '#f59e0b' }}>{filteredHallazgos.length}</strong> de {allCorpusFeatures.length}
          </span>
        </div>

        {/* Buscador de Municipio */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '8px', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Filtrar por municipio o palabra..."
            value={searchMunicipio}
            onChange={(e) => setSearchMunicipio(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '4px',
              color: '#f8fafc',
              fontSize: '11px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Selector de Colectivo y Cuerpos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
              Colectivo:
            </label>
            <select
              value={selectedColectivo}
              onChange={(e) => setSelectedColectivo(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '10px',
                outline: 'none'
              }}
            >
              {colectivosList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
              Mín. cuerpos:
            </label>
            <select
              value={minCuerpos}
              onChange={(e) => setMinCuerpos(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '4px 6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '10px',
                outline: 'none'
              }}
            >
              <option value={0}>Todos</option>
              <option value={1}>≥ 1 cuerpo/resto</option>
              <option value={5}>≥ 5 cuerpos</option>
              <option value={15}>≥ 15 cuerpos (Masivos)</option>
            </select>
          </div>
        </div>

        {/* Toggle sincronizar con Timeline */}
        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterByTimeline}
              onChange={(e) => setFilterByTimeline(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
            />
            Sincronizar con Timeline
          </label>
          {filterByTimeline && selectedDate && (
            <span style={{ fontSize: '9px', color: '#38bdf8', fontWeight: 600 }}>
              Ventana: {daysRange || 30} días
            </span>
          )}
        </div>
      </div>

      {/* Lista de Hallazgos */}
      <div style={{
        maxHeight: '340px',
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
            fontSize: '12px'
          }}>
            <Layers size={24} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Sin hallazgos en este viewport</p>
            <small style={{ color: '#475569', display: 'block', marginTop: '2px' }}>
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
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderLeft: '4px solid #f59e0b',
                  borderRadius: '4px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                {/* Cabecera */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    color: '#f59e0b', 
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
                    color: '#94a3b8', 
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
                    color: '#f8fafc',
                    lineHeight: '1.3',
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
                    color: '#cbd5e1',
                    lineHeight: '1.3',
                    backgroundColor: '#1e293b',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    border: '1px solid #334155'
                  }}>
                    {p.resumen}
                  </p>
                )}

                {/* Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {totalCuerpos ? (
                    <span style={{
                      backgroundColor: '#7f1d1d',
                      color: '#fecaca',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '3px'
                    }}>
                      {totalCuerpos} cuerpo{totalCuerpos > 1 ? 's' : ''}
                    </span>
                  ) : null}
                  {totalRestos ? (
                    <span style={{
                      backgroundColor: '#78350f',
                      color: '#fde68a',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '3px'
                    }}>
                      {totalRestos} restos/bolsas
                    </span>
                  ) : null}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleSelectHallazgo(item)}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '3px',
                      padding: '4px 6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Centrar
                  </button>
                  <button
                    onClick={() => handleOpenLinkModal(item)}
                    style={{
                      backgroundColor: '#4338ca',
                      color: '#e0e7ff',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '4px 6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Vincular con caso"
                  >
                    <LinkIcon size={11} />
                    Vincular
                  </button>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#60a5fa',
                        border: '1px solid #334155',
                        borderRadius: '3px',
                        padding: '4px 6px',
                        fontSize: '10px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Abrir nota original"
                    >
                      <ExternalLink size={11} />
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
