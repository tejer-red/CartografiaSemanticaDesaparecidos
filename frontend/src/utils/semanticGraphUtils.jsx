import { useMemo, useState, useEffect, useCallback } from 'react';
import { useLoadGraph, useRegisterEvents } from '@react-sigma/core';
import Graph from 'graphology';
import { circular } from 'graphology-layout';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { useData } from '../context/DataContext';
import getFilteredFeatures from '../context/FilteredFeatures';
import React from 'react';

import createLogger from '../utils/logger';
const logger = createLogger('semanticGraphUtils');


const COLORS = {
  TERM: '#8884d8',
  CASE: '#e63946',
  HASH_DOMICILIO: '#457b9d',
  NOTICIA: '#f4a261',
  FOSA: '#2a9d8f',
  SUGERENCIA: '#9d4edd'
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
    try {
      if (graph) {
        loadGraph(graph);
      }
    } catch (error) {
      logger.error('Error loading graph:', error);
    }
  }, [graph, loadGraph]);
  return null;
}

export function useSemanticGraph() {
  const { 
    selectedDate,
    daysRange,
    map,
    selectedSexo,
    selectedCondicion,
    edadRange,
    sumScoreRange
  } = useData();

  const [currentRoot, setCurrentRoot] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSigma, setShowSigma] = useState(true);
  const [apiGraphData, setApiGraphData] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(true);

  // Consultar la API REST de Ontología activa
  useEffect(() => {
    if (!showSigma) return;
    const API_BASE = `${window.location.protocol}//${window.location.hostname}:8008`;
    fetch(`${API_BASE}/api/v1/ontology/graph?limit_edges=200`)
      .then(res => res.json())
      .then(data => {
        if (data && data.nodes && data.edges) {
          setApiGraphData(data);
        }
        setLoadingGraph(false);
      })
      .catch(err => {
        logger.error('Error fetching semantic graph from API:', err);
        setLoadingGraph(false);
      });
  }, [showSigma]);

  const graph = useMemo(() => {
    if (!showSigma) return null;

    const graph = new Graph();

    // Si la API devolvió el grafo consolidado, construirlo directamente
    if (apiGraphData && apiGraphData.nodes && apiGraphData.nodes.length > 0) {
      apiGraphData.nodes.forEach(node => {
        if (!graph.hasNode(node.id)) {
          graph.addNode(node.id, {
            label: node.label || node.id,
            size: node.size || (node.type === 'PERSONA' ? 14 : (node.type === 'FOSA' ? 16 : 10)),
            color: node.color || COLORS[node.type] || '#4a4e69',
            x: node.x || Math.random() * 200,
            y: node.y || Math.random() * 200,
            type: 'circle',
            nodeType: node.type,
            attributes: {
              type: node.type,
              label: node.label,
              ...(node.metadata || {})
            }
          });
        }
      });

      apiGraphData.edges.forEach(edge => {
        if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
          if (!graph.hasEdge(edge.source, edge.target)) {
            graph.addEdge(edge.source, edge.target, {
              label: edge.label || edge.relation_type || '',
              size: edge.size || (edge.estado === 'SUGERIDO' ? 1.2 : 2.5),
              color: edge.color || (edge.estado === 'SUGERIDO' ? COLORS.SUGERENCIA : '#adb5bd'),
              attributes: {
                relation: edge.label,
                confidence: edge.confidence,
                estado: edge.estado
              }
            });
          }
        }
      });

      forceAtlas2.assign(graph, { 
        iterations: 60,
        settings: {
          gravity: 1.2,
          scalingRatio: 3,
          strongGravityMode: true,
          slowDown: 1.5
        }
      });

      return graph;
    }

    // Fallback: Si no hay respuesta API todavía, usar las features locales del mapa
    const features = getFilteredFeatures(
      map, 
      selectedDate, 
      daysRange, 
      selectedSexo, 
      selectedCondicion, 
      edadRange, 
      sumScoreRange
    ).filter(feature => feature.properties.tipo_marcador === 'cedula_busqueda');

    features.forEach(feature => {
      const terms = (feature.properties.violence_terms || "").split(", ").filter(Boolean);
      const caseId = String(feature.properties.id_cedula_busqueda);

      if (!graph.hasNode(caseId)) {
        graph.addNode(caseId, {
          label: feature.properties.nombre_completo || `Case ${caseId}`,
          size: 8,
          color: COLORS.CASE,
          x: Math.random(),
          y: Math.random(),
          attributes: {
            date: feature.properties.fecha_desaparicion || "Unknown",
            location: feature.properties.municipio || "Unknown",
            description: feature.properties.descripcion_desaparicion || "No description",
            value: parseInt(feature.properties.violence_score) || 1
          }
        });
      }

      terms.forEach(term => {
        const termId = String(term);
        if (!graph.hasNode(termId)) {
          graph.addNode(termId, {
            label: term,
            size: 10,
            color: COLORS.TERM,
            x: Math.random(),
            y: Math.random()
          });
        }
        if (!graph.hasEdge(termId, caseId)) {
          graph.addEdge(termId, caseId);
        }
      });
    });

    circular.assign(graph, { scale: 100 });
    forceAtlas2.assign(graph, { 
      iterations: 50,
      settings: {
        gravity: 1,
        scalingRatio: 2,
        strongGravityMode: true,
        slowDown: 2
      }
    });

    return graph;
  }, [showSigma, apiGraphData, map, selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange]);

  const handleNodeClick = useCallback((nodeId) => {
    const nodeAttrs = graph.getNodeAttributes(nodeId);
    if (nodeAttrs.color === COLORS.TERM) {
      setCurrentRoot({ id: nodeId, ...nodeAttrs });
    } else {
      setSelectedCase({ id: nodeId, ...nodeAttrs });
    }
  }, [graph]);

  const handleBack = useCallback(() => {
    if (selectedCase) {
      setSelectedCase(null);
    } else if (currentRoot) {
      setCurrentRoot(null);
    }
  }, [selectedCase, currentRoot]);

  const displayGraph = useMemo(() => {
    if (!graph) return null;

    if (!currentRoot) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(LoadGraph, { graph }),
        React.createElement(GraphEvents, { onNodeClick: handleNodeClick })
      );
    }
    const subgraph = new Graph();
    const rootId = currentRoot.id;
    subgraph.addNode(rootId, graph.getNodeAttributes(rootId));
    graph.forEachEdge((edge, attr, source, target) => {
      if (source === rootId || target === rootId) {
        const oppositeNode = source === rootId ? target : source;
        const nodeAttrs = graph.getNodeAttributes(oppositeNode);
        if (!subgraph.hasNode(oppositeNode)) {
          subgraph.addNode(oppositeNode, nodeAttrs);
        }
        subgraph.addEdge(source, target);
      }
    });
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(LoadGraph, { graph: subgraph }),
      React.createElement(GraphEvents, { onNodeClick: handleNodeClick })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, currentRoot, handleNodeClick]);

  return {
    displayGraph,
    currentRoot,
    selectedCase,
    isFullscreen,
    showSigma,
    handleNodeClick,
    handleBack,
    setIsFullscreen,
    setShowSigma,
  };
}
