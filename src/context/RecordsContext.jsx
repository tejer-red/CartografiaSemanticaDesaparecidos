import React, { createContext, useContext, useState } from 'react';

/**
 * RecordsContext.jsx - Contexto para datos de registros
 * 
 * PROPÓSITO:
 * Centraliza los datos obtenidos de la API:
 * - Cédulas de búsqueda (fetchedRecords)
 * - Registros forenses (forenseRecords)
 * - Registros combinados para timeline (mergedRecords)
 * 
 * FLUJO:
 * 1. FetchCedulas obtiene datos → setFetchedRecords
 * 2. FetchForense obtiene datos → setForenseRecords
 * 3. Se combinan para timeline → mergedRecords
 */

const RecordsContext = createContext();

export const RecordsProvider = ({ children }) => {
    // ============================================================
    // DATOS DE CÉDULAS (Personas desaparecidas)
    // ============================================================
    const [fetchedRecords, setFetchedRecords] = useState([]);

    // ============================================================
    // DATOS FORENSES (PFSI - Personas Fallecidas Sin Identificar)
    // ============================================================
    const [forenseRecords, setForenseRecords] = useState([]);

    // ============================================================
    // DATOS COMBINADOS PARA TIMELINE
    // ============================================================
    const [mergedRecords, setMergedRecords] = useState([]);

    // ============================================================
    // FUNCIONES DE UTILIDAD
    // ============================================================

    // Combinar cédulas y forenses para la timeline
    const mergeRecords = (cedulas, forenses) => {
        const combined = [...cedulas, ...forenses];
        setMergedRecords(combined);
        return combined;
    };

    // Limpiar todos los registros
    const clearRecords = () => {
        setFetchedRecords([]);
        setForenseRecords([]);
        setMergedRecords([]);
    };

    // Obtener conteo de registros
    const getRecordCounts = () => ({
        cedulas: fetchedRecords.length,
        forenses: forenseRecords?.features?.length || 0,
        total: fetchedRecords.length + (forenseRecords?.features?.length || 0)
    });

    const value = {
        fetchedRecords, setFetchedRecords,
        forenseRecords, setForenseRecords,
        mergedRecords, setMergedRecords,
        mergeRecords,
        clearRecords,
        getRecordCounts,
    };

    return (
        <RecordsContext.Provider value={value}>
            {children}
        </RecordsContext.Provider>
    );
};

export const useRecords = () => {
    const context = useContext(RecordsContext);
    if (!context) {
        throw new Error('useRecords debe usarse dentro de un RecordsProvider');
    }
    return context;
};

export default RecordsContext;
