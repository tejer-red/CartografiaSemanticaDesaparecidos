import React, { createContext, useContext, useState } from 'react';

/**
 * UIContext.jsx - Contexto para estado de UI
 * 
 * PROPÓSITO:
 * Centraliza estados de la interfaz de usuario:
 * - Estado de carga global
 * - Visibilidad de componentes
 * - Esquema de colores activo
 * - Flags de datos cargados
 * 
 * NOTA: Separado de los datos para evitar re-renders innecesarios
 * cuando cambia el estado visual.
 */

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    // ============================================================
    // ESTADO DE CARGA
    // ============================================================
    const [loading, setLoading] = useState(false);

    // ============================================================
    // VISIBILIDAD DE COMPONENTES
    // ============================================================
    const [visibleComponents, setVisibleComponents] = useState({
        filterForm: true,
        currentState: true,
    });

    // ============================================================
    // ESQUEMA DE COLORES
    // ============================================================
    // 'sexo' → colorea por HOMBRE/MUJER
    // 'condicion' → colorea por CON VIDA/SIN VIDA/NO APLICA
    const [colorScheme, setColorScheme] = useState('sexo');

    // ============================================================
    // FLAGS DE DATOS CARGADOS
    // ============================================================
    // Se usan para disparar re-renders cuando llegan nuevos datos
    const [newDataFetched, setNewDataFetched] = useState(false);
    const [newForenseDataFetched, setNewForenseDataFetched] = useState(false);

    // ============================================================
    // FUNCIONES DE UTILIDAD
    // ============================================================

    const toggleComponent = (componentName) => {
        setVisibleComponents(prev => ({
            ...prev,
            [componentName]: !prev[componentName]
        }));
    };

    const value = {
        loading, setLoading,
        visibleComponents, setVisibleComponents,
        colorScheme, setColorScheme,
        newDataFetched, setNewDataFetched,
        newForenseDataFetched, setNewForenseDataFetched,
        toggleComponent,
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI debe usarse dentro de un UIProvider');
    }
    return context;
};

export default UIContext;
