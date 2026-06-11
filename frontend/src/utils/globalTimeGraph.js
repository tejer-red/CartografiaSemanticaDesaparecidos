export function processMapData(map, timeScale) {
  if (!map) return [];
  const aggregateData = new Map();
  const layers = map.getStyle().layers || [];
  const features = layers
    .filter(layer => layer.type === 'circle')
    .flatMap(layer => {
      const source = map.getSource(layer.source);
      return source?._data?.features || [];
    });

  if (features.length === 0) {
    return [];
  }

  features.forEach(feature => {
    const timestamp = feature.properties?.timestamp;
    const sexo = feature.properties?.sexo;
    const condicion = feature.properties?.condicion_localizacion;
    if (!timestamp) return;

    const date = new Date(parseInt(timestamp));
    let key;

    switch (timeScale) {
      case 'weekly': {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
        break;
      }
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'bi-weekly': {
        const startOfBiWeek = new Date(date);
        startOfBiWeek.setDate(date.getDate() - date.getDay());
        const daysIntoBiWeek = Math.floor((startOfBiWeek.getDate() - 1) / 14) * 14;
        startOfBiWeek.setDate(1 + daysIntoBiWeek);
        key = startOfBiWeek.toISOString().split('T')[0];
        break;
      }
      case 'yearly':
        key = `${date.getFullYear()}-01-01`;
        break;
      case 'daily':
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!aggregateData.has(key)) {
      aggregateData.set(key, {
        date: key,
        HOMBRE: 0,
        MUJER: 0,
        'CON VIDA': 0,
        'SIN VIDA': 0,
        'NO APLICA': 0,
      });
    }

    const entry = aggregateData.get(key);
    if (sexo === 'HOMBRE' || sexo === 'MUJER') {
      entry[sexo]++;
    }
    if (condicion === 'CON VIDA' || condicion === 'SIN VIDA' || condicion === 'NO APLICA') {
      entry[condicion]++;
    }
  });

  return Array.from(aggregateData.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function calculateDateRange(selectedDate, timeScale) {
  if (!selectedDate) return { start: '', end: '' };

  const startDate = new Date(selectedDate);
  const endDate = new Date(selectedDate);

  switch (timeScale) {
    case 'weekly':
      startDate.setDate(startDate.getDate() - startDate.getDay());
      endDate.setDate(startDate.getDate() + 7);
      break;
    case 'bi-weekly': {
      const daysIntoBiWeek = Math.floor((startDate.getDate() - 1));
      startDate.setDate(1 + daysIntoBiWeek);
      endDate.setDate(startDate.getDate() + 14);
      break;
    }
    case 'monthly':
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1, 0);
      break;
    case 'yearly':
      startDate.setMonth(0, 1);
      endDate.setMonth(11, 31);
      break;
    default:
      // daily
      break;
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
}

export function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '10px',
        border: '1px solid #ccc'
      }}>
        <p><strong>{label}</strong></p>
        <p>Men: {data.HOMBRE}</p>
        <p>Women: {data.MUJER}</p>
        <p>Found Alive: {data['CON VIDA']}</p>
        <p>Found Deceased: {data['SIN VIDA']}</p>
        <p>Not Applicable: {data['NO APLICA']}</p>
      </div>
    );
  }
  return null;
}

export function handleTimeScaleChange(e, setTimeScale) {
  setTimeScale(e.target.value);
}

export function handleDateClick(e, setSelectedDate) {
  if (e && e.activeLabel) {
    const clickedDate = new Date(e.activeLabel);
    setSelectedDate(clickedDate);
  }
}
