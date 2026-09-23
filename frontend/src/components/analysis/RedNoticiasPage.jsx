import React, { useState, useEffect, useMemo } from 'react';
import { SigmaContainer, useLoadGraph, useRegisterEvents } from '@react-sigma/core';
import "../../styles/sigma.css";
import Graph from 'graphology';
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
  Hash
} from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = {
  PERSONA: '#e63946',
  NOTICIA: '#f59e0b',
  FOSA: '#10b981',
  HASH_DOMICILIO: '#38bdf8',
  HASH_NOMBRE: '#a855f7',
  SUGERENCIA: '#64748b',
  DEFAULT: '#94a3b8'
};

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
    if (graph) {
      loadGraph(graph);
    }
  }, [graph, loadGraph]);
  return null;
}

const RedNoticiasPage = () => {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [limitEdges, setLimitEdges] = useState(300);
  const [includeEmpty, setIncludeEmpty] = useState(false);

  const fetchGraph = () => {
    setLoading(true);
    const API_BASE = `${window.location.protocol}//${window.location.hostname}:8008`;
    fetch(`${API_BASE}/api/v1/ontology/graph?limit_edges=${limitEdges}&include_empty=${includeEmpty}`)
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching ontology graph:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGraph();
  }, [limitEdges, includeEmpty]);

  const graph = useMemo(() => {
    if (!graphData || !graphData.nodes) return null;

    const g = new Graph();

    graphData.nodes.forEach(node => {
      if (filterType !== 'ALL' && node.type !== filterType && node.type !== 'NOTICIA') {
        return;
      }
      if (!g.hasNode(node.id)) {
        g.addNode(node.id, {
          label: node.label || node.id,
          size: node.type === 'NOTICIA' ? 14 : (node.type === 'PERSONA' ? 12 : 10),
          color: COLORS[node.type] || COLORS.DEFAULT,
          x: Math.random() * 200,
          y: Math.random() * 200,
          type: 'circle',
          nodeType: node.type,
          attributes: {
            id: node.id,
            type: node.type,
            label: node.label,
            ...(node.metadata || {})
          }
        });
      }
    });

    graphData.edges.forEach(edge => {
      if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
        if (!g.hasEdge(edge.source, edge.target)) {
          g.addEdge(edge.source, edge.target, {
            label: edge.label || edge.relation_type || '',
            size: edge.estado === 'SUGERIDO' ? 1.0 : 2.0,
            color: edge.estado === 'SUGERIDO' ? '#c084fc' : '#475569',
            attributes: {
              relation: edge.label,
              confidence: edge.confidence,
              estado: edge.estado
            }
          });
        }
      }
    });

    try {
      forceAtlas2.assign(g, {
        iterations: 60,
        settings: {
          gravity: 1.5,
          scalingRatio: 3,
          strongGravityMode: true,
          slowDown: 1.8
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
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#090d16',
      color: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Topbar */}
      <header style={{
        height: '60px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: '#94a3b8', 
              textDecoration: 'none', 
              fontSize: '13px',
              padding: '6px 10px',
              backgroundColor: '#1e293b',
              borderRadius: '6px'
            }}
          >
            <ArrowLeft size={16} /> Volver al Inicio
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Network size={22} color="#38bdf8" />
            <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
              Red de Inteligencia: Casos, Noticias y Fosas
            </h1>
          </div>
        </div>

        {/* Controles de filtro y recarga */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={includeEmpty} 
              onChange={(e) => setIncludeEmpty(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Mostrar "OSINT Empty" (No-Hits)</span>
          </label>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Todas las Entidades</option>
            <option value="PERSONA">Solo Cédulas / Casos</option>
            <option value="NOTICIA">Solo Noticias</option>
            <option value="FOSA">Solo Fosas</option>
            <option value="HASH_DOMICILIO">Solo Domicilios PII</option>
          </select>

          <select 
            value={limitEdges} 
            onChange={(e) => setLimitEdges(Number(e.target.value))}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value={150}>150 Vínculos</option>
            <option value={300}>300 Vínculos</option>
            <option value={600}>600 Vínculos</option>
            <option value={1000}>1000 Vínculos</option>
          </select>

          <button
            onClick={fetchGraph}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
        {/* Grafo Canvas */}
        <div style={{ flex: 1, position: 'relative', height: '100%', width: '100%', background: '#030712' }}>
          {loading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              padding: '16px 24px',
              borderRadius: '10px',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <RefreshCw size={20} className="animate-spin" color="#38bdf8" />
              <span>Cargando red de conocimiento desde PostgreSQL...</span>
            </div>
          )}

          {graph && (
            <SigmaContainer
              style={{ width: '100%', height: '100%' }}
              settings={{
                renderLabels: true,
                labelSize: 12,
                labelWeight: "600",
                labelColor: { color: "#e2e8f0" },
                defaultEdgeColor: "#334155",
                minCameraRatio: 0.05,
                maxCameraRatio: 15,
                allowInvalidContainer: true,
              }}
            >
              <LoadGraph graph={graph} />
              <GraphEvents onNodeClick={handleNodeClick} />
            </SigmaContainer>
          )}

          {/* Leyenda en esquina */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '12px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontWeight: 700, color: '#94a3b8', marginBottom: '2px' }}>CONVENCIONES DEL GRAFO</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.PERSONA }} />
              <span>🔴 Cédula / Caso (Desaparición)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.NOTICIA }} />
              <span>🟠 Noticia Periodística Minada</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.FOSA }} />
              <span>🟢 Fosa Clandestina</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS.HASH_DOMICILIO }} />
              <span>🔵 Domicilio Anonimizado (PII)</span>
            </div>
          </div>
        </div>

        {/* Panel Lateral de Detalle Contextual */}
        {selectedNode && (
          <aside style={{
            width: '420px',
            backgroundColor: '#0b1120',
            borderLeft: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 15,
            overflowY: 'auto',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: COLORS[selectedNode.nodeType] || COLORS.DEFAULT,
                  color: '#fff'
                }}>
                  {selectedNode.nodeType === 'PERSONA' && '👤 CÉDULA DE BÚSQUEDA / CASO'}
                  {selectedNode.nodeType === 'NOTICIA' && '📰 NOTICIA PERIODÍSTICA (OSINT)'}
                  {selectedNode.nodeType === 'FOSA' && '🪦 FOSA CLANDESTINA REGISTRADA'}
                  {selectedNode.nodeType === 'HASH_DOMICILIO' && '📍 DOMICILIO NORMALIZADO'}
                  {selectedNode.nodeType === 'SUGERENCIA' && '⚙️ NODO DEL SISTEMA'}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '12px 0 0 0', color: '#f8fafc', lineHeight: 1.3 }}>
                  {selectedNode.label || selectedNode.id}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '24px',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              
              {/* ID & Metadatos Técnicos */}
              <div style={{ backgroundColor: '#131d31', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Identificador Ontológico</span>
                <p style={{ margin: '4px 0 0 0', fontFamily: 'monospace', fontSize: '12px', color: '#38bdf8', wordBreak: 'break-all' }}>
                  {selectedNode.id}
                </p>
                {selectedNode.attributes?.expediente && (
                  <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '12px' }}>
                    <strong>Expediente:</strong> {selectedNode.attributes.expediente}
                  </p>
                )}
              </div>

              {/* CONTEXTO PARA NOTICIAS */}
              {selectedNode.nodeType === 'NOTICIA' && (
                <>
                  {selectedNode.attributes?.date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                      <Calendar size={16} color="#f59e0b" />
                      <span><strong>Fecha de Publicación:</strong> {selectedNode.attributes.date}</span>
                    </div>
                  )}
                  {selectedNode.attributes?.url && (
                    <div>
                      <a 
                        href={selectedNode.attributes.url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                          fontWeight: 600,
                          backgroundColor: '#0369a1',
                          color: '#fff',
                          padding: '8px 14px',
                          borderRadius: '6px'
                        }}
                      >
                        <ExternalLink size={15} /> Abrir Noticia Completa ↗
                      </a>
                    </div>
                  )}
                  {selectedNode.attributes?.query && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                      <strong>Búsqueda ejecutada:</strong> <em>{selectedNode.attributes.query}</em>
                    </div>
                  )}
                </>
              )}

              {/* CONTEXTO PARA CÉDULAS / PERSONAS */}
              {selectedNode.nodeType === 'PERSONA' && (
                <>
                  {selectedNode.attributes?.date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                      <Calendar size={16} color="#e63946" />
                      <span><strong>Fecha de Desaparición:</strong> {selectedNode.attributes.date}</span>
                    </div>
                  )}
                  {selectedNode.attributes?.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                      <MapPin size={16} color="#e63946" />
                      <span><strong>Lugar del Hecho:</strong> {selectedNode.attributes.location}</span>
                    </div>
                  )}
                  {selectedNode.attributes?.nombre_anonimizado && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                      <Shield size={16} color="#38bdf8" />
                      <span><strong>Persona:</strong> {selectedNode.attributes.nombre_anonimizado}</span>
                    </div>
                  )}
                </>
              )}

              {/* CONTEXTO PARA FOSAS */}
              {selectedNode.nodeType === 'FOSA' && (
                <>
                  {selectedNode.attributes?.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                      <MapPin size={16} color="#10b981" />
                      <span><strong>Municipio:</strong> {selectedNode.attributes.location}</span>
                    </div>
                  )}
                  {selectedNode.attributes?.date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                      <Calendar size={16} color="#10b981" />
                      <span><strong>Fecha de Hallazgo:</strong> {selectedNode.attributes.date}</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ backgroundColor: '#131d31', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>TOTAL CUERPOS</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                        {selectedNode.attributes?.total_cuerpos ?? 'N/D'}
                      </p>
                    </div>
                    <div style={{ backgroundColor: '#131d31', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>RESTOS / FRAGMENTOS</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#38bdf8' }}>
                        {selectedNode.attributes?.total_restos ?? 'N/D'}
                      </p>
                    </div>
                  </div>
                  {selectedNode.attributes?.coordenadas && (
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                      <strong>Coordenadas:</strong> <code>{selectedNode.attributes.coordenadas}</code>
                    </p>
                  )}
                </>
              )}

              {/* CONTEXTO PARA OSINT EMPTY */}
              {selectedNode.id === 'OSINT_EMPTY' && (
                <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#f8fafc' }}>
                    <HelpCircle size={18} color="#94a3b8" />
                    <strong>¿Qué es OSINT_EMPTY?</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                    Representa el conjunto de casos que el minador automático ya consultó en buscadores y prensa pero para los cuales <strong>no existen notas periodísticas públicas o concurrentes</strong> con su colonia o temporalidad. Este nodo central permite tener certeza de qué expedientes ya fueron auditados sin resultados.
                  </p>
                </div>
              )}

              {/* DESCRIPCIÓN O SÍNTESIS CONTEXTUAL */}
              {selectedNode.attributes?.description && (
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                    {selectedNode.nodeType === 'NOTICIA' ? 'Extracto de la Noticia' : 'Hechos / Descripción del Expediente'}
                  </span>
                  <div style={{
                    color: '#cbd5e1',
                    lineHeight: '1.6',
                    fontSize: '13px',
                    backgroundColor: '#131d31',
                    padding: '14px',
                    borderRadius: '8px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    border: '1px solid #1e293b'
                  }}>
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
