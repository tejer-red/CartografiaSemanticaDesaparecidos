import React, { useState, useEffect, useMemo } from 'react';
import { SigmaContainer, useLoadGraph, useRegisterEvents } from '@react-sigma/core';
import "../../styles/sigma.css";
import "../../styles/GraphPage.css";
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { 
  Network, 
  RefreshCw, 
  Car, 
  ShieldAlert, 
  Users, 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  FileText, 
  Newspaper,
  Layers,
  Crosshair,
  UserCheck,
  Play,
  Pause,
  RotateCcw,
  Clock,
  List
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CONTEXT_COLORS = {
  PERSONA: '#e63946',             // Rojo Cédula (Principal caso)
  MODUS: '#f4a261',               // Naranja cálido (Frontend palette)
  INSTITUCION: '#2a9d8f',         // Verde azulado institucional (Frontend FOSA/Entidad)
  EVIDENCIA_MATERIAL: '#e76f51',  // Terracota / Ámbar sobrio
  DESTINO: '#457b9d',             // Azul pizarra frontend
  MES_REPORTE: '#8884d8',         // Púrpura lavanda frontend TERM
  CONDICION: '#d62828',           // Carmesí alerta oficial
  SEXO: '#9d4edd',                // Violeta frontend SUGERENCIA
  VEHICULO_SOSPECHOSO: '#9d4edd', // Púrpura estructurado
  VEHICULO_VICTIMA: '#457b9d',    // Azul pizarra
  PARENTESCO: '#64748b',          // Gris pizarra sobrio
  FOSA: '#2a9d8f',                // Verde azulado frontend
  DEFAULT: '#475569'
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

const RedContextoPage = () => {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [limitEdges, setLimitEdges] = useState(300);
  const [timelineEnabled, setTimelineEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeWindowDays, setTimeWindowDays] = useState(180); // Ventana deslizante en días
  const [sliderIndex, setSliderIndex] = useState(100); // 0 a 100%

  const fetchGraph = () => {
    setLoading(true);
    const API_BASE = `${window.location.protocol}//${window.location.hostname}:8008`;
    fetch(`${API_BASE}/api/v1/ontology/context-graph?limit_edges=${limitEdges}`)
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching context graph:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGraph();
  }, [limitEdges]);

  // Extraer rango global de fechas válidas de las cédulas cargadas
  const dateBounds = useMemo(() => {
    if (!graphData || !graphData.nodes) return null;
    const timestamps = [];
    graphData.nodes.forEach(n => {
      const dStr = n.metadata?.date;
      if (dStr && dStr.length >= 10) {
        const t = new Date(dStr).getTime();
        if (!isNaN(t)) timestamps.push(t);
      }
    });
    if (timestamps.length === 0) return null;
    const minT = Math.min(...timestamps);
    const maxT = Math.max(...timestamps);
    return { min: minT, max: maxT, spanDays: Math.max(1, Math.round((maxT - minT) / (1000 * 3600 * 24))) };
  }, [graphData]);

  // Calcular la fecha actual del cursor del timeline
  const currentTimelineDate = useMemo(() => {
    if (!dateBounds) return null;
    const currentT = dateBounds.min + (dateBounds.max - dateBounds.min) * (sliderIndex / 100);
    const windowMs = timeWindowDays * 24 * 3600 * 1000;
    const startT = Math.max(dateBounds.min, currentT - windowMs);
    return {
      start: new Date(startT),
      current: new Date(currentT),
      startStr: new Date(startT).toISOString().slice(0, 10),
      currentStr: new Date(currentT).toISOString().slice(0, 10),
      startMs: startT,
      endMs: currentT
    };
  }, [dateBounds, sliderIndex, timeWindowDays]);

  // Reproductor automático del timeline (Animation loop)
  useEffect(() => {
    let interval = null;
    if (isPlaying && timelineEnabled) {
      interval = setInterval(() => {
        setSliderIndex(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return Math.min(100, prev + 1);
        });
      }, 350);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, timelineEnabled]);

  const graph = useMemo(() => {
    if (!graphData || !graphData.nodes) return null;

    const g = new Graph();

    // 1. Filtrar casos por ventana de tiempo si el timeline está activo
    const validCaseIds = new Set();
    graphData.nodes.forEach(node => {
      if (node.type === 'PERSONA') {
        if (!timelineEnabled || !currentTimelineDate) {
          validCaseIds.add(node.id);
        } else {
          const dStr = node.metadata?.date;
          if (dStr && dStr.length >= 10) {
            const t = new Date(dStr).getTime();
            if (!isNaN(t) && t >= currentTimelineDate.startMs && t <= currentTimelineDate.endMs) {
              validCaseIds.add(node.id);
            }
          } else {
            // Si no tiene fecha, mostrarlo solo si el timeline está al final
            if (sliderIndex >= 95) validCaseIds.add(node.id);
          }
        }
      }
    });

    // 2. Determinar qué nodos de atributos se mantienen conectados a los casos válidos
    const activeAttributeNodeIds = new Set();
    graphData.edges.forEach(edge => {
      if (validCaseIds.has(edge.source)) activeAttributeNodeIds.add(edge.target);
      if (validCaseIds.has(edge.target)) activeAttributeNodeIds.add(edge.source);
    });

    graphData.nodes.forEach(node => {
      // Filtro por tipo seleccionado
      if (filterType !== 'ALL' && node.type !== filterType && node.type !== 'PERSONA') {
        return;
      }

      // Si el timeline está activo, omitir si no es un caso visible ni está conectado a uno
      if (timelineEnabled) {
        if (node.type === 'PERSONA' && !validCaseIds.has(node.id)) return;
        if (node.type !== 'PERSONA' && !activeAttributeNodeIds.has(node.id)) return;
      }

      if (!g.hasNode(node.id)) {
        g.addNode(node.id, {
          label: node.label || node.id,
          size: node.size || 12,
          color: node.color || CONTEXT_COLORS[node.type] || CONTEXT_COLORS.DEFAULT,
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
            label: edge.label || '',
            size: edge.label === 'PERPETRADO_CON_VEHICULO' ? 2.5 : 1.2,
            color: edge.color || '#475569',
            attributes: {
              relation: edge.label,
              confidence: edge.confidence
            }
          });
        }
      }
    });

    // Escalar tamaño de los nodos según su In-Degree (grado de entrada / conexiones recibidas)
    // Los hubs con muchos casos conectados (ej. Institución, Modus, Mes) crecen orgánicamente
    g.forEachNode((nodeId) => {
      const inDeg = g.inDegree(nodeId);
      const totalDeg = g.degree(nodeId);
      const isCase = nodeId.startsWith('CASO_');
      
      // Tamaño base según tipo y escala logarítmica/proporcional al in-degree
      if (isCase) {
        // Cédulas individuales: tamaño compacto y limpio (8 a 12 px)
        g.setNodeAttribute(nodeId, 'size', Math.max(7, Math.min(13, 7 + totalDeg * 0.8)));
      } else {
        // Nodos clúster / atributos: escalan con el in-degree recibido
        const scaledSize = Math.max(12, Math.min(32, 10 + inDeg * 1.5 + Math.sqrt(totalDeg) * 2));
        g.setNodeAttribute(nodeId, 'size', scaledSize);
      }
    });

    try {
      const nodeCount = g.order;
      const iters = nodeCount > 4000 ? 15 : (nodeCount > 1500 ? 30 : 60);
      forceAtlas2.assign(g, {
        iterations: iters,
        settings: {
          gravity: 1.2,
          scalingRatio: nodeCount > 3000 ? 5.0 : 3.5,
          strongGravityMode: true,
          slowDown: 1.8
        }
      });
    } catch (e) {
      console.warn('ForceAtlas2 layout error:', e);
    }

    return g;
  }, [graphData, filterType, timelineEnabled, currentTimelineDate, sliderIndex]);

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
      <header className="graph-toolbar">
        <div className="graph-toolbar-left">
          <Link 
            to="/contexto" 
            className="graph-btn-action"
            title="Ir al catálogo ontológico en lista"
          >
            <List size={16} /> <span>Ver Catálogo Lista</span>
          </Link>

          <Link 
            to="/noticias/grafo" 
            className="graph-btn-action"
            style={{ color: '#d97706' }}
          >
            <Newspaper size={16} /> <span>Grafo Noticias OSINT</span>
          </Link>

          <div className="graph-toolbar-title">
            <Network size={20} color="#7c3aed" />
            <span>Hiper-Grafo de Contexto Forense & Patrones</span>
            <span className="graph-badge-counter" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
              RAG-Ontology
            </span>
          </div>
        </div>

        {/* Filtros y Opciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <option value="ALL">Todo el Contexto</option>
            <option value="MODUS">Solo Modus Operandi</option>
            <option value="CONDICION">Solo Condición de Localización</option>
            <option value="SEXO">Solo Segmentos por Sexo</option>
            <option value="INSTITUCION">Solo Albergues / Anexos</option>
            <option value="EVIDENCIA_MATERIAL">Solo Cartas / Notas Dejadas</option>
            <option value="DESTINO">Solo Destinos Declarados</option>
            <option value="VEHICULO_SOSPECHOSO">Solo Vehículos Agresores</option>
            <option value="VEHICULO_VICTIMA">Solo Vehículos de Víctimas</option>
            <option value="PARENTESCO">Solo Denunciantes / Testigos</option>
            <option value="PERSONA">Solo Cédulas</option>
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
            <option value={300}>300 Vínculos (Vista rápida)</option>
            <option value={600}>600 Vínculos</option>
            <option value={1000}>1,000 Vínculos</option>
            <option value={2500}>2,500 Vínculos</option>
            <option value={5000}>5,000 Vínculos</option>
            <option value={12000}>🌐 Todos los vínculos (~11,000)</option>
          </select>

          <button
            onClick={() => setTimelineEnabled(!timelineEnabled)}
            style={{
              backgroundColor: timelineEnabled ? '#0284c7' : '#1e293b',
              color: '#fff',
              border: timelineEnabled ? '1px solid #38bdf8' : '1px solid #334155',
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
            <Clock size={15} color={timelineEnabled ? '#fff' : '#38bdf8'} />
            {timelineEnabled ? 'Timeline Activo' : 'Activar Timeline'}
          </button>

          <button
            onClick={fetchGraph}
            style={{
              backgroundColor: '#7c3aed',
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
        <div style={{ flex: 1, position: 'relative', height: '100%', width: '100%', background: '#f8fafc' }}>
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
              <RefreshCw size={20} className="animate-spin" color="#a855f7" />
              <span>Cargando hiper-grafo de patrones forenses...</span>
            </div>
          )}

          {graph && (
            <SigmaContainer
              style={{ width: '100%', height: '100%' }}
              settings={{
                renderLabels: true,
                labelSize: 13,
                labelWeight: "700",
                labelColor: { color: "#000000" },
                defaultEdgeColor: "#94a3b8",
                minCameraRatio: 0.05,
                maxCameraRatio: 15,
                allowInvalidContainer: true,
              }}
            >
              <LoadGraph graph={graph} />
              <GraphEvents onNodeClick={handleNodeClick} />
            </SigmaContainer>
          )}

          {/* Floating Draggable Timeline Bar */}
          {timelineEnabled && currentTimelineDate && (
            <div style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30,
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              borderRadius: '8px',
              padding: '12px 20px',
              width: '660px',
              maxWidth: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {/* Header Timeline: Fechas y Ventana de Días */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="#457b9d" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    Ventana Temporal:
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#f8fafc',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600
                  }}>
                    {currentTimelineDate.startStr}  ⟶  {currentTimelineDate.currentStr}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
                  <span>Rango ventana:</span>
                  <select
                    value={timeWindowDays}
                    onChange={(e) => setTimeWindowDays(Number(e.target.value))}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <option value={30}>30 días (1 mes)</option>
                    <option value={90}>90 días (3 meses)</option>
                    <option value={180}>180 días (6 meses)</option>
                    <option value={365}>365 días (1 año)</option>
                    <option value={730}>730 días (2 años)</option>
                  </select>
                </div>
              </div>

              {/* Slider Draggable */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    backgroundColor: isPlaying ? '#dc2626' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'Pausar' : 'Play'}
                </button>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={sliderIndex}
                  onChange={(e) => {
                    setSliderIndex(Number(e.target.value));
                    if (isPlaying) setIsPlaying(false);
                  }}
                  style={{
                    flex: 1,
                    accentColor: '#2563eb',
                    cursor: 'ew-resize',
                    height: '6px'
                  }}
                />

                <button
                  onClick={() => {
                    setSliderIndex(0);
                    setIsPlaying(true);
                  }}
                  title="Reiniciar timeline"
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    padding: '6px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                <span>Inicio: {dateBounds ? new Date(dateBounds.min).toISOString().slice(0, 7) : '...'}</span>
                <span>Arrastra el control para recorrer el histórico</span>
                <span>Fin: {dateBounds ? new Date(dateBounds.max).toISOString().slice(0, 7) : '...'}</span>
              </div>
            </div>
          )}

          {/* Leyenda de Contexto Forense */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
            borderRadius: '6px',
            padding: '14px 18px',
            fontSize: '12px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontWeight: 700, color: '#94a3b8', marginBottom: '2px' }}>CONVENCIONES RAG-ONTOLOGY</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.PERSONA }} />
              <span>🔴 Cédula de Desaparición</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.MODUS }} />
              <span>🟠 Modus Operandi (Levantón, Evasión, Engaño)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.CONDICION }} />
              <span>🔴 Condición de Localización (No Localizado, etc.)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.SEXO }} />
              <span>🟣 Segmento por Sexo / Género</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.INSTITUCION }} />
              <span>🟢 Albergue / Casa Hogar / Anexo</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.EVIDENCIA_MATERIAL }} />
              <span>🟡 Carta / Recado / Audio Dejado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.DESTINO }} />
              <span>🔵 Destino / Traslado Declarado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.VEHICULO_SOSPECHOSO }} />
              <span>🟣 Vehículo de Perpetradores / Agresores</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.VEHICULO_VICTIMA }} />
              <span>🔷 Vehículo de la Víctima</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CONTEXT_COLORS.PARENTESCO }} />
              <span>⚪ Parentesco Denunciante / Testigo</span>
            </div>
          </div>
        </div>

        {/* Panel Lateral de Detalle Forense */}
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
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: CONTEXT_COLORS[selectedNode.nodeType] || CONTEXT_COLORS.DEFAULT,
                    color: '#fff'
                  }}>
                    {selectedNode.nodeType === 'PERSONA' && '👤 EXPEDIENTE / PERSONA'}
                    {selectedNode.nodeType === 'MODUS' && '⚡ PATRÓN CRIMINAL (MODUS)'}
                    {selectedNode.nodeType === 'MES_REPORTE' && '📅 CLÚSTER TEMPORAL (MES)'}
                    {selectedNode.nodeType === 'CONDICION' && '⚠️ CONDICIÓN DE LOCALIZACIÓN'}
                    {selectedNode.nodeType === 'SEXO' && '⚧️ SEGMENTO POR SEXO'}
                    {selectedNode.nodeType === 'INSTITUCION' && '🏢 ALBERGUE / CASA HOGAR / ANEXO'}
                    {selectedNode.nodeType === 'EVIDENCIA_MATERIAL' && '✉️ CARTA / RECADO / INDICIO'}
                    {selectedNode.nodeType === 'DESTINO' && '📍 TRASLADO / DESTINO'}
                    {selectedNode.nodeType === 'VEHICULO_SOSPECHOSO' && '🚨 VEHÍCULO SOSPECHOSO'}
                    {selectedNode.nodeType === 'VEHICULO_VICTIMA' && '🚗 VEHÍCULO DE VÍCTIMA'}
                    {selectedNode.nodeType === 'PARENTESCO' && '👥 ROL DENUNCIANTE'}
                  </span>

                  {selectedNode.nodeType === 'PERSONA' && (
                    <>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#dc2626',
                        color: '#fff'
                      }}>
                        {selectedNode.attributes?.condicion_localizacion === 'NO_LOCALIZADO' ? 'NO LOCALIZADO' : (selectedNode.attributes?.condicion_localizacion || 'DESAPARECIDO')}
                      </span>
                      {selectedNode.attributes?.sexo && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          color: '#cbd5e1'
                        }}>
                          {selectedNode.attributes.sexo} {selectedNode.attributes?.edad ? `• ${selectedNode.attributes.edad} AÑOS` : ''}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '12px 0 0 0', color: '#f8fafc', lineHeight: 1.3 }}>
                  {selectedNode.attributes?.nombre_real || selectedNode.label || selectedNode.id}
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

              {/* SI ES UN CASO: FICHA FORENSE EXTRAÍDA POR LLM */}
              {selectedNode.nodeType === 'PERSONA' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {selectedNode.attributes?.date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                        <Calendar size={16} color="#e63946" />
                        <span><strong>Fecha:</strong> {selectedNode.attributes.date}</span>
                      </div>
                    )}

                    {selectedNode.attributes?.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                        <MapPin size={16} color="#e63946" />
                        <span><strong>Lugar:</strong> {selectedNode.attributes.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Ficha Forense Estructurada */}
                  {selectedNode.attributes?.forense && (
                    <div style={{
                      backgroundColor: '#1e1b4b',
                      border: '1px solid #4338ca',
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase' }}>
                        Atributos Forenses Extraídos (LLM)
                      </span>

                      {selectedNode.attributes.forense.modus_operandi && (
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Modus Operandi:</span>
                          <p style={{ margin: '2px 0 0 0', fontWeight: 700, color: '#f97316' }}>
                            {selectedNode.attributes.forense.modus_operandi}
                          </p>
                        </div>
                      )}

                      {/* ALBERGUE O INSTITUCIÓN DETECTADA */}
                      {selectedNode.attributes.forense.nombre_lugar_institucion && (
                        <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 800 }}>🏢 Albergue / Anexo / Centro:</span>
                          <p style={{ margin: '2px 0 0 0', fontWeight: 700, color: '#ecfdf5', fontSize: '13px' }}>
                            {selectedNode.attributes.forense.nombre_lugar_institucion}
                          </p>
                          {selectedNode.attributes.forense.lugar_tipo && (
                            <span style={{ fontSize: '10px', color: '#a7f3d0' }}>
                              Tipo: {selectedNode.attributes.forense.lugar_tipo}
                            </span>
                          )}
                        </div>
                      )}

                      {/* EVIDENCIA DOCUMENTAL / CARTA / RECADO */}
                      {selectedNode.attributes.forense.indicio_dejado && selectedNode.attributes.forense.indicio_dejado !== 'NINGUNO' && (
                        <div style={{ backgroundColor: '#78350f', border: '1px solid #d97706', padding: '10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#fde047', fontWeight: 800 }}>✉️ Indicio Dejado en Sitio:</span>
                          <p style={{ margin: '2px 0 0 0', fontWeight: 700, color: '#fffbeb', fontSize: '12px' }}>
                            {selectedNode.attributes.forense.indicio_dejado}
                          </p>
                          {selectedNode.attributes.forense.contenido_indicio && (
                            <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: '#fef3c7', fontSize: '12px', lineHeight: 1.4 }}>
                              "{selectedNode.attributes.forense.contenido_indicio}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* DESTINO O TRASLADO DECLARADO */}
                      {selectedNode.attributes.forense.destino_declarado && (
                        <div style={{ backgroundColor: '#1e3a8a', border: '1px solid #2563eb', padding: '8px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 700 }}>📍 Destino / Traslado Manifestado:</span>
                          <p style={{ margin: '2px 0 0 0', color: '#eff6ff', fontWeight: 600 }}>
                            {selectedNode.attributes.forense.destino_declarado}
                          </p>
                        </div>
                      )}

                      {selectedNode.attributes.forense.vehiculo_perpetradores?.menciona && (
                        <div style={{ backgroundColor: '#2e1065', padding: '8px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 700 }}>🚨 Vehículo de Agresores:</span>
                          <p style={{ margin: '2px 0 0 0', color: '#e2e8f0' }}>
                            {selectedNode.attributes.forense.vehiculo_perpetradores.tipo} {' '}
                            {selectedNode.attributes.forense.vehiculo_perpetradores.color} {' '}
                            {selectedNode.attributes.forense.vehiculo_perpetradores.marca}
                          </p>
                        </div>
                      )}

                      {selectedNode.attributes.forense.vehiculo_victima?.menciona && (
                        <div style={{ backgroundColor: '#082f49', padding: '8px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>🚗 Vehículo Víctima:</span>
                          <p style={{ margin: '2px 0 0 0', color: '#e2e8f0' }}>
                            {selectedNode.attributes.forense.vehiculo_victima.tipo} {' '}
                            {selectedNode.attributes.forense.vehiculo_victima.color} {' '}
                            {selectedNode.attributes.forense.vehiculo_victima.marca}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Armas:</span>
                          <p style={{ margin: '2px 0 0 0', fontWeight: 600, color: '#cbd5e1' }}>
                            {selectedNode.attributes.forense.armas || 'No refiere'}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Denunciante:</span>
                          <p style={{ margin: '2px 0 0 0', fontWeight: 600, color: '#cbd5e1' }}>
                            {selectedNode.attributes.forense.reportante_parentesco || 'N/D'}
                          </p>
                        </div>
                      </div>

                      {selectedNode.attributes.forense.resumen_forense && (
                        <div style={{ marginTop: '4px', borderTop: '1px solid #3730a3', paddingTop: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Síntesis Criminalística:</span>
                          <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: '#c7d2fe', lineHeight: 1.4 }}>
                            "{selectedNode.attributes.forense.resumen_forense}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* SI ES UN NODO MODUS O VEHICULO */}
              {selectedNode.nodeType !== 'PERSONA' && selectedNode.attributes?.description && (
                <div style={{ backgroundColor: '#131d31', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.5 }}>
                    {selectedNode.attributes.description}
                  </p>
                </div>
              )}

              {/* NARRATIVA ORIGINAL DEL EXPEDIENTE */}
              {selectedNode.attributes?.description && selectedNode.nodeType === 'PERSONA' && (
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Narrativa Original de los Hechos
                  </span>
                  <div style={{
                    color: '#94a3b8',
                    lineHeight: '1.6',
                    fontSize: '12px',
                    backgroundColor: '#131d31',
                    padding: '14px',
                    borderRadius: '8px',
                    maxHeight: '260px',
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

export default RedContextoPage;
