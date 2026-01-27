import React, { createContext, useContext, useState } from 'react';

/**
 * FiltersContext.jsx - Contexto para filtros de búsqueda
 * 
 * PROPÓSITO:
 * Centraliza todos los filtros que afectan los datos visualizados:
 * - Filtros de sexo
 * - Filtros de condición de localización
 * - Rango de edad
 * - Rango de score de relevancia
 * 
 * NOTA: Estos filtros se aplican tanto al mapa como a los gráficos.
 */

const FiltersContext = createContext();

export const FiltersProvider = ({ children }) => {
    // ============================================================
    // FILTROS DE ATRIBUTOS
    // ============================================================

    // Filtro de sexo: HOMBRE, MUJER
    const [selectedSexo, setSelectedSexo] = useState(['HOMBRE', 'MUJER']);

    // Filtro de condición: CON VIDA, SIN VIDA, NO APLICA
    const [selectedCondicion, setSelectedCondicion] = useState(['CON VIDA', 'SIN VIDA', 'NO APLICA']);

    // Rango de edad [min, max] en años
    const [edadRange, setEdadRange] = useState([0, 100]);

    // Rango de score de relevancia [min, max]
    // Mayor score = mayor cantidad de términos de violencia detectados
    const [sumScoreRange, setSumScoreRange] = useState([0.5, 20]);

    // ============================================================
    // FUNCIONES DE UTILIDAD
    // ============================================================

    // Resetear todos los filtros a valores por defecto
    const resetFilters = () => {
        setSelectedSexo(['HOMBRE', 'MUJER']);
        setSelectedCondicion(['CON VIDA', 'SIN VIDA', 'NO APLICA']);
        setEdadRange([0, 100]);
        setSumScoreRange([0.5, 20]);
    };

    // Verificar si hay algún filtro activo (diferente del default)
    const hasActiveFilters = () => {
        return (
            selectedSexo.length !== 2 ||
            selectedCondicion.length !== 3 ||
            edadRange[0] !== 0 ||
            edadRange[1] !== 100 ||
            sumScoreRange[0] !== 0.5 ||
            sumScoreRange[1] !== 20
        );
    };

    const value = {
        selectedSexo, setSelectedSexo,
        selectedCondicion, setSelectedCondicion,
        edadRange, setEdadRange,
        sumScoreRange, setSumScoreRange,
        // Alias para compatibilidad hacia atrás
        setsumScoreRange: setSumScoreRange,
        resetFilters,
        hasActiveFilters,
    };

    return (
        <FiltersContext.Provider value={value}>
            {children}
        </FiltersContext.Provider>
    );
};

export const useFilters = () => {
    const context = useContext(FiltersContext);
    if (!context) {
        throw new Error('useFilters debe usarse dentro de un FiltersProvider');
    }
    return context;
};

export default FiltersContext;
