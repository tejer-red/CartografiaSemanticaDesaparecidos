import getFilteredFeatures from '../context/FilteredFeatures';

export const AGE_RANGES = [
  { min: 0, max: 15, label: '0-15' },
  { min: 16, max: 30, label: '16-30' },
  { min: 31, max: 45, label: '31-45' },
  { min: 46, max: 60, label: '46-60' },
  { min: 61, max: 100, label: '61+' }
];

export const AGE_COLORS = {
  '0-15': '#8884d8',
  '16-30': '#82ca9d',
  '31-45': '#ffc658',
  '46-60': '#ff7300',
  '61+': '#d84848'
};

export function calculateStats({
  map,
  selectedDate,
  daysRange,
  selectedSexo,
  selectedCondicion,
  edadRange,
  sumScoreRange
}) {
  const features = getFilteredFeatures(
    map,
    selectedDate,
    daysRange,
    selectedSexo,
    selectedCondicion,
    edadRange,
    sumScoreRange
  ).filter(feature => feature.properties.tipo_marcador === 'cedula_busqueda');

  if (!features || !features.length) return null;

  const stats = {
    total: features.length,
    bySexo: {},
    byCondicion: {},
    ageStats: {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      distribution: AGE_RANGES.reduce((acc, range) => ({
        ...acc,
        [range.label]: 0
      }), {}),
      bySexo: {
        HOMBRE: AGE_RANGES.reduce((acc, range) => ({
          ...acc,
          [range.label]: 0
        }), {}),
        MUJER: AGE_RANGES.reduce((acc, range) => ({
          ...acc,
          [range.label]: 0
        }), {})
      }
    },
    scoreStats: {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      distribution: { '0-5': 0, '6-10': 0, '11-15': 0, '16+': 0 }
    },
    timeRange: {
      start: selectedDate,
      end: new Date(selectedDate.getTime() + (daysRange * 24 * 60 * 60 * 1000))
    },
    violenceStats: {
      total: 0,
      terms: new Map(),
      casesWithTerms: 0,
      bySexo: {
        MUJER: { count: 0, score: 0 },
        HOMBRE: { count: 0, score: 0 }
      },
      byCondicion: {
        'CON VIDA': { count: 0, score: 0 },
        'SIN VIDA': { count: 0, score: 0 },
        'NO APLICA': { count: 0, score: 0 }
      }
    }
  };

  features.forEach(feature => {
    const { properties } = feature;
    const {
      sexo,
      condicion_localizacion,
      edad_momento_desaparicion,
      sum_score
    } = properties;

    stats.bySexo[sexo] = (stats.bySexo[sexo] || 0) + 1;
    stats.byCondicion[condicion_localizacion] = (stats.byCondicion[condicion_localizacion] || 0) + 1;

    const age = Number(edad_momento_desaparicion);
    stats.ageStats.min = Math.min(stats.ageStats.min, age);
    stats.ageStats.max = Math.max(stats.ageStats.max, age);
    stats.ageStats.avg += age;

    const ageRange = AGE_RANGES.find(range => age >= range.min && age <= range.max);
    if (ageRange) {
      stats.ageStats.distribution[ageRange.label]++;
      if (sexo) {
        stats.ageStats.bySexo[sexo][ageRange.label]++;
      }
    }

    const score = Number(sum_score);
    stats.scoreStats.min = Math.min(stats.scoreStats.min, score);
    stats.scoreStats.max = Math.max(stats.scoreStats.max, score);
    stats.scoreStats.avg += score;

    if (score <= 5) stats.scoreStats.distribution['0-5']++;
    else if (score <= 10) stats.scoreStats.distribution['6-10']++;
    else if (score <= 15) stats.scoreStats.distribution['11-15']++;
    else stats.scoreStats.distribution['16+']++;

    // Violence terms analysis
    const terms = (properties.violence_terms || "").split(", ").filter(Boolean);
    if (terms.length > 0) {
      stats.violenceStats.casesWithTerms++;
      terms.forEach(term => {
        stats.violenceStats.terms.set(
          term,
          (stats.violenceStats.terms.get(term) || 0) + 1
        );
      });
    }

    if (properties.violence_score) {
      const score = parseFloat(properties.violence_score);
      stats.violenceStats.total++;

      // By gender
      if (properties.sexo) {
        stats.violenceStats.bySexo[properties.sexo].count++;
        stats.violenceStats.bySexo[properties.sexo].score += score;
      }

      // By status
      if (properties.condicion_localizacion) {
        stats.violenceStats.byCondicion[properties.condicion_localizacion].count++;
        stats.violenceStats.byCondicion[properties.condicion_localizacion].score += score;
      }
    }
  });

  stats.ageStats.avg = Number((stats.ageStats.avg / features.length).toFixed(1));
  stats.scoreStats.avg = Number((stats.scoreStats.avg / features.length).toFixed(1));

  // Calculate averages
  Object.keys(stats.violenceStats.bySexo).forEach(key => {
    const category = stats.violenceStats.bySexo[key];
    if (category.count > 0) {
      category.avgScore = category.score / category.count;
    }
  });

  Object.keys(stats.violenceStats.byCondicion).forEach(key => {
    const category = stats.violenceStats.byCondicion[key];
    if (category.count > 0) {
      category.avgScore = category.score / category.count;
    }
  });

  return stats;
}

export function prepareChartData(stats, COLORS) {
  return {
    ageData: Object.entries(stats.ageStats.distribution)
      .map(([name, value]) => ({ name, value })),
    genderData: Object.entries(stats.bySexo)
      .map(([name, value]) => ({ name, value })),
    violenceTermsData: [...stats.violenceStats.terms.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([term, count]) => ({ name: term, count })),
    statusData: Object.entries(stats.byCondicion)
      .map(([name, value]) => ({ name, value })),
    ageBySexoData: {
      HOMBRE: Object.entries(stats.ageStats.bySexo.HOMBRE)
        .map(([name, value]) => ({ name, value })),
      MUJER: Object.entries(stats.ageStats.bySexo.MUJER)
        .map(([name, value]) => ({ name, value }))
    },
    AGE_COLORS
  };
}
