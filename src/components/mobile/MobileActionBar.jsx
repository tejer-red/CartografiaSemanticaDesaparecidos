import React, { useState } from 'react';
import {
    Filter,
    Clock,
    BarChart,
    Book
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import FilterBadge from './FilterBadge';
import FullscreenModal from './FullscreenModal';
import MobileFiltersModal from './MobileFiltersModal';
import MobileTimelineModal from './MobileTimelineModal';
import FilteredStats from '../FilteredStats';
import Notebook from '../Notebook';

/**
 * MobileActionBar - Barra flotante de acciones para mobile
 * 
 * PROCESO:
 * 1. Se renderiza fija en la parte inferior de la pantalla
 * 2. Contiene iconos: Filtros, Línea de tiempo, Estadísticas, Cuadernos
 * 3. El botón de Play está en TimelineSlider (siempre visible)
 * 
 * ICONOS (Lucide - mismos del proyecto):
 * - Filtros: Filter (con badge de conteo)
 * - Línea de tiempo: Clock
 * - Estadísticas: BarChart
 * - Cuadernos: Book
 */
const MobileActionBar = () => {
    // Estados de modales
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [isNotebookOpen, setIsNotebookOpen] = useState(false);

    const buttonStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        color: '#555',
        position: 'relative',
        flex: 1,
    };

    const labelStyle = {
        fontSize: '0.6rem',
        fontWeight: 500,
        textAlign: 'center',
    };

    const activeButtonStyle = {
        ...buttonStyle,
        color: '#007bff',
    };

    return (
        <>
            {/* Barra flotante */}
            <nav
                className="mobile-action-bar"
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    borderTop: '1px solid #e5e5e5',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    padding: '0.5rem 0',
                    zIndex: 9999,
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                }}
            >
                {/* Filtros */}
                <button
                    style={isFiltersOpen ? activeButtonStyle : buttonStyle}
                    onClick={() => setIsFiltersOpen(true)}
                    aria-label="Abrir filtros"
                >
                    <div style={{ position: 'relative' }}>
                        <Filter size={22} />
                        <FilterBadge />
                    </div>
                    <span style={labelStyle}>Filtros</span>
                </button>

                {/* Línea de tiempo */}
                <button
                    style={isTimelineOpen ? activeButtonStyle : buttonStyle}
                    onClick={() => setIsTimelineOpen(true)}
                    aria-label="Abrir línea de tiempo"
                >
                    <Clock size={22} />
                    <span style={labelStyle}>Línea de tiempo</span>
                </button>

                {/* Estadísticas */}
                <button
                    style={isStatsOpen ? activeButtonStyle : buttonStyle}
                    onClick={() => setIsStatsOpen(true)}
                    aria-label="Ver estadísticas"
                >
                    <BarChart size={22} />
                    <span style={labelStyle}>Estadísticas</span>
                </button>

                {/* Cuadernos */}
                <button
                    style={isNotebookOpen ? activeButtonStyle : buttonStyle}
                    onClick={() => setIsNotebookOpen(true)}
                    aria-label="Abrir cuadernos"
                >
                    <Book size={22} />
                    <span style={labelStyle}>Cuadernos</span>
                </button>
            </nav>

            {/* Modales con componentes originales */}
            <FullscreenModal
                isOpen={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                title="Filtros"
            >
                <MobileFiltersModal onClose={() => setIsFiltersOpen(false)} />
            </FullscreenModal>

            <FullscreenModal
                isOpen={isTimelineOpen}
                onClose={() => setIsTimelineOpen(false)}
                title="Línea de Tiempo"
            >
                <MobileTimelineModal />
            </FullscreenModal>

            <FullscreenModal
                isOpen={isStatsOpen}
                onClose={() => setIsStatsOpen(false)}
                title="Estadísticas"
            >
                <div style={{ padding: '0.5rem' }}>
                    <FilteredStats />
                </div>
            </FullscreenModal>

            <FullscreenModal
                isOpen={isNotebookOpen}
                onClose={() => setIsNotebookOpen(false)}
                title="Bitácora de Navegación"
            >
                <div style={{ padding: '0.5rem' }}>
                    <Notebook onCloseModal={() => setIsNotebookOpen(false)} />
                </div>
            </FullscreenModal>
        </>
    );
};

export default MobileActionBar;
