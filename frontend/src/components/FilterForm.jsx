import React from 'react';
import { useData } from '../context/DataContext';
import {
  useFilterFormHandlers
} from '../utils/filterForm';
import { 
  UserRound, // for male
  Heart,
  Skull,
  HelpCircle,
  Users, // new - for sexo section
  Search, // new - for condición section
  Calendar, // new - for edad section
  BarChart2, // new - for score section
  MapPin
} from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import '../styles/FilterForm.css';

const FilterForm = () => {
  const dataContext = useData();
  const { COLORS } = dataContext;

  const {
    handleSexoChange,
    handleCondicionChange,
    handleMarkerTypeChange,
    handleEdadRangeChange,
    handleSumScoreRangeChange
  } = useFilterFormHandlers(dataContext);

  const {
    selectedSexo,
    selectedCondicion,
    selectedMarkerTypes,
    edadRange,
    sumScoreRange
  } = dataContext;

  return (
    <div>
      {/* Filtros de Sexo */}
      <fieldset>
        <legend style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} color="#666666" />
          Sexo
        </legend>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            value="HOMBRE"
            checked={selectedSexo.includes("HOMBRE")}
            onChange={handleSexoChange}
          />
          <UserRound size={20} color={COLORS.HOMBRE.opacity100} />
          Hombre
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            value="MUJER"
            checked={selectedSexo.includes("MUJER")}
            onChange={handleSexoChange}
          />
          <UserRound size={20} color={COLORS.MUJER.opacity100} />
          Mujer
        </label>
      </fieldset>

      {/* Filtros de Condición de Localización */}
      <fieldset>
        <legend style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={16} color="#666666" />
          Condición de Localización
        </legend>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            value="CON VIDA"
            checked={selectedCondicion.includes("CON VIDA")}
            onChange={handleCondicionChange}
          />
          <Heart
            size={20}
            color={COLORS.CON_VIDA.opacity100}
            fill={COLORS.CON_VIDA.opacity100}
          />
          Con Vida
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            value="SIN VIDA"
            checked={selectedCondicion.includes("SIN VIDA")}
            onChange={handleCondicionChange}
          />
          <Skull size={20} color={COLORS.SIN_VIDA.opacity100} />
          Sin Vida
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            value="NO APLICA"
            checked={selectedCondicion.includes("NO APLICA")}
            onChange={handleCondicionChange}
          />
          <HelpCircle size={20} color={COLORS.NO_APLICA.opacity100} />
          No Aplica
        </label>
      </fieldset>
      {/* Filtros de Tipo de Marcador */}
      <fieldset>
        <legend style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={16} color="#666666" />
          Tipo de Marcador
        </legend>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            value="cedula_busqueda"
            checked={selectedMarkerTypes.includes("cedula_busqueda")}
            onChange={handleMarkerTypeChange}
          />
          Cédula de Búsqueda
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            value="fosa"
            checked={selectedMarkerTypes.includes("fosa")}
            onChange={handleMarkerTypeChange}
          />
          Fosa Clandestina
        </label>
      </fieldset>

      {/* Filtros de Edad */}
      <fieldset>
        <legend style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="#666666" />
          Edad de Desaparición
        </legend>
        <div style={{ width: "100%" }}>
          <Slider.Root
            className="SliderRoot"
            defaultValue={[0, 100]}
            value={[edadRange[0], edadRange[1]]}
            min={0}
            max={100}
            step={1}
            minStepsBetweenThumbs={1}
            onValueChange={handleEdadRangeChange}
          >
            <Slider.Track className="SliderTrack">
              <Slider.Range className="SliderRange" />
            </Slider.Track>
            <Slider.Thumb className="SliderThumb" aria-label="Min age" />
            <Slider.Thumb className="SliderThumb" aria-label="Max age" />
          </Slider.Root>
          <div className="rangeLegend">
            <span>
              Rango de edad: {edadRange[0]} - {edadRange[1]} years
            </span>
          </div>
        </div>
      </fieldset>

      {/* Filtros de Score de Violencia */}
      <fieldset>
        <legend style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={16} color="#666666" />
          Score de Violencia
        </legend>
        <div style={{  width: "100%" }}>
          <Slider.Root
            className="SliderRoot"
            defaultValue={[0.5, 20]}
            value={[sumScoreRange[0], sumScoreRange[1]]}
            min={0.5}
            max={20}
            step={0.5}
            minStepsBetweenThumbs={1}
            onValueChange={handleSumScoreRangeChange}
          >
            <Slider.Track className="SliderTrack">
              <Slider.Range className="SliderRange" />
            </Slider.Track>
            <Slider.Thumb className="SliderThumb" aria-label="Min score" />
            <Slider.Thumb className="SliderThumb" aria-label="Max score" />
          </Slider.Root>
          <div className="rangeLegend">
            <span>
              Rango de Score: {sumScoreRange[0]} - {sumScoreRange[1]}
            </span>
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default FilterForm;