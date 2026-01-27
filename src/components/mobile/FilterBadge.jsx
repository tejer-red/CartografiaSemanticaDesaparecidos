import React from 'react';
import { useData } from '../../context/DataContext';

/**
 * FilterBadge - Badge que muestra número de filtros activos
 * 
 * LÓGICA DE CONTEO:
 * - +1 si no todos los sexos están seleccionados
 * - +1 si no todas las condiciones están seleccionadas
 * - +1 si el rango de edad no es [0, 100]
 * - +1 si el rango de score no es [0.5, 20]
 * 
 * @returns Badge circular con número o null si no hay filtros
 */
const FilterBadge = () => {
    const {
        selectedSexo,
        selectedCondicion,
        edadRange,
        sumScoreRange,
    } = useData();

    // Contar filtros activos
    let count = 0;

    // Sexo: default es ['HOMBRE', 'MUJER']
    if (selectedSexo.length !== 2) count++;

    // Condición: default es ['CON VIDA', 'SIN VIDA', 'NO APLICA']
    if (selectedCondicion.length !== 3) count++;

    // Edad: default es [0, 100]
    if (edadRange[0] !== 0 || edadRange[1] !== 100) count++;

    // Score: default es [0.5, 20]
    if (sumScoreRange[0] !== 0.5 || sumScoreRange[1] !== 20) count++;

    if (count === 0) return null;

    return (
        <span
            className="filter-badge"
            style={{
                position: 'absolute',
                top: -6,
                right: -6,
                backgroundColor: '#ef4444',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                minWidth: '1.2rem',
                height: '1.2rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
        >
            {count}
        </span>
    );
};

export default FilterBadge;
