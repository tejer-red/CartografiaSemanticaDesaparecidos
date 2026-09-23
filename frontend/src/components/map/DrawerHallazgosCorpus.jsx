import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Layers, 
  Skull, 
  Link as LinkIcon
} from 'lucide-react';
import { useZIndex } from '../../utils/useZIndex';

const DrawerHallazgosCorpus = ({ headerHeight = 58 }) => {
  const { map, remoteNoticias, setGlobalLinkModal } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [searchMunicipio, setSearchMunicipio] = useState('');
  const [selectedColectivo, setSelectedColectivo] = useState('ALL');
  const [minCuerpos, setMinCuerpos] = useState(0);
  const [viewportFeatures, setViewportFeatures] = useState([]);
  const { zIndex, handleClick } = useZIndex('drawer-hallazgos');

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

  // Filtros combinados: texto, municipio, colectivo y cantidad de cuerpos
  const filteredHallazgos = useMemo(() => {
    return viewportFeatures.filter(item => {
      const p = item.properties || {};
      const titular = p.titular || '';
      const resumen = p.resumen || '';
      const municipio = p.municipio || p.municipio_extraido || '';
      const cuerpos = parseInt(p.total_cuerpos || p.total_cuerpos_estimado || 0, 10);

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
  }, [viewportFeatures, searchMunicipio, selectedColectivo, minCuerpos]);

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
    <div 
      id="drawer-hallazgos"
      onClick={handleClick}
      style={{
        position: 'fixed',
        right: isOpen ? '0px' : '-440px',
        top: `${headerHeight + 10}px`,
        width: '440px',
        height: `calc(100vh - ${headerHeight + 20}px)`,
        backgroundColor: '#0f172a',
        borderLeft: '2px solid #1e293b',
        borderTop: '2px solid #1e293b',
        borderBottom: '2px solid #1e293b',
        borderRadius: '12px 0 0 12px',
        zIndex: zIndex || 90,
        boxShadow: '-6px 0 24px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'right 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'inherit',
        color: '#f8fafc'
      }}
    >
      {/* Botón Pestaña Saliente para Abrir / Cerrar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'absolute',
          left: '-44px',
          top: '120px',
          backgroundColor: '#0f172a',
          color: '#f59e0b',
          border: '2px solid #1e293b',
          borderRight: 'none',
          borderRadius: '8px 0 0 8px',
          padding: '10px 8px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '-4px 2px 10px rgba(0,0,0,0.4)',
          fontWeight: 700,
          fontSize: '11px'
        }}
        title={isOpen ? 'Cerrar panel de hallazgos' : 'Abrir explorador de hallazgos y fosas del corpus'}
      >
        <Layers size={18} color="#f59e0b" />
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        <span style={{ 
          writingMode: 'vertical-rl', 
          transform: 'rotate(180deg)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginTop: '4px'
        }}>
          Hallazgos Corpus
        </span>
      </button>

      {/* Header del Drawer */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #1e293b',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '28px', 
            height: '28px', 
            borderRadius: '6px', 
            backgroundColor: '#78350f',
            color: '#f59e0b'
          }}>
            <Skull size={16} />
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              Hallazgos y Fosas (Corpus)
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {filteredHallazgos.length} de {allCorpusFeatures.length} notas en viewport
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: '#1e293b',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px'
          }}
        >
          Ocultar
        </button>
      </div>

      {/* Controles de Filtrado */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1e293b',
        backgroundColor: '#1e293b'
      }}>
        {/* Buscador de Municipio */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por municipio o palabras clave..."
            value={searchMunicipio}
            onChange={(e) => setSearchMunicipio(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Selector de Colectivo y Cuerpos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>
              Colectivo buscador:
            </label>
            <select
              value={selectedColectivo}
              onChange={(e) => setSelectedColectivo(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '11px',
                outline: 'none'
              }}
            >
              {colectivosList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>
              Mín. Cuerpos/Restos:
            </label>
            <select
              value={minCuerpos}
              onChange={(e) => setMinCuerpos(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '5px 8px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '11px',
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
      </div>

      {/* Lista de Hallazgos */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {filteredHallazgos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 10px',
            color: '#64748b',
            fontSize: '13px'
          }}>
            <Layers size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No hay hallazgos en esta área</p>
            <small style={{ color: '#475569', display: 'block', marginTop: '4px' }}>
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
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderLeft: '4px solid #f59e0b',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'border-color 0.15s, transform 0.15s'
                }}
              >
                {/* Cabecera de la tarjeta: Municipio y Fecha */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    color: '#f59e0b', 
                    fontSize: '11px', 
                    fontWeight: 700 
                  }}>
                    <MapPin size={13} />
                    {p.municipio || p.municipio_extraido || 'Jalisco'}
                    {p.colonia ? ` (Col. ${p.colonia})` : ''}
                  </span>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    color: '#94a3b8', 
                    fontSize: '11px' 
                  }}>
                    <Calendar size={12} />
                    {p.fecha || 'Sin fecha'}
                  </span>
                </div>

                {/* Titular de la nota */}
                <h4 
                  onClick={() => handleSelectHallazgo(item)}
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#f8fafc',
                    lineHeight: '1.3',
                    cursor: 'pointer'
                  }}
                  title="Clic para centrar en el mapa"
                >
                  {p.titular}
                </h4>

                {/* Resumen Forense / Criminalístico */}
                {p.resumen && (
                  <p style={{
                    margin: 0,
                    fontSize: '11px',
                    color: '#cbd5e1',
                    lineHeight: '1.4',
                    backgroundColor: '#0f172a',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid #1e293b'
                  }}>
                    {p.resumen}
                  </p>
                )}

                {/* Métricas: Cuerpos y Restos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {totalCuerpos ? (
                    <span style={{
                      backgroundColor: '#7f1d1d',
                      color: '#fecaca',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {totalCuerpos} cuerpo{totalCuerpos > 1 ? 's' : ''}
                    </span>
                  ) : null}
                  {totalRestos ? (
                    <span style={{
                      backgroundColor: '#78350f',
                      color: '#fde68a',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {totalRestos} restos/bolsas
                    </span>
                  ) : null}
                </div>

                {/* Botones de Acción */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    onClick={() => handleSelectHallazgo(item)}
                    style={{
                      flex: 1,
                      backgroundColor: '#334155',
                      color: '#f8fafc',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Centrar Mapa
                  </button>
                  <button
                    onClick={() => handleOpenLinkModal(item)}
                    style={{
                      backgroundColor: '#4338ca',
                      color: '#e0e7ff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Vincular con cédula de persona desaparecida"
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
                        backgroundColor: '#1e293b',
                        color: '#60a5fa',
                        border: '1px solid #3b82f6',
                        borderRadius: '4px',
                        padding: '5px 8px',
                        fontSize: '11px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Abrir nota original"
                    >
                      <ExternalLink size={13} />
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

export default DrawerHallazgosCorpus;
