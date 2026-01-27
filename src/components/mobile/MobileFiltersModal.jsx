import React from 'react';
import FilterForm from '../FilterForm';
import FilterFormWrapper from '../FilterFormWrapper';

/**
 * MobileFiltersModal - Modal de filtros para mobile
 * 
 * PROCESO:
 * 1. FilterFormWrapper activa los effects que sincronizan filtros con el mapa
 * 2. FilterForm muestra los controles de filtrado
 * 
 * IMPORTANTE: FilterFormWrapper DEBE estar presente para que los cambios
 * en los filtros se apliquen al mapa. Este componente contiene el useEffect
 * que llama a filterMarkersByDate.
 */
const MobileFiltersModal = ({ onClose }) => {
    return (
        <div className="mobile-filters-content">
            {/* FilterFormWrapper activa los effects de sincronización con el mapa */}
            <FilterFormWrapper />

            {/* FilterForm muestra los controles */}
            <FilterForm />

            {/* Botón de aplicar/cerrar */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem 0',
                borderTop: '1px solid #e5e5e5',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: 'none',
                        borderRadius: '0.5rem',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: '1rem',
                    }}
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default MobileFiltersModal;
