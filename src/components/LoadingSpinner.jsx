import React from 'react';

/**
 * LoadingSpinner - Componente de carga global
 * 
 * PROCESO:
 * 1. Muestra un overlay semi-transparente
 * 2. Muestra un spinner animado al centro
 * 3. Bloquea interacciones mientras está activo
 * 
 * @param {boolean} visible - Controla la visibilidad del spinner
 */
const LoadingSpinner = ({ visible }) => {
    if (!visible) return null;

    return (
        <div
            className="loading-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(2px)',
                zIndex: 20000, // Por encima de todo incluso modales
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
            }}
        >
            <div className="spinner-container" style={{ position: 'relative' }}>
                {/* Spinner principal */}
                <div
                    className="spinner"
                    style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid #f3f3f3',
                        borderTop: '4px solid #007bff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }}
                />
                {/* Efecto de pulso */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '10px',
                        height: '10px',
                        backgroundColor: '#007bff',
                        borderRadius: '50%',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                />
            </div>

            <p style={{
                marginTop: '15px',
                color: '#333',
                fontWeight: '600',
                fontSize: '0.9rem',
                letterSpacing: '0.5px'
            }}>
                CARGANDO DATOS...
            </p>

            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.3; }
          100% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.7; }
        }
      `}</style>
        </div>
    );
};

export default LoadingSpinner;
