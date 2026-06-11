import { useState } from 'react';
import { useData } from '../context/DataContext';
import { calculateStats, prepareChartData } from '../utils/filteredStats';
import {
  BarChart, Bar, PieChart, Pie,
  Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend
} from 'recharts';

const TERM_COLOR = '#8884d8';

const FilteredStats = () => {
  const [isOpen, setIsOpen] = useState(true);
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
    <div className="current-state">
      <div className="current-state__header" onClick={() => setIsOpen(!isOpen)}>
        <h3>Selección Actual</h3>
      </div>

      {isOpen && (
        <div className="stats-grid">
          <div className="chart-box">
            <h4>Distribución por Edad</h4>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={ageData}>
                <XAxis dataKey="name" />
                <YAxis />
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
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={ageBySexoData.HOMBRE}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {ageBySexoData.HOMBRE.map((entry) => (
                    <Cell key={entry.name} fill={COLORS.HOMBRE.opacity100} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={ageBySexoData.MUJER}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {ageBySexoData.MUJER.map((entry) => (
                    <Cell key={entry.name} fill={COLORS.MUJER.opacity100} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Legend />
          </div>

          <div className="chart-box" style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: '50%' }}>
              <h4>Distribución por Sexo</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
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
            <div style={{ width: '50%' }}>
              <h4>Distribución por Estatus</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
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
            <h4>Términos (Top 15)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violenceTermsData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={0} />
                <Tooltip />
                <Bar dataKey="count" fill={TERM_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilteredStats;
