import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';

export const LoadingOverlay = () => {
  const { 
    loadingStatus, 
    dataCounts, 
    autoStart, 
    setAutoStart,
    showLoadingScreen,
    setShowLoadingScreen
  } = useData();

  const [verboseMode, setVerboseMode] = useState(false);

  // Check if everything is loaded
  const isAnyLoading = Object.values(loadingStatus).some(status => status);

  useEffect(() => {
    // If autoStart is true and nothing is loading anymore, automatically hide the overlay
    if (autoStart && !isAnyLoading && showLoadingScreen) {
      setShowLoadingScreen(false);
    }
  }, [autoStart, isAnyLoading, showLoadingScreen, setShowLoadingScreen]);

  if (!showLoadingScreen) return null;

  const StatusItem = ({ label, isLoading, count }) => (
    <div style={{
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid var(--border-color)'
    }}>
      <span style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        color: 'var(--text-color)'
      }}>
        {isLoading ? (
          <div style={{
            width: '12px', height: '12px', 
            borderRadius: '50%', border: '2px solid var(--primary-color)', 
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          <div style={{
            width: '12px', height: '12px', 
            borderRadius: '50%', backgroundColor: '#28a745'
          }} />
        )}
        {label}
      </span>
      {count !== undefined && (
        <span style={{ 
          backgroundColor: '#f8f9fa', 
          border: '1px solid var(--border-color)',
          padding: '2px 8px', 
          borderRadius: '12px',
          fontSize: '0.9em',
          color: 'var(--text-muted)'
        }}>
          {count.toLocaleString()}
        </span>
      )}
    </div>
  );

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      zIndex: 9999, // Ensure it's above the map and UI
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-color)',
      fontFamily: 'inherit'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={{
        backgroundColor: 'var(--bg-color)',
        padding: '32px',
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 38px rgba(0,0,0,0.35)',
        width: '400px',
        maxWidth: '90%'
      }}>
        <h2 style={{ 
          marginTop: 0, 
          textAlign: 'center', 
          fontSize: '22px', 
          fontWeight: 600,
          color: 'var(--text-color)'
        }}>
          Sistema de Cartografía Semántica
        </h2>
        
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <StatusItem label="Mapa Base" isLoading={loadingStatus.map} />
          <StatusItem label="Cédulas de Búsqueda" isLoading={loadingStatus.cedulas} count={dataCounts.cedulas} />
          <StatusItem label="Fosas Clandestinas" isLoading={loadingStatus.fosas} count={dataCounts.fosas} />
          <StatusItem label="Reportes de Prensa (Noticias)" isLoading={loadingStatus.noticias} count={dataCounts.noticias} />
        </div>

        <div style={{ 
          marginTop: '24px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.9em',
          color: 'var(--text-muted)'
        }}>
          <label style={{ cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={autoStart} 
              onChange={(e) => setAutoStart(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            Iniciar automáticamente
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={verboseMode} 
              onChange={(e) => setVerboseMode(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            Verbose mode
          </label>
        </div>

        {verboseMode && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            fontSize: '0.8em',
            fontFamily: 'monospace',
            color: 'var(--text-muted)',
            maxHeight: '100px',
            overflowY: 'auto'
          }}>
            {Object.entries(loadingStatus).map(([key, isLoading]) => (
              <div key={key}>
                [{new Date().toLocaleTimeString()}] {key}: {isLoading ? 'fetching...' : 'complete'}
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={() => setShowLoadingScreen(false)}
          disabled={isAnyLoading && !autoStart}
          style={{
            marginTop: '24px',
            width: '100%',
          }}
        >
          {isAnyLoading ? 'Cargando...' : 'Iniciar'}
        </button>
      </div>
    </div>
  );
};
