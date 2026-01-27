import React, { createContext, useContext, useState } from 'react';

/**
 * TimelineContext.jsx - Contexto para la línea de tiempo
 * 
 * PROPÓSITO:
 * Centraliza todo lo relacionado con la navegación temporal:
 * - Fechas de inicio y fin de consulta
 * - Fecha seleccionada en la timeline
 * - Escala temporal (diario, semanal, mensual, etc.)
 * - Estado de reproducción automática
 * - Datos procesados para el gráfico
 * 
 * FLUJO:
 * 1. Usuario define startDate/endDate → se consulta la API
 * 2. Datos se procesan según timeScale → timelineData
 * 3. Usuario selecciona fecha en gráfico → selectedDate + daysRange
 * 4. Se filtran marcadores del mapa por ese rango
 */

const TimelineContext = createContext();

export const TimelineProvider = ({ children }) => {
    // ============================================================
    // FECHAS DE CONSULTA (API)
    // ============================================================
    const [startDate, setStartDate] = useState('2023-01-01');
    const [endDate, setEndDate] = useState('2024-01-01');

    // ============================================================
    // FECHA SELECCIONADA EN TIMELINE
    // ============================================================
    const [selectedDate, setSelectedDate] = useState(null);
    const [daysRange, setDaysRange] = useState(30);

    // ============================================================
    // CONFIGURACIÓN DE ESCALA
    // ============================================================
    // 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly'
    const [timeScale, setTimeScale] = useState('monthly');

    // ============================================================
    // REPRODUCCIÓN AUTOMÁTICA
    // ============================================================
    const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
    const [timelineVelocity, setTimelineVelocity] = useState(1000); // ms entre frames
    const [timelinePanelOpen, setTimelinePanelOpen] = useState(true);

    // ============================================================
    // DATOS PARA EL GRÁFICO
    // ============================================================
    const [timelineData, setTimelineData] = useState([]);
    const [timeline, setTimeline] = useState(null);
    const [timelineControl, setTimelineControl] = useState(null);

    // ============================================================
    // FUNCIONES DE UTILIDAD
    // ============================================================

    // Calcular el rango de fechas según la fecha seleccionada y la escala
    const calculateDateRange = (date) => {
        if (!date) return null;

        const endDate = new Date(date);
        endDate.setDate(date.getDate() + daysRange);

        return {
            start: date.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };
    };

    const value = {
        // Fechas de consulta
        startDate, setStartDate,
        endDate, setEndDate,
        // Fecha seleccionada
        selectedDate, setSelectedDate,
        daysRange, setDaysRange,
        // Escala
        timeScale, setTimeScale,
        // Reproducción
        isTimelinePlaying, setIsTimelinePlaying,
        timelineVelocity, setTimelineVelocity,
        timelinePanelOpen, setTimelinePanelOpen,
        // Datos
        timelineData, setTimelineData,
        timeline, setTimeline,
        timelineControl, setTimelineControl,
        // Utilidades
        calculateDateRange,
    };

    return (
        <TimelineContext.Provider value={value}>
            {children}
        </TimelineContext.Provider>
    );
};

export const useTimeline = () => {
    const context = useContext(TimelineContext);
    if (!context) {
        throw new Error('useTimeline debe usarse dentro de un TimelineProvider');
    }
    return context;
};

export default TimelineContext;
