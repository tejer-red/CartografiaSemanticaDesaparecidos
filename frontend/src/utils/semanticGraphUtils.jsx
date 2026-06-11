import { useMemo, useState, useEffect, useCallback } from 'react';
import { useLoadGraph, useRegisterEvents } from '@react-sigma/core';
import Graph from 'graphology';
import { circular } from 'graphology-layout';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { useData } from '../context/DataContext';
import getFilteredFeatures from '../context/FilteredFeatures';
import React from 'react';

const COLORS = {
  TERM: '#8884d8',
  CASE: '#82ca9d'
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
      console.error('Error loading graph:', error);
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
  const [showSigma, setShowSigma] = useState(false);

  const graph = useMemo(() => {
    const graph = new Graph();
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
          size: 5,
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
  }, [map, selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange]);

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
