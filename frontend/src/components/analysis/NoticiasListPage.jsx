import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Newspaper, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Search, 
  Network, 
  AlertTriangle, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { supabase } from '../../utils/supabase';
import '../../styles/NoticiasListPage.css';
import '../../styles/GraphPage.css';

/**
 * Resaltador Semántico de Entidades NER adaptado a fondo claro.
 */
function HighlightedArticleText({ text, entities = [] }) {
  if (!text) return null;

  const rawTerms = entities
    .map(e => (typeof e === 'string' ? e : e?.texto))
    .filter(t => t && t.trim().length >= 3);

  const uniqueTerms = Array.from(new Set(rawTerms.map(t => t.trim())));
  if (uniqueTerms.length === 0) {
    return <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{text}</p>;
  }

  uniqueTerms.sort((a, b) => b.length - a.length);
  const escaped = uniqueTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  const getBadgeClass = (matchedWord) => {
    const w = matchedWord.toLowerCase();
    if (w.includes('fosa') || w.includes('cuerpo') || w.includes('resto') || w.includes('embolsad') || w.includes('calcinad')) {
      return 'ner-highlight-forense';
    }
    if (w.includes('madres') || w.includes('buscad') || w.includes('colectivo') || w.includes('brigada') || w.includes('comisi')) {
      return 'ner-highlight-colectivo';
    }
    return 'ner-highlight-ubicacion';
  };

  return (
    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.75' }}>
      {parts.map((part, i) => {
        const isMatch = uniqueTerms.some(t => t.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <mark key={i} className={getBadgeClass(part)}>
              {part}
            </mark>
          );
        }
        return part;
      })}
    </p>
  );
}

