import { useState, useEffect } from 'react';

/**
 * useIsMobile - Hook para detectar viewport móvil
 * 
 * PROCESO:
 * 1. Verifica el ancho de ventana al montar
 * 2. Escucha eventos de resize
 * 3. Retorna true si width < breakpoint
 * 
 * @param {number} breakpoint - Ancho máximo para considerar mobile (default 768px)
 * @returns {boolean} true si es mobile
 */
export const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        // Listener con debounce implícito usando requestAnimationFrame
        let rafId;
        const debouncedResize = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(handleResize);
        };

        window.addEventListener('resize', debouncedResize);

        // Verificar al montar
        handleResize();

        return () => {
            window.removeEventListener('resize', debouncedResize);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [breakpoint]);

    return isMobile;
};

export default useIsMobile;
