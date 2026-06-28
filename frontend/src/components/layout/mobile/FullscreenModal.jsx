import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * FullscreenModal - Modal de pantalla completa para mobile
 * 
 * PROCESO:
 * 1. Se renderiza como portal fixed sobre todo el contenido
 * 2. Animación slide-up desde abajo
 * 3. Bloquea scroll del body mientras está abierto
 * 4. Botón de cerrar en header
 * 
 * @param {boolean} isOpen - Controla visibilidad
 * @param {function} onClose - Callback al cerrar
 * @param {string} title - Título del modal
 * @param {ReactNode} children - Contenido
 */
const FullscreenModal = ({ isOpen, onClose, title, children }) => {
    // Bloquear scroll del body cuando está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Cerrar con Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fullscreen-modal"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#fff',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out',
            }}
        >
            {/* Header */}
            <div
                className="fullscreen-modal__header"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderBottom: '1px solid #e5e5e5',
                    backgroundColor: '#f8f9fa',
                }}
            >
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                    {title}
                </h2>
                <button
                    onClick={onClose}
                    aria-label="Cerrar"
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <X size={24} color="#666" />
                </button>
            </div>

            {/* Content */}
            <div
                className="fullscreen-modal__content"
                style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '1rem',
                }}
            >
                {children}
            </div>

            {/* CSS Animation */}
            <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
        </div>
    );
};

export default FullscreenModal;
