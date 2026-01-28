import React, { createContext, useContext, useState } from 'react';
import maplibregl from 'maplibre-gl';

/**
 * MapContext.jsx - Contexto para estado del mapa y sus layers
 * 
 * PROPÓSITO:
 * Centraliza todo lo relacionado con MapLibre GL:
 * - Instancia del mapa
 * - Layers de marcadores (cédulas, forenses)
 * - Estado de carga del mapa
 * - Tipo de visualización (puntos, heatmap)
 * - Tooltips y popups
 * 
 * ESTADOS:
 * - map: Instancia de MapLibre GL
 * - cedulaLayer, forenseLayer: Referencias a layers
 * - mapLoaded: Flag de mapa listo
 * - mapType: 'point' | 'heatmap' | 'cluster'
 * - activeHeatmapCategories: Categorías visibles en heatmap
 */

const MapContext = createContext();

export const MapProvider = ({ children }) => {
    // ============================================================
    // ESTADO DEL MAPA
    // ============================================================
    const [map, setMap] = useState(null);
    const [cedulaLayer, setCedulaLayer] = useState(null);
    const [forenseLayer, setForenseLayer] = useState(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapType, setMapType] = useState('point');
    const [activeHeatmapCategories, setActiveHeatmapCategories] = useState([]);

    // ============================================================
    // CONSTANTES DE COLORES
    // ============================================================
    const COLORS = Object.fromEntries(
        ["MUJER", "HOMBRE", "CON_VIDA", "SIN_VIDA", "NO_APLICA", "UNKNOWN"].map((key) => {
            const fullColor = {
                MUJER: "rgba(255, 105, 180, 1)",
                HOMBRE: "rgba(30, 144, 255, 1)",
                CON_VIDA: "rgba(0, 128, 0, 1)",
                SIN_VIDA: "rgba(0, 0, 0, 1)",
                NO_APLICA: "rgba(255, 0, 0, 1)",
                UNKNOWN: "rgba(128, 128, 128, 1)"
            }[key];

            return [
                key,
                Object.assign(new String(fullColor), {
                    opacity100: fullColor,
                    opacity30: fullColor.replace(/[^,]+(?=\))/, "0.3"),
                }),
            ];
        })
    );

    const POINT_RADIUS = 30;

    // ============================================================
    // FUNCIONES DE TOOLTIPS
    // ============================================================
    const addTooltip = (layerId) => {
        if (!map || !map.getLayer(layerId)) {
            console.error('Map not initialized or layer not found');
            return;
        }

        const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'custom-popup',
            maxWidth: '400px',
            offset: [0, 200]
        });

        const generatePopupContent = (properties) => {
            return `
        <div>
          ${properties.ruta_foto ? `<p style="text-align:center;"><img src="${properties.ruta_foto}" alt="Foto" style="max-width: 128px; height: auto;"></p>` : ''}
          ${properties.nombre_completo ? `<p>Nombre: ${properties.nombre_completo}</p>` : '<p>Sin nombre especificado</p>'}
          ${properties.fecha_desaparicion ? `<p>Fecha desaparición: ${properties.fecha_desaparicion}</p>` : '<p>Fecha desconocida</p>'}
          ${properties.sexo ? `<p>Sexo: ${properties.sexo}</p>` : '<p>Sexo no especificado</p>'}
          ${properties.edad_momento_desaparicion ? `<p>Edad al momento desaparecer: ${properties.edad_momento_desaparicion}</p>` : '<p>Edad desconocida</p>'}
          ${properties.condicion_localizacion ? `<p>Condición localización: ${properties.condicion_localizacion}</p>` : '<p>Condición no especificada</p>'}
          ${properties.descripcion_desaparicion ? `<p>Descripción desaparición: ${properties.descripcion_desaparicion}</p>` : '<p>Sin descripción disponible</p>'}
        </div>
      `;
        };

        map.on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = '';
        });

        map.on('click', layerId, (e) => {
            if (!e.features || e.features.length === 0) return;

            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates.slice();
            const properties = feature.properties;

            const newCenter = [
                coordinates[0],
                coordinates[1] - (1 / Math.pow(2, map.getZoom() - 1))
            ];

            map.easeTo({
                center: newCenter,
                duration: 500,
                essential: true
            });

            popup
                .setLngLat(coordinates)
                .setHTML(generatePopupContent(properties))
                .addTo(map);

            // Agregar botón de cerrar en móvil después de crear el popup
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    const popupContent = popup.getElement()?.querySelector('.maplibregl-popup-content');
                    if (popupContent && !popupContent.querySelector('.mobile-close-button')) {
                        const closeButton = document.createElement('div');
                        closeButton.className = 'mobile-close-button';
                        closeButton.innerHTML = '<button>Cerrar</button>';
                        closeButton.querySelector('button').addEventListener('click', () => {
                            popup.remove();
                        });
                        popupContent.appendChild(closeButton);
                    }
                }, 10);
            }
        });

        map.on('click', (e) => {
            if (!map.queryRenderedFeatures(e.point, { layers: [layerId] }).length) {
                popup.remove();
            }
        });
    };

    const value = {
        map, setMap,
        cedulaLayer, setCedulaLayer,
        forenseLayer, setForenseLayer,
        mapLoaded, setMapLoaded,
        mapType, setMapType,
        activeHeatmapCategories, setActiveHeatmapCategories,
        COLORS,
        POINT_RADIUS,
        addTooltip,
    };

    return (
        <MapContext.Provider value={value}>
            {children}
        </MapContext.Provider>
    );
};

export const useMap = () => {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error('useMap debe usarse dentro de un MapProvider');
    }
    return context;
};

export default MapContext;
