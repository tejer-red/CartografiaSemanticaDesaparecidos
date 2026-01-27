import { useState } from 'react';
import { useData } from '../context/DataContext';
import { calculateStats, prepareChartData } from '../utils/filteredStats';
import {
  BarChart, Bar, PieChart, Pie,
  Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import useIsMobile from '../hooks/useIsMobile';

const TERM_COLOR = '#8884d8';

const FilteredStats = () => {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();
  const {
    map,
    selectedDate,
    daysRange,
    selectedSexo,
    selectedCondicion,
    edadRange,
    sumScoreRange,
    COLORS
  } = useData();

  const stats = calculateStats({
    map,
    selectedDate,
    daysRange,
    selectedSexo,
    selectedCondicion,
    edadRange,
    sumScoreRange
  });

  if (!stats) return null;

  const { ageData, genderData, violenceTermsData, statusData, ageBySexoData, AGE_COLORS } = prepareChartData(stats, COLORS);

  return (
    <div className={`current-state ${isMobile ? 'current-state--mobile' : ''}`}>
      <div className="current-state__header" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer', padding: '10px 0', borderBottom: '1px solid #eee', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>📊 Estadísticas de la Selección</h3>
      </div>

      {isOpen && (
        <div className="stats-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="chart-box">
            <h4>Distribución por Edad</h4>
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 100}>
              <BarChart data={ageData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value">
                  {ageData.map((entry) => (
                    <Cell key={entry.name} fill={AGE_COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-box">
            <h4>Distribución por Edad y Sexo</h4>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <h5 style={{ margin: '5px 0', fontSize: '0.9em', textAlign: 'center' }}>Hombres</h5>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={ageBySexoData.HOMBRE}>
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {ageBySexoData.HOMBRE.map((entry) => (
                        <Cell key={entry.name} fill={COLORS.HOMBRE.opacity100} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                <h5 style={{ margin: '5px 0', fontSize: '0.9em', textAlign: 'center' }}>Mujeres</h5>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={ageBySexoData.MUJER}>
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {ageBySexoData.MUJER.map((entry) => (
                        <Cell key={entry.name} fill={COLORS.MUJER.opacity100} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="chart-box" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
            <div style={{ width: isMobile ? '100%' : '50%' }}>
              <h4>Distribución por Sexo</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 50 : 40}
                    outerRadius={isMobile ? 90 : 80}
                  >
                    {genderData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name].opacity100} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: isMobile ? '100%' : '50%' }}>
              <h4>Distribución por Estatus</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 50 : 40}
                    outerRadius={isMobile ? 90 : 80}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name.replace(' ', '_')].opacity100} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-box wide">
            <h4>Términos destacados</h4>
            <ResponsiveContainer width="100%" height={isMobile ? 400 : 300}>
              <BarChart data={violenceTermsData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill={TERM_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilteredStats;

