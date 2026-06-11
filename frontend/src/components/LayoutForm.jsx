import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import {
  useLayoutFormHandlers,
  useLayoutFormEffects,
  getEffectiveMapType,
  getEffectiveColorScheme
} from '../utils/layoutForm';
import { Circle, Thermometer, Venus, MapPin } from 'lucide-react'; // Replace FontAwesome with Lucide
import * as Switch from '@radix-ui/react-switch';

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
          <Switch.Root
            id="mapTypeSwitch"
            checked={effectiveMapType === 'heatmap'}
            onCheckedChange={(checked) => handleMapTypeChange({ target: { value: checked ? 'heatmap' : 'point' } })}
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
            <Switch.Thumb
              style={{
                width: '21px',
                height: '21px',
                backgroundColor: 'white',
                borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.2s',
              }}
            />
          </Switch.Root>
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
          <Switch.Root
            id="colorSchemeSwitch"
            checked={effectiveColorScheme === 'condicionLocalizacion'}
            onCheckedChange={(checked) =>
              handleColorSchemeChange({ target: { value: checked ? 'condicionLocalizacion' : 'sexo' } })
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
            <Switch.Thumb
              style={{
                width: '21px',
                height: '21px',
                backgroundColor: 'white',
                borderRadius: '50%',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.2s',
              }}
            />
          </Switch.Root>
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