const NoticiasListPage = () => {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [highlightEntities, setHighlightEntities] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});

  const fetchNoticias = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageSize = 10;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // 1. Intentar consulta primariamente al Backend API
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          page_size: '10'
        });
        if (search.trim()) params.append('search', search.trim());
        if (municipio.trim()) params.append('municipio', municipio.trim());

        const res = await fetch(`${API_BASE_URL}/ontology/noticias-list?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data && data.items && data.items.length > 0) {
          setNoticias(data.items);
          setTotalPages(data.pages || 1);
          setTotalCount(data.total || 0);
          return;
        }
        console.warn('Backend API returned 0 noticias, falling back to Supabase...');
      } catch (apiError) {
        console.warn('Backend API noticias-list fetch failed, falling back to Supabase:', apiError);
      }

      // 2. Fallback a Supabase directo
      let query = supabase
        .from('noticias_corpus')
        .select('*', { count: 'exact' });

      if (municipio.trim()) {
        query = query.ilike('municipio_extraido', `%${municipio.trim()}%`);
      }
      if (search.trim()) {
        query = query.or(`titular.ilike.%${search.trim()}%,resumen_hallazgo.ilike.%${search.trim()}%,cuerpo_texto.ilike.%${search.trim()}%`);
      }

      query = query.order('fecha', { ascending: false, nullsFirst: false }).range(from, to);

      const { data, count, error: supaErr } = await query;
      if (supaErr) throw supaErr;

      const items = (data || []).map(n => ({
        id: n.id,
        titular: n.titular,
        url: n.url,
        fecha: n.fecha,
        municipio: n.municipio_extraido,
        colonia: n.colonia_extraida,
        resumen: n.resumen_hallazgo,
        cuerpo_texto: n.cuerpo_texto || n.resumen_hallazgo || '',
        cuerpo_completo: n.cuerpo_texto || n.resumen_hallazgo || '',
        total_cuerpos_estimado: n.total_cuerpos_estimado,
        total_restos_estimado: n.total_restos_estimado,
        precision: n.geocode_precision,
        entidades_ner: n.keywords_matched || []
      }));

      setNoticias(items);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize) || 1);
    } catch (err) {
      console.error('Error fetching noticias list:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNoticias();
  }, [page, municipio]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchNoticias();
  };

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="noticias-list-container">
      {/* Sección Superior: Título y Navegación hacia el Grafo */}
      <div className="noticias-header-section">
        <div className="noticias-header-top">
          <div className="noticias-title-wrapper">
            <h1>Noticias de Cobertura Forense y Prensa OSINT</h1>
            <p>
              Exploración documental de reportes hemerográficos de fosas y hallazgos en Jalisco ({totalCount} registros)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button 
              onClick={() => setHighlightEntities(!highlightEntities)}
              className={`graph-btn-action ${highlightEntities ? 'active' : ''}`}
              title="Alternar resaltado semántico de entidades NER"
            >
              <Sparkles size={16} />
              <span>{highlightEntities ? 'NER: Activo' : 'Texto Plano'}</span>
            </button>
            <Link to="/noticias/grafo" className="graph-btn-action graph-btn-primary" style={{ textDecoration: 'none' }}>
              <Network size={16} />
              <span>Ver en Grafo de Red</span>
            </Link>
          </div>
        </div>

        {/* Barra de Filtros */}
        <form onSubmit={handleSearchSubmit} className="noticias-filters-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Search size={16} color="#64748b" />
            <input 
              type="text" 
              placeholder="Buscar por palabras clave en titular o cuerpo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="noticias-search-input"
            />
          </div>
          <select 
            value={municipio} 
            onChange={(e) => { setMunicipio(e.target.value); setPage(1); }}
            className="graph-select-filter"
          >
            <option value="">Todos los Municipios</option>
            <option value="GUADALAJARA">Guadalajara</option>
            <option value="ZAPOPAN">Zapopan</option>
            <option value="TLAJOMULCO">Tlajomulco de Zúñiga</option>
            <option value="TLAQUEPAQUE">San Pedro Tlaquepaque</option>
            <option value="TONALA">Tonalá</option>
            <option value="EL SALTO">El Salto</option>
            <option value="IXTLAHUACAN">Ixtlahuacán de los Membrillos</option>
          </select>
          <button type="submit" className="graph-btn-action" style={{ background: '#f8fafc' }}>
            Filtrar
          </button>
        </form>
      </div>

      {/* Lista de Noticias */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Cargando catálogo periodístico...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#b91c1c' }}>
          Error al cargar noticias: {error}
        </div>
      ) : noticias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          No se encontraron noticias con los criterios especificados.
        </div>
      ) : (
        <div className="noticias-grid">
          {noticias.map((item) => {
            const isExpanded = !!expandedCards[item.id];
            const hasLongText = item.cuerpo_texto && item.cuerpo_texto.length > 500;
            const textToDisplay = (!isExpanded && hasLongText)
              ? item.cuerpo_texto.substring(0, 500) + '...'
              : item.cuerpo_texto;

            return (
              <article key={item.id} className="noticia-card">
                <div className="noticia-card-header">
                  <h2 className="noticia-card-title">{item.titular}</h2>
                  {item.url && (
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="graph-btn-action"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', flexShrink: 0 }}
                      title="Abrir nota original"
                    >
                      <ExternalLink size={14} />
                      <span>Fuente</span>
                    </a>
                  )}
                </div>

                <div className="noticia-card-meta">
                  {item.fecha && (
                    <span className="noticia-meta-badge">
                      <Calendar size={13} />
                      <span>{item.fecha}</span>
                    </span>
                  )}
                  {item.municipio && (
                    <span className="noticia-meta-badge">
                      <MapPin size={13} />
                      <span>{item.municipio}{item.colonia ? ` / ${item.colonia}` : ''}</span>
                    </span>
                  )}
                  {(item.total_cuerpos_estimado > 0 || item.total_restos_estimado > 0) && (
                    <span className="noticia-meta-badge alert">
                      <AlertTriangle size={13} />
                      <span>
                        {item.total_cuerpos_estimado || 0} cuerpos / {item.total_restos_estimado || 0} restos
                      </span>
                    </span>
                  )}
                </div>

                <div className="noticia-body-text">
                  {highlightEntities ? (
                    <HighlightedArticleText 
                      text={textToDisplay} 
                      entities={item.entidades_ner || []} 
                    />
                  ) : (
                    <p style={{ margin: 0 }}>{textToDisplay}</p>
                  )}
                </div>

                <div className="noticia-card-footer">
                  <div className="noticia-entities-legend">
                    <span style={{ color: '#64748b' }}>Entidades detectadas:</span>
                    <span className="ner-highlight-ubicacion" style={{ fontSize: '0.7rem' }}>Ubicación</span>
                    <span className="ner-highlight-forense" style={{ fontSize: '0.7rem' }}>Forense</span>
                    <span className="ner-highlight-colectivo" style={{ fontSize: '0.7rem' }}>Colectivos</span>
                  </div>

                  {hasLongText && (
                    <button 
                      onClick={() => toggleExpand(item.id)}
                      style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      {isExpanded ? 'Contraer texto' : 'Leer completo →'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="noticia-pagination-bar">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="graph-btn-action"
          >
            <ChevronLeft size={16} />
            <span>Anterior</span>
          </button>
          <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
            Página {page} de {totalPages}
          </span>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="graph-btn-action"
          >
            <span>Siguiente</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default NoticiasListPage;
