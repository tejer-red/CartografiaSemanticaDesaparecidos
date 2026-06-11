import React from 'react';
import { useData } from '../../context/DataContext';
import { 
  useFilterFormHandlers
} from '../../utils/filterForm';
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
import '../../styles/FilterForm.css';

// Pure React/HTML5 Dual Range Slider Component
const DualRangeSlider = ({ min, max, step, value, onChange }) => {
  const [minVal, maxVal] = value;
  
  const handleMinChange = (e) => {
    const val = Math.min(Number(e.target.value), maxVal - step);
    onChange([val, maxVal]);
  };
  
  const handleMaxChange = (e) => {
    const val = Math.max(Number(e.target.value), minVal + step);
    onChange([minVal, val]);
  };

  const minPercent = ((minVal - min) / (max - min)) * 100;
  const maxPercent = ((maxVal - min) / (max - min)) * 100;

  return (
    <div style={{ position: 'relative', width: '100%', height: '20px', margin: '10px 0' }}>
      {/* Track Background */}
      <div 
        style={{ 
          position: 'absolute', 
          left: 0, 
          right: 0, 
          top: '8px', 
          height: '4px', 
          backgroundColor: '#e5e5e5', 
          borderRadius: '2px' 
        }} 
      />
      {/* Active Range */}
      <div 
        style={{ 
          position: 'absolute', 
          left: `${minPercent}%`, 
          right: `${100 - maxPercent}%`, 
          top: '8px', 
          height: '4px', 
          backgroundColor: '#666', 
          borderRadius: '2px' 
        }} 
      />
      
      {/* Min Range Input */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minVal}
        onChange={handleMinChange}
        style={{
          position: 'absolute',
          width: '100%',
          height: '0',
          top: '8px',
          outline: 'none',
          background: 'none',
          pointerEvents: 'none',
          WebkitAppearance: 'none',
          margin: 0
        }}
        className="dual-slider-input"
      />
      {/* Max Range Input */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxVal}
        onChange={handleMaxChange}
        style={{
          position: 'absolute',
          width: '100%',
          height: '0',
          top: '8px',
          outline: 'none',
          background: 'none',
          pointerEvents: 'none',
          WebkitAppearance: 'none',
          margin: 0
        }}
        className="dual-slider-input"
      />
    </div>
  );
};

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
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            value="noticia"
            checked={selectedMarkerTypes.includes("noticia")}
            onChange={handleMarkerTypeChange}
          />
          Reporte de Prensa
        </label>
      </fieldset>

      {/* Filtros de Edad */}
      <fieldset>
        <legend style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="#666666" />
          Edad de Desaparición
        </legend>
        <div style={{ width: "100%" }}>
          <DualRangeSlider
            min={0}
            max={100}
            step={1}
            value={[edadRange[0], edadRange[1]]}
            onChange={handleEdadRangeChange}
          />
          <div className="rangeLegend">
            <span>
              Rango de edad: {edadRange[0]} - {edadRange[1]} años
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
          <DualRangeSlider
            min={0.5}
            max={20}
            step={0.5}
            value={[sumScoreRange[0], sumScoreRange[1]]}
            onChange={handleSumScoreRangeChange}
          />
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