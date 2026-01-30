// Este archivo contiene funciones utilitarias y componentes compartidos para el procesamiento de datos,
// cálculo de rangos de fechas, tooltips y handlers de eventos.
// Es utilizado tanto por GlobalTimeGraph.jsx como por GlobalTimeGraphData.jsx (y potencialmente otros).

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

  let processedCount = 0;
  let skippedNoTimestamp = 0;
  let skippedInvalidDate = 0;

  features.forEach((feature, idx) => {
    // Intentar obtener timestamp de properties o de la raíz del objeto
    const timestampField = feature.properties?.timestamp || feature.timestamp;

    // Manejar diferentes formatos de datos (cédulas vs forense)
    const sexo = feature.properties?.sexo || feature.sexo ||
      feature.properties?.Sexo || feature.Sexo;

    const condicion = feature.properties?.condicion_localizacion ||
      feature.condicion_localizacion ||
      feature.properties?.Condicion ||
      feature.Condicion;

    if (!timestampField) {
      skippedNoTimestamp++;
      return;
    }

    // Intentar parsear como número (timestamp en milisegundos), y si no como string
    let date;
    let isNumericTimestamp = false;
    const numericTimestamp = Number(timestampField);

    if (!isNaN(numericTimestamp) && numericTimestamp > 0) {
      // Es un timestamp numérico - crear fecha UTC
      date = new Date(numericTimestamp);
      isNumericTimestamp = true;
    } else {
      // Intentar parsear como string
      date = new Date(timestampField);
    }

    if (isNaN(date.getTime())) {
      skippedInvalidDate++;
      return;
    }

    let key;

    // Si es timestamp numérico, usar métodos UTC para evitar problemas de zona horaria
    if (isNumericTimestamp) {
      switch (timeScale) {
        case 'weekly': {
          const startOfWeek = new Date(Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate() - date.getUTCDay()
          ));
          key = formatDateLocal(startOfWeek);
          break;
        }
        case 'monthly':
          key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
          break;
        case 'bi-weekly': {
          const day = date.getUTCDate();
          const startOfBiWeek = new Date(Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            day <= 15 ? 1 : 16
          ));
          key = formatDateLocal(startOfBiWeek);
          break;
        }
        case 'yearly':
          key = `${date.getUTCFullYear()}-01-01`;
          break;
        case 'daily':
        default:
          key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      }
    } else {
      // Para fechas parseadas de strings, usar hora local
      switch (timeScale) {
        case 'weekly': {
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          key = formatDateLocal(startOfWeek);
          break;
        }
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        case 'bi-weekly': {
          const startOfBiWeek = new Date(date);
          const day = date.getDate();
          startOfBiWeek.setDate(day <= 15 ? 1 : 16);
          key = formatDateLocal(startOfBiWeek);
          break;
        }
        case 'yearly':
          key = `${date.getFullYear()}-01-01`;
          break;
        case 'daily':
        default:
          key = formatDateLocal(date);
      }
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
      processedCount++;
    }

    const normalizedCondicion = condicion?.toString().trim().toUpperCase();
    const conditionKeys = ['CON VIDA', 'SIN VIDA', 'NO APLICA'];
    if (conditionKeys.includes(normalizedCondicion)) {
      entry[normalizedCondicion]++;
    }

    // Log first few entries for debugging
    if (idx < 3) {
      console.log(`processMapData feature[${idx}]:`, {
        timestamp: timestampField,
        date: date.toISOString(),
        key,
        sexo: normalizedSexo,
        condicion: normalizedCondicion,
        entry,
        allProps: feature.properties || feature
      });
    }
  });

  console.log('processMapData summary:', {
    totalFeatures: features.length,
    processedCount,
    skippedNoTimestamp,
    skippedInvalidDate,
    aggregatedKeys: aggregateData.size,
    keys: Array.from(aggregateData.keys())
  });

  return Array.from(aggregateData.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function calculateDateRange(selectedDate, timeScale, processedData = []) {
  if (!selectedDate) return { start: '', end: '', daysRange: 0 };

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

  const startStr = formatDateLocal(startDate);
  const endStr = formatDateLocal(endDate);

  // Si tenemos datos procesados, encontrar coordenadas válidas para ReferenceArea
  // x1 = punto seleccionado, x2 = siguiente punto (para crear área visible)
  let actualStart = startStr;
  let actualEnd = endStr;

  if (processedData && processedData.length > 0) {
    // Encontrar el índice del punto seleccionado o el más cercano
    const startIndex = processedData.findIndex(d => d.date >= startStr);

    if (startIndex !== -1) {
      // x1 es el punto encontrado
      actualStart = processedData[startIndex].date;

      // x2 es el siguiente punto de datos (para crear un área visible)
      if (startIndex < processedData.length - 1) {
        actualEnd = processedData[startIndex + 1].date;
      } else {
        // Si es el último punto, usar el mismo (no habrá área visible)
        actualEnd = processedData[startIndex].date;
      }
    }
  }

  return {
    start: actualStart,
    end: actualEnd,
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