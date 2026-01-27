import React, { Component } from 'react';

/**
 * ErrorBoundary - Captura errores en el árbol de componentes hijos
 * 
 * PROCESO:
 * 1. Captura errores de render, lifecycle y constructores
 * 2. Muestra UI de fallback con detalles del error
 * 3. Permite reintentar la operación
 * 4. Log estructurado para debugging
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  // PASO 1: Actualizar estado cuando ocurre un error
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // PASO 2: Log del error con información de contexto
  componentDidCatch(error, errorInfo) {
    console.error("╔════════════════════════════════════════╗");
    console.error("║       ERROR BOUNDARY TRIGGERED         ║");
    console.error("╚════════════════════════════════════════╝");
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("Timestamp:", new Date().toISOString());

    this.setState({ errorInfo });
  }

  // PASO 3: Método para reintentar (reset del estado de error)
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          margin: '1rem',
          backgroundColor: '#fff5f5',
          border: '1px solid #fc8181',
          borderRadius: '8px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <h2 style={{ margin: 0, color: '#c53030' }}>
              Ha ocurrido un error
            </h2>
          </div>

          <p style={{ color: '#742a2a', marginBottom: '1rem' }}>
            Lo sentimos, algo salió mal al cargar este componente.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3182ce',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Reintentar
            </button>

            <button
              onClick={this.toggleDetails}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#718096',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {this.state.showDetails ? '🔼 Ocultar detalles' : '🔽 Ver detalles'}
            </button>
          </div>

          {this.state.showDetails && (
            <details open style={{
              backgroundColor: '#1a202c',
              color: '#e2e8f0',
              padding: '1rem',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                Información técnica
              </summary>
              <p><strong>Error:</strong> {this.state.error?.toString()}</p>
              {this.state.errorInfo && (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;