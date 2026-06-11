import { useEffect } from 'react';

// Helpers para obtener valores efectivos
export function getEffectiveMapType(dataContext, localMapType) {
  return dataContext.mapType || localMapType;
}

export function getEffectiveColorScheme(dataContext, localColorScheme) {
  return dataContext.colorScheme || localColorScheme;
}

// Handlers desacoplados
export function useLayoutFormHandlers(dataContext, setLocalMapType, setLocalColorScheme) {
  const handleMapTypeChange = (e) => {
    const newValue = e.target.value;
    if (typeof dataContext.setMapType === 'function') {
      dataContext.setMapType(newValue);
    } else {
      setLocalMapType(newValue);
    }
  };

  const handleColorSchemeChange = (e) => {
    const newValue = e.target.value;
    if (typeof dataContext.setColorScheme === 'function') {
      dataContext.setColorScheme(newValue);
    } else {
      setLocalColorScheme(newValue);
    }
  };

  return { handleMapTypeChange, handleColorSchemeChange };
}

// Efectos y lógica de actualización de capa
export function useLayoutFormEffects(dataContext) {
  useEffect(() => {
    // ... Copia la lógica de updateMapLayer y useEffect aquí ...
    const {
      map,
      fetchedRecords,
      sexoLayout,
      condicionLocalizacionLayout,
      COLORS,
      setActiveHeatmapCategories,
      selectedDate,
      daysRange,
      selectedSexo,
      selectedCondicion,
      edadRange,
      sumScoreRange,
      filterMarkersByDate,
      mapType,
      colorScheme
    } = dataContext;

    function getHeatmapLayoutForCategory(category) {
      let baseColor = COLORS.UNKNOWN;
      if (category === 'HOMBRE') baseColor = COLORS.HOMBRE;
      else if (category === 'MUJER') baseColor = COLORS.MUJER;
      else if (category === 'CON VIDA') baseColor = COLORS.CON_VIDA;
      else if (category === 'SIN VIDA') baseColor = COLORS.SIN_VIDA;
      else if (category === 'NO APLICA') baseColor = COLORS.NO_APLICA;

      return {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'density'],
          0, 0,
          6, 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          9, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 0, 0)',
          0.2, baseColor.opacity30,
          0.4, baseColor.opacity30,
          1, baseColor.opacity100
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 12,
          13, 28
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          3, 0.4,
          9, 0.6,
          13, 0.8
        ]
      };
    }

    function updateMapLayer() {
      if (!map) return;

      const sourceId = 'cedulaLayer';
      const geojsonData = {
        type: 'FeatureCollection',
        features: fetchedRecords.features
      };

      if (mapType === 'point') {
        const possibleHeatmapLayerIds = [
          'cedulaLayer-HOMBRE',
          'cedulaLayer-MUJER',
          'cedulaLayer-CON VIDA',
          'cedulaLayer-SIN VIDA',
          'cedulaLayer-NO APLICA'
        ];
        possibleHeatmapLayerIds.forEach((layerId) => {
          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
          if (map.getSource(layerId)) {
            map.removeSource(layerId);
          }
        });

        if (map.getLayer(sourceId)) {
          map.getSource(sourceId).setData(geojsonData);
          const layoutConfig = colorScheme === 'sexo' ? sexoLayout : condicionLocalizacionLayout;
          Object.entries(layoutConfig).forEach(([key, value]) => {
            map.setPaintProperty(sourceId, key, value);
          });
        } else {
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: 'geojson', data: geojsonData });
          }
          const layoutConfig = colorScheme === 'sexo' ? sexoLayout : condicionLocalizacionLayout;
          map.addLayer({
            id: sourceId,
            type: 'circle',
            source: sourceId,
            paint: layoutConfig
          });
        }
        setActiveHeatmapCategories([]);
      } else if (mapType === 'heatmap') {
        if (map.getLayer(sourceId)) {
          map.removeLayer(sourceId);
        }

        let activeCategories = [];
        if (colorScheme === 'sexo') {
          activeCategories = ['HOMBRE', 'MUJER'];
        } else if (colorScheme === 'condicionLocalizacion') {
          activeCategories = ['CON VIDA', 'SIN VIDA', 'NO APLICA'];
        }

        const allHeatmapLayerIds = [
          'cedulaLayer-HOMBRE',
          'cedulaLayer-MUJER',
          'cedulaLayer-CON VIDA',
          'cedulaLayer-SIN VIDA',
          'cedulaLayer-NO APLICA'
        ];
        allHeatmapLayerIds.forEach((layerId) => {
          const parts = layerId.split('-');
          const category = parts[1];
          if (!activeCategories.includes(category)) {
            if (map.getLayer(layerId)) {
              map.removeLayer(layerId);
            }
            if (map.getSource(layerId)) {
              map.removeSource(layerId);
            }
          }
        });

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: 'geojson', data: geojsonData });
        } else {
          map.getSource(sourceId).setData(geojsonData);
        }

        activeCategories.forEach((category) => {
          const layerId = `${sourceId}-${category}`;
          let filter;
          if (category === 'HOMBRE' || category === 'MUJER') {
            filter = ['==', ['get', 'sexo'], category];
          } else {
            filter = ['==', ['get', 'condicion_localizacion'], category];
          }
          const layoutConfig = getHeatmapLayoutForCategory(category);
          if (map.getLayer(layerId)) {
            Object.entries(layoutConfig).forEach(([key, value]) => {
              map.setPaintProperty(layerId, key, value);
            });
            map.setFilter(layerId, filter);
          } else {
            map.addLayer({
              id: layerId,
              type: 'heatmap',
              source: sourceId,
              paint: layoutConfig,
              filter: filter
            });
          }
        });
        setActiveHeatmapCategories(activeCategories);
      }

      // Trigger filter update after updating the map layer
      if (selectedDate) {
        filterMarkersByDate(selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange,);
      }
    }

    updateMapLayer();
    // eslint-disable-next-line
  }, [
    dataContext.mapType,
    dataContext.colorScheme,
    dataContext.selectedSexo,
    dataContext.selectedCondicion,
    dataContext.edadRange,
    dataContext.sumScoreRange,
  ]);
}
