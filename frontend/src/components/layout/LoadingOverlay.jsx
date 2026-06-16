import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';

export const LoadingOverlay = () => {
  const { 
    loadingStatus, 
    dataCounts, 
    autoStart, 
    setAutoStart,
    showLoadingScreen,
    setShowLoadingScreen,
    setIsInitialModalOpen
  } = useData();

  const [verboseMode, setVerboseMode] = useState(false);

  // Check if everything is loaded
  const isAnyLoading = Object.values(loadingStatus).some(status => status);

  // Sum of all loaded markers
  const totalCount = (dataCounts.cedulas || 0) + (dataCounts.fosas || 0) + (dataCounts.noticias || 0) + (dataCounts.forense || 0);

  // Can start only if nothing is loading and we have at least 1 record
  const canStart = !isAnyLoading && totalCount > 0;

  useEffect(() => {
    // If autoStart is true, nothing is loading anymore, and we have records, automatically hide the overlay
    if (autoStart && canStart && showLoadingScreen) {
      setShowLoadingScreen(false);
    }
  }, [autoStart, canStart, showLoadingScreen, setShowLoadingScreen]);

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
          Carga de Información
        </h2>
        
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <StatusItem label="Mapa Base" isLoading={loadingStatus.map} />
          <StatusItem label="Cédulas de Búsqueda" isLoading={loadingStatus.cedulas} count={dataCounts.cedulas} />
          <StatusItem label="Fosas Clandestinas" isLoading={loadingStatus.fosas} count={dataCounts.fosas} />
          <StatusItem label="Reportes de Prensa (Noticias)" isLoading={loadingStatus.noticias} count={dataCounts.noticias} />
          <StatusItem label="Datos y Relaciones Locales" isLoading={loadingStatus.localData} />
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
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            {Object.entries(loadingStatus).map(([key, isLoading]) => {
              const count = dataCounts[key];
              const countSuffix = (!isLoading && key !== 'map' && count !== undefined) ? ` (${count})` : '';
              return (
                <div key={key}>
                  [{new Date().toLocaleTimeString()}] {key}: {isLoading ? 'fetching...' : `complete${countSuffix}`}
                </div>
              );
            })}
          </div>
        )}

        {!isAnyLoading && totalCount === 0 && (
          <div style={{ marginTop: '16px', color: '#dc3545', textAlign: 'center', fontSize: '13px', fontWeight: 500 }}>
            No se encontraron marcadores en este rango de fechas.
          </div>
        )}

        {isAnyLoading ? (
          <button 
            disabled
            style={{
              marginTop: '24px',
              width: '100%',
              backgroundColor: '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px',
              fontWeight: 600,
              cursor: 'not-allowed'
            }}
          >
            Descargando Datos...
          </button>
        ) : totalCount > 0 ? (
          <button 
            onClick={() => setShowLoadingScreen(false)}
            style={{
              marginTop: '24px',
              width: '100%',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
            }}
          >
            Iniciar Carga de Información
          </button>
        ) : (
          <button 
            onClick={() => {
              setShowLoadingScreen(false);
              setIsInitialModalOpen(true);
            }}
            style={{
              marginTop: '16px',
              width: '100%',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Volver a Selección de Fechas
          </button>
        )}
      </div>
    </div>
  );
};
