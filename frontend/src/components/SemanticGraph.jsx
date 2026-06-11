import React from 'react';
import { SigmaContainer } from '@react-sigma/core';
import "../styles/sigma.css";
import { useSemanticGraph } from '../utils/semanticGraphUtils';

const SemanticGraph = () => {
  const {
    displayGraph,
    currentRoot,
    selectedCase,
    isFullscreen,
    showSigma,
    handleNodeClick,
    handleBack,
    setIsFullscreen,
    setShowSigma,
  } = useSemanticGraph();

  return (
    <div className={`violence-cases ${isFullscreen ? 'violence-cases--fullscreen' : ''}`}>
      <div className="violence-cases__controls">
        {currentRoot && (
          <button className="violence-cases__back-btn" onClick={handleBack}>
            ← Back to Terms
          </button>
        )}
        <button 
          className="violence-cases__fullscreen-btn" 
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? '↙' : '↗'}
        </button>
      </div>

      {!showSigma && (
        <div style={{ margin: "1rem 0", textAlign: "center" }}>
          <button
            onClick={() => setShowSigma(true)}
            style={{
              padding: "0.5rem 1.5rem",
              fontSize: "1.1rem",
              borderRadius: "6px",
              background: "#8884d8",
              color: "#fff",
              border: "none",
              cursor: "pointer"
            }}
          >
            Iniciar grafo
          </button>
        </div>
      )}

      {showSigma && (
        <div
          className="violence-cases__graph-wrapper"
          style={{
            width: "25rem",
            height: "23rem",
            minWidth: 300,
            minHeight: 300,
            position: "relative"
          }}
        >
          <SigmaContainer
            className="violence-cases__sigma"
            style={{
              width: "100%",
              height: "100%"
            }}
            settings={{
              renderLabels: true,
              labelSize: 12,
              labelWeight: "bold",
              defaultEdgeColor: "#999",
              minCameraRatio: 0.1,
              maxCameraRatio: 10,
              allowInvalidContainer: true,
            }}
          >
            {displayGraph}
          </SigmaContainer>
        </div>
      )}

      {selectedCase && (
        <div className="violence-cases__modal">
          <div className="violence-cases__modal-content">
            <button className="violence-cases__modal-close" onClick={handleBack}>×</button>
            <h3>Case Details</h3>
            <div className="violence-cases__modal-details">
              <p><strong>Name:</strong> {selectedCase.label}</p>
              <p><strong>Date:</strong> {selectedCase.attributes.date || 'N/A'}</p>
              <p><strong>Location:</strong> {selectedCase.attributes.location || 'N/A'}</p>
              <p><strong>Description:</strong> {selectedCase.attributes.description || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticGraph;