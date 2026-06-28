import React from 'react';
import GlobalTimeGraph from '../../timeline/GlobalTimeGraph';
import TimelineSlider from '../../timeline/TimelineSlider';
import Clustering from '../../data/Clustering';

/**
 * MobileTimelineModal - Modal de timeline para mobile
 * 
 * PROCESO:
 * Reutiliza los componentes originales:
 * - GlobalTimeGraph para el gráfico
 * - TimelineSlider para controles de navegación
 * - Clustering para agrupación temporal
 */
const MobileTimelineModal = () => {
    return (
        <div
            className="mobile-timeline-content"
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                height: '100%',
                overflow: 'auto',
            }}
        >
            {/* Controles de timeline */}
            <div style={{
                padding: '0.5rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
            }}>
                <TimelineSlider />
            </div>

            {/* Clustering */}
            <div style={{ marginTop: '0.5rem' }}>
                <Clustering type="personas_sin_identificar" />
            </div>

            {/* Gráfico de línea de tiempo */}
            <div style={{
                flex: 1,
                minHeight: 250,
                backgroundColor: '#fff',
                borderRadius: '0.5rem',
                padding: '0.5rem',
            }}>
                <GlobalTimeGraph />
            </div>
        </div>
    );
};

export default MobileTimelineModal;
