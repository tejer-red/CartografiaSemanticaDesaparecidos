import React from 'react';
import { SigmaContainer } from '@react-sigma/core';
import "../../styles/sigma.css";
import { useSemanticGraph } from '../../utils/semanticGraphUtils';

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
            Visualizar Red
          </button>
        </div>
      )}

      <div
          className="violence-cases__graph-wrapper"
          style={{
            display: showSigma ? "block" : "none",
            width: "100%",
            height: "100%",
            minHeight: "450px",
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

      {selectedCase && (
        <div className="violence-cases__modal">
          <div className="violence-cases__modal-content">
            <button className="violence-cases__modal-close" onClick={handleBack}>×</button>
            <h3 style={{ color: selectedCase.color || '#333' }}>
              {selectedCase.attributes?.type === 'NOTICIA' && '📰 Nota Periodística'}
              {selectedCase.attributes?.type === 'FOSA' && '🪦 Fosa Clandestina'}
              {selectedCase.attributes?.type === 'PERSONA' && '👤 Caso / Persona'}
              {selectedCase.attributes?.type === 'HASH_DOMICILIO' && '📍 Domicilio / Ubicación Anonimizada'}
              {!['NOTICIA', 'FOSA', 'PERSONA', 'HASH_DOMICILIO'].includes(selectedCase.attributes?.type) && 'Detalle del Nodo'}
            </h3>
            <div className="violence-cases__modal-details">
              <p><strong>Identificador:</strong> {selectedCase.id}</p>
              <p><strong>Etiqueta:</strong> {selectedCase.label}</p>
              {selectedCase.attributes?.date && (
                <p><strong>Fecha:</strong> {selectedCase.attributes.date}</p>
              )}
              {selectedCase.attributes?.location && (
                <p><strong>Municipio / Zona:</strong> {selectedCase.attributes.location}</p>
              )}
              {selectedCase.attributes?.description && (
                <p><strong>Descripción:</strong> {selectedCase.attributes.description}</p>
              )}
              {selectedCase.attributes?.url && (
                <p>
                  <strong>Fuente:</strong>{' '}
                  <a href={selectedCase.attributes.url} target="_blank" rel="noreferrer" style={{ color: '#0077b6' }}>
                    Ver artículo original ↗
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticGraph;