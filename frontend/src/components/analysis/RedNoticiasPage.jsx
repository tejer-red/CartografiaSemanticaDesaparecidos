import React, { useState, useEffect, useMemo } from 'react';
import { SigmaContainer, useLoadGraph, useRegisterEvents } from '@react-sigma/core';
import "../../styles/sigma.css";
import "../../styles/GraphPage.css";
import Graph, { MultiDirectedGraph } from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { 
  Network, 
  RefreshCw, 
  ExternalLink, 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  FileText, 
  Shield, 
  Layers, 
  HelpCircle, 
  Hash,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Sparkles,
  X,
  List
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import { supabase } from '../../utils/supabase';

const COLORS = {
  PERSONA: '#e63946',
  NOTICIA: '#f59e0b',
  FOSA: '#10b981',
  HASH_DOMICILIO: '#38bdf8',
  HASH_NOMBRE: '#a855f7',
  SUGERENCIA: '#64748b',
  DEFAULT: '#94a3b8'
};

/**
 * Resaltador Semántico de Entidades NER para el Cuerpo Periodístico.
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

  const getEntityBadgeStyle = (matchedWord) => {
    const w = matchedWord.toLowerCase();
    if (w.includes('fosa') || w.includes('cuerpo') || w.includes('resto') || w.includes('embolsad') || w.includes('calcinad')) {
      return { backgroundColor: 'rgba(220, 38, 38, 0.12)', color: '#991b1b', borderBottom: '2px solid #dc2626', borderRadius: '2px', padding: '1px 3px' };
    }
    if (w.includes('madres') || w.includes('buscad') || w.includes('colectivo') || w.includes('brigada') || w.includes('comisi')) {
      return { backgroundColor: 'rgba(147, 51, 234, 0.12)', color: '#6b21a8', borderBottom: '2px solid #9333ea', borderRadius: '2px', padding: '1px 3px' };
    }
    return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#92400e', borderBottom: '2px solid #f59e0b', borderRadius: '2px', padding: '1px 3px' };
  };

  return (
    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.75' }}>
      {parts.map((part, i) => {
        const isMatch = uniqueTerms.some(t => t.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          const style = getEntityBadgeStyle(part);
          return (
            <mark key={i} style={style}>
              {part}
            </mark>
          );
        }
        return part;
      })}
    </p>
  );
}

function GraphEvents({ onNodeClick }) {
  const registerEvents = useRegisterEvents();
  useEffect(() => {
    registerEvents({
      clickNode: (e) => onNodeClick(e.node)
    });
  }, [registerEvents, onNodeClick]);
  return null;
}

function LoadGraph({ graph }) {
  const loadGraph = useLoadGraph();
  useEffect(() => {
    try {
      if (graph) {
        loadGraph(graph);
      }
    } catch (e) {
      console.warn('Error importing graph into Sigma container:', e);
    }
  }, [graph, loadGraph]);
  return null;
}

const RedNoticiasPage = () => {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [limitEdges, setLimitEdges] = useState(300);
  const [filterType, setFilterType] = useState('ALL');
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [anonymized, setAnonymized] = useState(true);
  const [highlightEntities, setHighlightEntities] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      // 1. Intentar consulta primariamente al Backend API
      try {
        const url = `${API_BASE_URL}/ontology/graph?limit_edges=${limitEdges}&include_empty=${includeEmpty}&anonymized=${anonymized}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.nodes) {
            setGraphData(data);
            setLoading(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn('Backend API graph fetch failed, falling back to Supabase:', apiErr);
      }

      // 2. Fallback: construir grafo semántico directamente desde Supabase
      const { data: vinculos, error: vErr } = await supabase
        .from('vinculos_entidades')
        .select('*')
        .limit(limitEdges);

      if (vErr) throw vErr;

      if (vinculos && vinculos.length > 0) {
        const nodesMap = new Map();
        const edges = [];

        vinculos.forEach((v, idx) => {
          const sId = v.source_node;
          const tId = v.target_node;

          if (!nodesMap.has(sId)) {
            nodesMap.set(sId, {
              id: sId,
              label: sId.replace(/^CASO_/, 'Caso '),
              type: v.source_type || 'PERSONA',
              metadata: v.metadata_relacion || {}
            });
          }

          if (!nodesMap.has(tId)) {
            nodesMap.set(tId, {
              id: tId,
              label: tId.length > 30 ? tId.slice(0, 27) + '...' : tId,
              type: v.target_type || 'ENTIDAD',
              metadata: v.metadata_relacion || {}
            });
          }

          edges.push({
            id: `edge_${v.id || idx}`,
            source: sId,
            target: tId,
            label: v.relation_type,
            confidence: v.confidence_score
          });
        });

        setGraphData({
          nodes: Array.from(nodesMap.values()),
          edges: edges
        });
      }
    } catch (err) {
      console.error('Error fetching semantic graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [limitEdges, includeEmpty, anonymized]);

  const graph = useMemo(() => {
    if (!graphData || !graphData.nodes) return null;

    const g = new Graph({ type: 'directed', multi: true, allowSelfLoops: true });

    graphData.nodes.forEach(node => {
      if (filterType !== 'ALL' && node.type !== filterType) return;

      const size = node.size || (node.type === 'PERSONA' ? 14 : (node.type === 'NOTICIA' ? 18 : 10));
      const color = node.color || COLORS[node.type] || COLORS.DEFAULT;

      if (!g.hasNode(node.id)) {
        g.addNode(node.id, {
          label: node.label,
          size: size,
          color: color,
          x: node.x !== undefined ? node.x : (Math.random() - 0.5) * 500,
          y: node.y !== undefined ? node.y : (Math.random() - 0.5) * 500,
          nodeType: node.type,
          attributes: node.metadata || {}
        });
      }
    });

    graphData.edges.forEach((edge, idx) => {
      if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
        const edgeKey = edge.id || `edge_${edge.source}_${edge.target}_${idx}`;
        try {
          if (!g.hasEdge(edgeKey)) {
            g.addDirectedEdgeWithKey(edgeKey, edge.source, edge.target, {
              label: edge.label,
              size: edge.confidence ? edge.confidence * 2 : 1,
              color: '#cbd5e1',
              confidence: edge.confidence,
              estado: edge.estado
            });
          }
        } catch (e) {
          // ignore duplicate edge keys
        }
      }
    });

    try {
      forceAtlas2.assign(g, {
        iterations: 60,
        settings: {
          gravity: 1.2,
          scalingRatio: 8,
          slowDown: 3,
          barnesHutOptimize: true,
          linLogMode: true
        }
      });
    } catch (e) {
      console.warn('ForceAtlas2 layout error:', e);
    }

    return g;
  }, [graphData, filterType]);

  const handleNodeClick = (nodeId) => {
    if (!graph) return;
    const attrs = graph.getNodeAttributes(nodeId);
    setSelectedNode({ id: nodeId, ...attrs });
  };

  return (
    <div className="graph-page-container">
      {/* Barra de Herramientas Superior */}
      <header className="graph-toolbar">
        <div className="graph-toolbar-left">
          <Link to="/noticias" className="graph-btn-action" title="Ir al catálogo de noticias en lista">
            <List size={16} />
            <span>Ver Catálogo Lista</span>
          </Link>
          <div className="graph-toolbar-title">
            <Network size={20} color="#007bff" />
            <span>Red de Inteligencia: Casos, Noticias y Fosas</span>
          </div>
        </div>

        {/* Controles de filtro y recarga */}
        <div className="graph-toolbar-right">
          {/* Conmutador de Anonimización PII */}
          <button
            onClick={() => setAnonymized(!anonymized)}
            title={anonymized ? "Modo confidencial para ver PII real" : "Modo público con PII hasheada"}
            className={`graph-btn-action ${anonymized ? 'graph-btn-lock-active' : 'graph-btn-lock-inactive'}`}
          >
            {anonymized ? <Lock size={14} /> : <Unlock size={14} />}
            <span>{anonymized ? "PII: Hasheada" : "PII: Real"}</span>
          </button>

          {/* Conmutador de Resaltado de Entidades NER */}
          <button
            onClick={() => setHighlightEntities(!highlightEntities)}
            title="Activar o desactivar el subrayado semántico de entidades en notas periodísticas"
            className={`graph-btn-action ${highlightEntities ? 'active' : ''}`}
          >
            <Sparkles size={14} />
            <span>{highlightEntities ? "NER: Subrayado" : "Texto Plano"}</span>
          </button>

          {/* Selector de Filtro de Nodos */}
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="graph-select-filter"
          >
            <option value="ALL">Todas las Entidades</option>
            <option value="PERSONA">Solo Cédulas / Casos</option>
            <option value="NOTICIA">Solo Noticias (OSINT)</option>
            <option value="FOSA">Solo Fosas Clandestinas</option>
            <option value="HASH_DOMICILIO">Solo Domicilios Hasheados</option>
          </select>

          {/* Selector de Límite de Vínculos */}
          <select 
            value={limitEdges} 
            onChange={(e) => setLimitEdges(Number(e.target.value))}
            className="graph-select-filter"
          >
            <option value={100}>100 Vínculos</option>
            <option value={300}>300 Vínculos</option>
            <option value={600}>600 Vínculos</option>
            <option value={1000}>1000 Vínculos</option>
          </select>

          {/* Botón de Recarga */}
          <button 
            onClick={fetchGraph}
            disabled={loading}
            className="graph-btn-action graph-btn-primary"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </header>

      {/* Área del Canvas & Detalle */}
      <div className="graph-main-stage">
        <div className="graph-canvas-wrapper">
          {loading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '16px 24px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#334155'
            }}>
              <RefreshCw size={20} className="animate-spin" color="#007bff" />
              <span>Cargando red de conocimiento desde PostgreSQL...</span>
            </div>
          )}

          {graph && (
            <SigmaContainer
              graph={MultiDirectedGraph}
              style={{ width: '100%', height: '100%' }}
              settings={{
                renderLabels: true,
                labelRenderedSizeThreshold: 14,
                labelSize: 11,
                labelWeight: "600",
                labelColor: { color: "#334155" },
                defaultEdgeColor: "#cbd5e1",
                minCameraRatio: 0.05,
                maxCameraRatio: 15,
                allowInvalidContainer: true,
              }}
            >
              <LoadGraph graph={graph} />
              <GraphEvents onNodeClick={handleNodeClick} />
            </SigmaContainer>
          )}

          {/* Leyenda en esquina inferior izquierda */}
          <div className="graph-legend-box">
            <span className="graph-legend-title">Convenciones del Grafo</span>
            <div className="graph-legend-item">
              <span className="graph-legend-dot" style={{ backgroundColor: COLORS.PERSONA }} />
              <span>Cédula / Caso (Desaparición)</span>
            </div>
            <div className="graph-legend-item">
              <span className="graph-legend-dot" style={{ backgroundColor: COLORS.NOTICIA }} />
              <span>Noticia Periodística Minada</span>
            </div>
            <div className="graph-legend-item">
              <span className="graph-legend-dot" style={{ backgroundColor: COLORS.FOSA }} />
              <span>Fosa Clandestina</span>
            </div>
            <div className="graph-legend-item">
              <span className="graph-legend-dot" style={{ backgroundColor: COLORS.HASH_DOMICILIO }} />
              <span>Domicilio Anonimizado (PII)</span>
            </div>
          </div>
        </div>

        {/* Panel Lateral de Detalle Contextual */}
        {selectedNode && (
          <aside className="graph-sidebar">
            <div className="graph-sidebar-header">
              <div className="graph-sidebar-title">
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: COLORS[selectedNode.nodeType] || COLORS.DEFAULT,
                  color: '#ffffff'
                }}>
                  {selectedNode.nodeType === 'PERSONA' && '👤 CÉDULA DE BÚSQUEDA'}
                  {selectedNode.nodeType === 'NOTICIA' && '📰 NOTICIA PERIODÍSTICA'}
                  {selectedNode.nodeType === 'FOSA' && '🪦 FOSA CLANDESTINA'}
                  {selectedNode.nodeType === 'HASH_DOMICILIO' && '📍 DOMICILIO ANONIMIZADO'}
                  {!['PERSONA', 'NOTICIA', 'FOSA', 'HASH_DOMICILIO'].includes(selectedNode.nodeType) && 'ENTIDAD'}
                </span>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="graph-sidebar-close"
                title="Cerrar panel de detalle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="graph-sidebar-content">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', lineHeight: 1.3 }}>
                {selectedNode.label}
              </h2>

              {/* METADATOS COMUNES */}
              <div className="graph-sidebar-section">
                <span className="graph-sidebar-label">Identificador Ontológico</span>
                <span className="graph-sidebar-value" style={{ fontFamily: 'monospace', color: '#64748b' }}>
                  {selectedNode.id}
                </span>
              </div>

              {/* CASOS: BADGES DE PII */}
              {selectedNode.nodeType === 'PERSONA' && (
                <>
                  {selectedNode.attributes?.expediente && (
                    <div className="graph-sidebar-section">
                      <span className="graph-sidebar-label">Expediente Oficial</span>
                      <span className="graph-sidebar-value" style={{ fontWeight: 600 }}>
                        {selectedNode.attributes.expediente}
                      </span>
                    </div>
                  )}

                  {selectedNode.attributes?.domicilio_hasheado && (
                    <div className="graph-sidebar-section">
                      <span className="graph-sidebar-label">Domicilio Hash Asociado</span>
                      <span className="graph-sidebar-value" style={{ color: '#0284c7', fontFamily: 'monospace' }}>
                        📍 {selectedNode.attributes.domicilio_hasheado}
                      </span>
                    </div>
                  )}

                  {selectedNode.attributes?.fosa_id && (
                    <div className="graph-sidebar-section">
                      <span className="graph-sidebar-label">Fosa Clandestina Correlacionada</span>
                      <span className="graph-sidebar-value" style={{ color: '#059669', fontWeight: 700 }}>
                        🪦 Fosa ID #{selectedNode.attributes.fosa_id}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* NOTICIAS: ENLACE Y LECTURA COMPLETA */}
              {selectedNode.nodeType === 'NOTICIA' && (
                <>
                  {selectedNode.attributes?.date && (
                    <div className="graph-sidebar-section">
                      <span className="graph-sidebar-label">Fecha de Publicación</span>
                      <span className="graph-sidebar-value">
                        {selectedNode.attributes.date}
                      </span>
                    </div>
                  )}

                  {selectedNode.attributes?.url && (
                    <a 
                      href={selectedNode.attributes.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="graph-btn-action graph-btn-primary"
                      style={{ textDecoration: 'none', justifyContent: 'center' }}
                    >
                      <ExternalLink size={14} />
                      <span>Abrir Noticia Completa en Fuente Original</span>
                    </a>
                  )}

                  {selectedNode.attributes?.cuerpo_completo && (
                    <div className="graph-sidebar-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="graph-sidebar-label">Cuerpo de la Noticia</span>
                        {highlightEntities && (
                          <span style={{ fontSize: '0.72rem', color: '#007bff', fontWeight: 600 }}>
                            {selectedNode.attributes?.entidades_ner?.length || 0} entidades detectadas
                          </span>
                        )}
                      </div>
                      <div className="graph-sidebar-article-box">
                        {highlightEntities ? (
                          <HighlightedArticleText 
                            text={selectedNode.attributes.cuerpo_completo}
                            entities={selectedNode.attributes?.entidades_ner || []}
                          />
                        ) : (
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {selectedNode.attributes.cuerpo_completo}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* CÉDULA: DESCRIPCIÓN DE LOS HECHOS */}
              {selectedNode.nodeType === 'PERSONA' && selectedNode.attributes?.description && (
                <div className="graph-sidebar-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="graph-sidebar-label">Narrativa de la Cédula</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: selectedNode.attributes?.is_anonymized ? '#0284c7' : '#16a34a' }}>
                      {selectedNode.attributes?.is_anonymized ? '🔒 PII Hasheada' : '🔓 Desanonimizada'}
                    </span>
                  </div>
                  <div className="graph-sidebar-article-box">
                    {selectedNode.attributes.description}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default RedNoticiasPage;
