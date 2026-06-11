import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '../context/DataContext';

const SexoTimeGraph = () => {
  const { map, COLORS } = useData();
  const [timeScale, setTimeScale] = useState('daily');

  const processedData = useMemo(() => {
    if (!map) return [];

    const aggregateData = new Map();
    
    // Get features from map layers
    const layers = map.getStyle().layers;
    const features = layers
      .filter(layer => layer.type === 'circle')
      .flatMap(layer => {
        const source = map.getSource(layer.source);
        return source?._data?.features || [];
      });

    console.log('Map Features:', features);

    features.forEach(feature => {
      const timestamp = feature.properties?.timestamp;
      const sexo = feature.properties?.sexo;
      if (!timestamp || !sexo) return;

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
          HOMBRE: 0,
          MUJER: 0,
          hombreIds: [],
          mujerIds: []
        });
      }
      
      const entry = aggregateData.get(key);
      if (sexo === 'HOMBRE' || sexo === 'MUJER') {
        entry[sexo]++;
        const ids = sexo === 'HOMBRE' ? 'hombreIds' : 'mujerIds';
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
          <p>Men: {data.HOMBRE} cases</p>
          <p>Women: {data.MUJER} cases</p>
          <div style={{ fontSize: '12px' }}>
            <p>Men IDs:</p>
            <ul>{data.hombreIds.map(id => <li key={id}>{id}</li>)}</ul>
            <p>Women IDs:</p>
            <ul>{data.mujerIds.map(id => <li key={id}>{id}</li>)}</ul>
          </div>
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
            dataKey="HOMBRE"
            name="Men"
            stroke={COLORS.HOMBRE.opacity100}
            dot={true}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="MUJER"
            name="Women"
            stroke={COLORS.MUJER.opacity100}
            dot={true}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SexoTimeGraph;