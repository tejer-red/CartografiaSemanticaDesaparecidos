import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '../context/DataContext';

const CondicionTimeGraph = () => {
  const { map, COLORS } = useData();
  const [timeScale, setTimeScale] = useState('daily');

  const processedData = useMemo(() => {
    if (!map) return [];

    const aggregateData = new Map();
    
    const layers = map.getStyle().layers;
    const features = layers
      .filter(layer => layer.type === 'circle')
      .flatMap(layer => {
        const source = map.getSource(layer.source);
        return source?._data?.features || [];
      });

    features.forEach(feature => {
      const timestamp = feature.properties?.timestamp;
      const condicion = feature.properties?.condicion_localizacion;
      if (!timestamp || !condicion) return;

      const date = new Date(parseInt(timestamp));
      let key;

      switch(timeScale) {
        case 'weekly':
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          key = startOfWeek.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!aggregateData.has(key)) {
        aggregateData.set(key, {
          date: key,
          'CON VIDA': 0,
          'SIN VIDA': 0,
          'NO APLICA': 0,
          conVidaIds: [],
          sinVidaIds: [],
          noAplicaIds: []
        });
      }
      
      const entry = aggregateData.get(key);
      if (condicion === 'CON VIDA' || condicion === 'SIN VIDA' || condicion === 'NO APLICA') {
        entry[condicion]++;
        const ids = condicion === 'CON VIDA' ? 'conVidaIds' : 
                   condicion === 'SIN VIDA' ? 'sinVidaIds' : 'noAplicaIds';
        if (feature.properties?.id_cedula_busqueda) {
          entry[ids].push(feature.properties.id_cedula_busqueda);
        }
      }
    });

    return Array.from(aggregateData.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [map, timeScale]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px',
          border: '1px solid #ccc',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <p><strong>{formatDateLabel(label)}</strong></p>
          <p>Found Alive: {data['CON VIDA']} cases</p>
          <p>Found Deceased: {data['SIN VIDA']} cases</p>
          <p>Not Applicable: {data['NO APLICA']} cases</p>
        </div>
      );
    }
    return null;
  };

  const formatDateLabel = (date) => {
    const d = new Date(date);
    switch(timeScale) {
      case 'weekly':
        return `Week of ${d.toLocaleDateString()}`;
      case 'monthly':
        return d.toLocaleDateString('default', { month: 'short', year: 'numeric' });
      default:
        return d.toLocaleDateString();
    }
  };

  return (
    <div style={{ width: '100%', height: '200px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '15px' }}>
          <input
            type="radio"
            value="daily"
            checked={timeScale === 'daily'}
            onChange={(e) => setTimeScale(e.target.value)}
          /> Daily
        </label>
        <label style={{ marginRight: '15px' }}>
          <input
            type="radio"
            value="weekly"
            checked={timeScale === 'weekly'}
            onChange={(e) => setTimeScale(e.target.value)}
          /> Weekly
        </label>
        <label>
          <input
            type="radio"
            value="monthly"
            checked={timeScale === 'monthly'}
            onChange={(e) => setTimeScale(e.target.value)}
          /> Monthly
        </label>
      </div>

      <ResponsiveContainer>
        <LineChart
          data={processedData}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <XAxis 
            dataKey="date"
            tickFormatter={formatDateLabel}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="CON VIDA"
            name="Found Alive"
            stroke={COLORS.CON_VIDA.opacity100}
            dot={true}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="SIN VIDA"
            name="Found Deceased"
            stroke={COLORS.SIN_VIDA.opacity100}
            dot={true}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="NO APLICA"
            name="Not Applicable"
            stroke={COLORS.NO_APLICA.opacity100}
            dot={true}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CondicionTimeGraph;