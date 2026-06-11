import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  useLayoutFormHandlers,
  useLayoutFormEffects,
  getEffectiveMapType,
  getEffectiveColorScheme
} from '../../utils/layoutForm';
import { Circle, Thermometer, Venus, MapPin } from 'lucide-react'; // Replace FontAwesome with Lucide

const LayoutForm = () => {
  const [localMapType, setLocalMapType] = useState('point');
  const [localColorScheme, setLocalColorScheme] = useState('sexo');
  const dataContext = useData();

  // Handlers and effects from utils
  const {
    handleMapTypeChange,
    handleColorSchemeChange
  } = useLayoutFormHandlers(dataContext, setLocalMapType, setLocalColorScheme);

  useLayoutFormEffects(dataContext);

  // Use helpers to get effective values
  const effectiveMapType = getEffectiveMapType(dataContext, localMapType);
  const effectiveColorScheme = getEffectiveColorScheme(dataContext, localColorScheme);

  return (
    <div>
      <fieldset>
        <legend style={{ cursor: 'pointer' }}>Tipo de visualización</legend>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label
            htmlFor="mapTypeSwitch"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            <Circle style={{ color: effectiveMapType === 'point' ? 'blue' : '#ccc' }} /> Puntos
          </label>
          <button
            id="mapTypeSwitch"
            type="button"
            role="switch"
            aria-checked={effectiveMapType === 'heatmap'}
            onClick={() => handleMapTypeChange({ target: { value: effectiveMapType === 'heatmap' ? 'point' : 'heatmap' } })}
            style={{
              width: '50px',
              height: '25px',
              backgroundColor: effectiveMapType === 'heatmap' ? 'red' : 'blue',
              borderRadius: '9999px',
              position: 'relative',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: effectiveMapType === 'heatmap' ? 'flex-end' : 'flex-start',
              padding: '2px',
            }}
          >
            <div
              style={{
                width: '21px',
                height: '21px',
                backgroundColor: 'white',
                borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
          <label
            htmlFor="mapTypeSwitch"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            <Thermometer style={{ color: effectiveMapType === 'heatmap' ? 'red' : '#ccc' }} /> Heatmap
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend style={{ cursor: 'pointer' }}>Esquema de color</legend>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label
            htmlFor="colorSchemeSwitch"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            <Venus style={{ color: effectiveColorScheme === 'sexo' ? 'pink' : '#ccc' }} /> Sexo
          </label>
          <button
            id="colorSchemeSwitch"
            type="button"
            role="switch"
            aria-checked={effectiveColorScheme === 'condicionLocalizacion'}
            onClick={() =>
              handleColorSchemeChange({ target: { value: effectiveColorScheme === 'condicionLocalizacion' ? 'sexo' : 'condicionLocalizacion' } })
            }
            style={{
              width: '50px',
              height: '25px',
              backgroundColor: effectiveColorScheme === 'condicionLocalizacion' ? 'green' : 'pink',
              borderRadius: '9999px',
              position: 'relative',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: effectiveColorScheme === 'condicionLocalizacion' ? 'flex-end' : 'flex-start',
              padding: '2px',
            }}
          >
            <div
              style={{
                width: '21px',
                height: '21px',
                backgroundColor: 'white',
                borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
          <label
            htmlFor="colorSchemeSwitch"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
            }}
          >
            <MapPin style={{ color: effectiveColorScheme === 'condicionLocalizacion' ? 'green' : '#ccc' }} /> Condición de Localización
          </label>
        </div>
      </fieldset>
    </div>
  );
};

export default LayoutForm;