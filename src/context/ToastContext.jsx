import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * ToastContext - Sistema de notificaciones no bloqueantes
 * 
 * PROCESO:
 * 1. Provee métodos toast.success(), toast.error(), toast.info()
 * 2. Renderiza notificaciones con animación de entrada/salida
 * 3. Auto-cierre configurable (default 5 segundos)
 * 4. Permite cerrar manualmente
 */

const ToastContext = createContext();

// PASO 1: Definir tipos y estilos de toast
const TOAST_TYPES = {
    success: {
        icon: '✅',
        bgColor: '#d4edda',
        borderColor: '#28a745',
        textColor: '#155724'
    },
    error: {
        icon: '❌',
        bgColor: '#f8d7da',
        borderColor: '#dc3545',
        textColor: '#721c24'
    },
    info: {
        icon: 'ℹ️',
        bgColor: '#d1ecf1',
        borderColor: '#17a2b8',
        textColor: '#0c5460'
    },
    warning: {
        icon: '⚠️',
        bgColor: '#fff3cd',
        borderColor: '#ffc107',
        textColor: '#856404'
    }
};

// PASO 2: Componente individual de Toast
const Toast = ({ id, message, type, onClose }) => {
    const style = TOAST_TYPES[type] || TOAST_TYPES.info;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                marginBottom: '0.5rem',
                backgroundColor: style.bgColor,
                border: `1px solid ${style.borderColor}`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                animation: 'slideIn 0.3s ease-out',
                minWidth: '300px',
                maxWidth: '400px'
            }}
        >
            <span style={{ fontSize: '1.25rem' }}>{style.icon}</span>
            <p style={{
                margin: 0,
                flex: 1,
                color: style.textColor,
                fontSize: '0.9rem'
            }}>
                {message}
            </p>
            <button
                onClick={() => onClose(id)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    color: style.textColor,
                    opacity: 0.7,
                    padding: 0
                }}
                aria-label="Cerrar notificación"
            >
                ×
            </button>
        </div>
    );
};

// PASO 3: Provider del contexto de Toast
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    // Agregar un nuevo toast
    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();

        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-remover después del tiempo especificado
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    // Remover un toast específico
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Métodos de conveniencia
    const toast = {
        success: (message, duration) => addToast(message, 'success', duration),
        error: (message, duration) => addToast(message, 'error', duration),
        info: (message, duration) => addToast(message, 'info', duration),
        warning: (message, duration) => addToast(message, 'warning', duration)
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}

            {/* Container de toasts - posición fija arriba derecha */}
            <div
                style={{
                    position: 'fixed',
                    top: '1rem',
                    right: '1rem',
                    zIndex: 99999,
                    pointerEvents: 'none'
                }}
            >
                <style>
                    {`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}
                </style>
                <div style={{ pointerEvents: 'auto' }}>
                    {toasts.map(t => (
                        <Toast
                            key={t.id}
                            id={t.id}
                            message={t.message}
                            type={t.type}
                            onClose={removeToast}
                        />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
};

// PASO 4: Hook para consumir el contexto
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast debe usarse dentro de un ToastProvider');
    }
    return context;
};

export default ToastContext;
