// Este archivo contiene funciones utilitarias y componentes compartidos para el procesamiento de datos,
// cálculo de rangos de fechas, tooltips y handlers de eventos.
// Es utilizado tanto por GlobalTimeGraph.jsx como por GlobalTimeGraphData.jsx (y potencialmente otros).

export function processMapData(fetchedRecords, forenseRecords, timeScale) {
  console.log('processMapData start:', {
    type: typeof fetchedRecords,
    isArray: Array.isArray(fetchedRecords),
    keys: fetchedRecords ? Object.keys(fetchedRecords) : [],
    hasFeatures: !!fetchedRecords?.features
  });
  const aggregateData = new Map();

  // Extraer features de forma segura (pueden ser GeoJSON o arrays)
  const cedulaFeatures = fetchedRecords?.features || (Array.isArray(fetchedRecords) ? fetchedRecords : []);
  const forenseFeatures = forenseRecords?.features || (Array.isArray(forenseRecords) ? forenseRecords : []);
  const features = [...cedulaFeatures, ...forenseFeatures];

  if (features.length === 0) {
    console.log('processMapData: features is empty');
    return [];
  }

  console.log('processMapData: first feature properties:', features[0]?.properties);

  features.slice(0, 3).forEach((f, i) => {
    console.log(`processMapData feature[${i}] timestamp:`, f.properties?.timestamp || f.timestamp);
  });

  features.forEach(feature => {
    // Intentar obtener timestamp de properties o de la raíz del objeto
    const timestampField = feature.properties?.timestamp || feature.timestamp;
    const sexo = feature.properties?.sexo || feature.sexo;
    const condicion = feature.properties?.condicion_localizacion || feature.condicion_localizacion;

    if (!timestampField) return;

    // Intentar parsear como número, y si no como string
    let date = new Date(Number(timestampField));
    if (isNaN(date.getTime())) {
      date = new Date(timestampField);
    }

    if (isNaN(date.getTime())) return;

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
        const day = date.getDate();
        startOfBiWeek.setDate(day <= 15 ? 1 : 16);
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

    const normalizedSexo = sexo?.toString().trim().toUpperCase();
    if (normalizedSexo === 'HOMBRE' || normalizedSexo === 'MUJER') {
      entry[normalizedSexo]++;
    }

    const normalizedCondicion = condicion?.toString().trim().toUpperCase();
    const conditionKeys = ['CON VIDA', 'SIN VIDA', 'NO APLICA'];
    if (conditionKeys.includes(normalizedCondicion)) {
      entry[normalizedCondicion]++;
    }
  });

  return Array.from(aggregateData.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function calculateDateRange(selectedDate, timeScale) {
  if (!selectedDate) return { start: '', end: '' };

  const startDate = new Date(selectedDate);
  const endDate = new Date(selectedDate);
  let daysRange = 30; // Default

  switch (timeScale) {
    case 'weekly':
      daysRange = 7;
      startDate.setDate(startDate.getDate() - startDate.getDay());
      endDate.setDate(startDate.getDate() + 6);
      break;
    case 'bi-weekly':
      daysRange = 14;
      if (startDate.getDate() <= 15) {
        startDate.setDate(1);
        endDate.setDate(15);
      } else {
        startDate.setDate(16);
        endDate.setMonth(endDate.getMonth() + 1, 0);
      }
      break;
    case 'monthly':
      daysRange = 30;
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1, 0);
      break;
    case 'yearly':
      daysRange = 365;
      startDate.setMonth(0, 1);
      endDate.setMonth(11, 31);
      break;
    case 'daily':
    default:
      daysRange = 1;
      endDate.setDate(startDate.getDate());
      break;
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
    daysRange
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
        <p>Hombre: {data.HOMBRE}</p>
        <p>Mujer: {data.MUJER}</p>
        <p>Con vida: {data['CON VIDA']}</p>
        <p>Sin vida: {data['SIN VIDA']}</p>
        <p>Desaparecidos: {data['NO APLICA']}</p>
      </div>
    );
  }
  return null;
}

export function handleTimeScaleChange(e, setTimeScale) {
  setTimeScale(e.target.value);
}

export function handleDateClick(e, setSelectedDate, setDaysRange, timeScale) {
  if (e && e.activeLabel) {
    const clickedDate = new Date(e.activeLabel);
    const { daysRange } = calculateDateRange(clickedDate, timeScale);
    setSelectedDate(clickedDate);
    setDaysRange(daysRange);
  }
}