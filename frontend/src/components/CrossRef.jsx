import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import getFilteredFeatures from '../context/FilteredFeatures';

// Add these constants at the top
const MATCH_RANGES = {
  AGE: {
    MIN_DIFF: 0,
    MAX_DIFF: 5,
    WEIGHT: 0.3
  },
  SEX: {
    REQUIRED: true,
    WEIGHT: 0.7
  }
};

const INITIAL_RANGES = {
  AGE: { MIN: 0, MAX: 10, DEFAULT: 5 },
  HEIGHT: { MIN: 0, MAX: 20, DEFAULT: 5 },
  SIMILARITY: { MIN: 0.3, MAX: 1, DEFAULT: 0.5 }
};

const isInRange = (value, target, range) => {
  const diff = Math.abs(value - target);
  return diff >= range.MIN_DIFF && diff <= range.MAX_DIFF;
};

// Add helper function at top of file
const extractForenseAge = (ageString) => {
  const matches = ageString.match(/(\d+)-(\d+)/);
  if (matches) {
    const min = parseInt(matches[1]);
    const max = parseInt(matches[2]);
    return Math.floor((min + max) / 2);
  }
  return null;
};

// Add at top of file
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  // Handle YYYY-MM-DD format
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Add date validation helper
const isValidDateOrder = (cedulaDate, forenseDate) => {
  if (!cedulaDate || !forenseDate) return true; // Allow if dates missing
  const cedDate = new Date(cedulaDate);
  const forDate = new Date(forenseDate);
  return forDate >= cedDate;
};

// Name processing utilities
const normalizeString = (str) => {
  return str?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim() || '';
};

const NAME_WEIGHTS = {
  FIRST: 0.4,
  MIDDLE: 0.3,
  LAST: 0.5
};

const splitName = (fullName) => {
  const parts = normalizeString(fullName).split(/\s+/);
  return {
    all: parts,
    first: parts[0] || '',
    middle: parts.slice(1, -1).join(' '),
    last: parts[parts.length - 1] || '',
    hasMiddle: parts.length > 2
  };
};

const isValidName = (name) => {
  // Skip these patterns
  const skipPatterns = [
    /^PFSI/,
    /^BOLSA/,
    /ANATOMIC/,
    /^CRANEO/,
    /^TORSO/,
    /^CABEZA/,
    /^PROCESAMIENTO/,
    /^SEGMENTO/,
    /^PRODUCTO FETAL/,
    /^FRAGMENTOS/,
    /^LOTE/,
    /^CINCHO/,
    /^MANO/,
    /^OBITO/
  ];

  return !skipPatterns.some(pattern => pattern.test(name));
};

const extractNames = (forenseName) => {
  if (!forenseName) return [];
  
  // Split multiple names (Y/O separator)
  const aliases = forenseName.split(/\s+Y\/O\s+/);
  
  // Filter and clean names
  return aliases
    .filter(name => isValidName(name))
    .map(name => name.trim())
    .filter(name => name.length > 0);
};

const COMMON_FIRST_NAMES = new Set([
  'jose', 'juan', 'maria', 'jesus', 'antonio', 'francisco'
]);

const calculateNameMatches = (n1, n2) => {
  let matches = 0;
  let score = 0;
  let reasons = [];

  // First name match
  if (n1.first === n2.first) {
    matches++;
    score += NAME_WEIGHTS.FIRST;
    reasons.push('First name match');
  }

  // Middle name match (if both have middle names)
  if (n1.hasMiddle && n2.hasMiddle && n1.middle === n2.middle) {
    matches++;
    score += NAME_WEIGHTS.MIDDLE;
    reasons.push('Middle name match');
  }

  // Last name match
  if (n1.last === n2.last) {
    matches++;
    score += NAME_WEIGHTS.LAST;
    reasons.push('Last name match');
  }

  return {
    score: matches >= 2 ? score : 0,
    matches,
    reasons,
    isValid: matches >= 2
  };
};

const calculateNameSimilarity = (name1, name2) => {
  const n1 = splitName(name1);
  const n2 = splitName(name2);
  
  const nameMatch = calculateNameMatches(n1, n2);
  
  if (!nameMatch.isValid) {
    return {
      score: 0,
      reasons: ['Insufficient name matches (needs 2 of 3)']
    };
  }

  return {
    score: nameMatch.score,
    reasons: nameMatch.reasons
  };
};

const AGE_VALIDATION = {
  MAX_DIFFERENCE: 10
};

const isValidAgeMatch = (cedulaAge, forenseAge) => {
  if (!cedulaAge || !forenseAge) return true; // Allow if ages missing
  return Math.abs(cedulaAge - forenseAge) <= AGE_VALIDATION.MAX_DIFFERENCE;
};

const calculatePhysicalMatch = (cedula, forense) => {
  // Check age difference
  const cedulaAge = parseInt(cedula.edad_momento_desaparicion);
  const forenseAge = extractForenseAge(forense.Edad);
  
  if (!isValidAgeMatch(cedulaAge, forenseAge)) {
    return {
      score: 0,
      isValidMatch: false,
      reasons: ['Age difference exceeds 10 years']
    };
  }

  // Check date order first
  if (!isValidDateOrder(cedula.fecha_desaparicion, forense.Fecha_Ingreso)) {
    return { 
      score: 0, 
      isValidMatch: false, 
      reasons: ['Invalid date order - forensic record before disappearance'] 
    };
  }

  let score = 0;
  let reasons = [];

  // Sex match
  const sexMatch = cedula.sexo?.toLowerCase() === forense.Sexo?.toLowerCase();
  if (!sexMatch && MATCH_RANGES.SEX.REQUIRED) {
    return { score: 0, isValidMatch: false, reasons: ['Sex mismatch'] };
  }
  
  if (sexMatch) {
    score += MATCH_RANGES.SEX.WEIGHT;
    reasons.push('Sex match');
  }

  return {
    score,
    isValidMatch: sexMatch,
    reasons
  };
};

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Add these constants at the top
const TATTOO_WEIGHTS = {
  BODY_PART_MATCH: 0.3,
  DESCRIPTION_MATCH: 0.4,
  POSITION_MATCH: 0.3
};

// Add more common keywords and patterns
const TATTOO_PATTERNS = {
  BODY_PARTS: [
    'clavicula', 'hombro', 'mano', 'brazo', 'torax', 'espalda', 
    'pecho', 'pierna', 'tobillo', 'cuello', 'antebrazo', 'muslo',
    'pantorrilla', 'costado', 'abdomen', 'muñeca', 'dorso'
  ],
  DESCRIPTORS: [
    'estrella', 'tribal', 'letra', 'nombre', 'fecha', 'cruz',
    'calavera', 'dragon', 'rosa', 'corazon', 'angel', 'demonio',
    'fenix', 'aguila', 'leon', 'virgen', 'santo', 'flores',
    'simbolo', 'circulo', 'decoracion', 'figura', 'texto',
    'leyenda', 'imagen', 'dibujo', 'tinta', 'color', 'rojo',
    'negro', 'azul', 'verde', 'policromatico', 'monocromatico'
  ]
};

// Add these helper functions after the existing helper functions
const normalizeTattooText = (text) => {
  return text?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .trim() || '';
};

const extractBodyParts = (text) => {
  const bodyParts = [
    'clavicula', 'hombro', 'mano', 'brazo', 'torax', 'espalda', 
    'pecho', 'pierna', 'tobillo', 'cuello', 'antebrazo'
  ];
  
  const normalized = normalizeTattooText(text);
  return bodyParts.filter(part => normalized.includes(part));
};

// Add validation helper
const isValidTattooData = (tattooData) => {
  return Array.isArray(tattooData) && tattooData.length > 0;
};

// Update tattoo similarity calculation
const calculateTattooSimilarity = (cedulaTattoos, forenseTattooText) => {
  if (!forenseTattooText || !Array.isArray(cedulaTattoos) || !cedulaTattoos.length) {
    return { score: 0, reasons: [], debug: 'No valid input data' };
  }

  const normalizedForense = normalizeTattooText(forenseTattooText);
  let maxScore = 0;
  let matchReasons = [];
  let debugInfo = [];

  cedulaTattoos.forEach(tattoo => {
    if (!tattoo?.descripcion) return;

    let score = 0;
    const tempReasons = [];
    const normalizedCedula = normalizeTattooText(tattoo.descripcion);

    // Body part matching
    const bodyPartMatches = TATTOO_PATTERNS.BODY_PARTS.filter(part => 
      normalizedCedula.includes(part) && normalizedForense.includes(part)
    );
    
    if (bodyPartMatches.length) {
      const partScore = TATTOO_WEIGHTS.BODY_PART_MATCH * 
        (bodyPartMatches.length / TATTOO_PATTERNS.BODY_PARTS.length);
      score += partScore;
      tempReasons.push(`Body parts: ${bodyPartMatches.join(', ')}`);
      debugInfo.push(`Body part score: ${partScore.toFixed(3)}`);
    }

    // Description matching
    const descMatches = TATTOO_PATTERNS.DESCRIPTORS.filter(desc => 
      normalizedCedula.includes(desc) && normalizedForense.includes(desc)
    );

    if (descMatches.length) {
      const descScore = TATTOO_WEIGHTS.DESCRIPTION_MATCH * 
        (descMatches.length / TATTOO_PATTERNS.DESCRIPTORS.length);
      score += descScore;
      tempReasons.push(`Elements: ${descMatches.join(', ')}`);
      debugInfo.push(`Description score: ${descScore.toFixed(3)}`);
    }

    // Position match bonus
    if (bodyPartMatches.length && descMatches.length) {
      score *= 1.2; // 20% bonus for matching both position and description
      debugInfo.push('Applied position+description bonus');
    }

    if (score > maxScore) {
      maxScore = score;
      matchReasons = tempReasons;
    }
  });

  // Lower threshold for matches
  return {
    score: maxScore,
    reasons: matchReasons,
    isValid: maxScore > 0.2, // Lower threshold
    debug: debugInfo
  };
};

// Modify calculateTotalMatch function to include tattoos
const calculateTotalMatch = (nameMatch, physicalMatch, tattooMatch) => {
  const totalScore = (
    nameMatch.score * 0.4 + 
    physicalMatch.score * 0.3 + 
    tattooMatch.score * 0.3
  );
  
  return {
    score: totalScore,
    reasons: [...nameMatch.reasons, ...physicalMatch.reasons, ...tattooMatch.reasons],
    confidence: totalScore > 0.7 ? 'HIGH' : totalScore > 0.4 ? 'MEDIUM' : 'LOW'
  };
};

const CrossRef = () => {
  const { 
    map, 
    forenseRecords,
    selectedDate,
    daysRange,
    selectedSexo,
    selectedCondicion,
    edadRange,
    sumScoreRange 
  } = useData();

  const [matchRanges, setMatchRanges] = useState({
    age: INITIAL_RANGES.AGE.DEFAULT,
    height: INITIAL_RANGES.HEIGHT.DEFAULT,
    similarity: INITIAL_RANGES.SIMILARITY.DEFAULT
  });

  const matches = useMemo(() => {
    const filteredFeatures = getFilteredFeatures(
      map, selectedDate, daysRange, selectedSexo, 
      selectedCondicion, edadRange, sumScoreRange
    );

    if (!filteredFeatures?.length || !forenseRecords?.features?.length) return [];

    // Use Set to track unique combinations
    const seenMatches = new Set();
    const nameMatches = [];

    filteredFeatures.forEach(cedula => {
      const cedulaName = cedula.properties.nombre_completo;
      if (!cedulaName) return;

      forenseRecords.features.forEach(forense => {
        const forenseName = forense.properties.Probable_nombre;
        if (!forenseName) return;

        const validForenseNames = extractNames(forenseName);
        
        validForenseNames.forEach(validName => {
          const physicalMatch = calculatePhysicalMatch(cedula.properties, forense.properties);
          
          // Only proceed if sex matches
          if (!physicalMatch.isValidMatch) return;

          const nameMatch = calculateNameSimilarity(cedulaName, validName);
          const tattooMatch = calculateTattooSimilarity(
            cedula.properties.tatuajes,
            forense.properties.Tatuajes
          );
          const totalMatch = calculateTotalMatch(nameMatch, physicalMatch, tattooMatch);
          
          if (totalMatch.score > 0.3) {
            // Create unique key for this match combination
            const matchKey = `${cedula.properties.id_cedula_busqueda}-${forense.properties.ID}-${validName}`;
            
            // Only add if we haven't seen this exact match before
            if (!seenMatches.has(matchKey)) {
              seenMatches.add(matchKey);
              nameMatches.push({
                id: matchKey, // Add unique id field
                cedulaId: cedula.properties.id_cedula_busqueda,
                cedulaName: cedulaName,
                cedulaDate: formatDate(cedula.properties.fecha_desaparicion),
                forenseId: forense.properties.ID,
                forenseName: validName,
                forenseDate: formatDate(forense.properties.Fecha_Ingreso), // Updated field
                originalForenseName: forenseName,
                score: totalMatch.score,
                reasons: totalMatch.reasons,
                confidence: totalMatch.confidence,
                physicalScore: physicalMatch.score,
                // Add height and age values
                cedulaHeight: cedula.properties.estatura,
                forenseHeight: forense.properties.estatura,
                cedulaAge: cedula.properties.edad_momento_desaparicion,
                forenseAge: extractForenseAge(forense.properties.Edad),
                tattooScore: tattooMatch.score,
                tattooReasons: tattooMatch.reasons,
                cedulaTattoos: cedula.properties.tatuajes,
                forenseTattoos: forense.properties.Tatuajes,
                cedulaMunicipio: cedula.properties.municipio_desaparicion,
                forenseDelegation: forense.properties.Delegacion,
              });
            }
          }
        });
      });
    });

    return nameMatches.sort((a, b) => b.score - a.score);
  }, [map, forenseRecords, selectedDate, daysRange, selectedSexo, selectedCondicion, edadRange, sumScoreRange]);

  if (!matches.length) return <div>No matches found</div>;

  return (
    <div>

      <div className="name-matches" style={{ maxHeight: '300px', overflow: 'auto' }}>
        <h4>Name Matches ({matches.length})</h4>
        {matches.map(match => (
          <div 
            key={match.id}
            style={{ 
              padding: '12px',
              margin: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: match.confidence === 'HIGH' ? '#e6ffe6' : 
                             match.confidence === 'MEDIUM' ? '#fff3e6' : '#fff'
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <strong>Confidence:</strong> {match.confidence} | <strong>Score:</strong> {(match.score * 100).toFixed(1)}%
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <h5>Missing Person</h5>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  <li>Name: {match.cedulaName}</li>
                  <li>Age: {match.cedulaAge || 'N/A'}</li>
                  <li>Date: {match.cedulaDate || 'N/A'}</li>
                  <li>Municipality: {match.cedulaMunicipio || 'N/A'}</li>
                </ul>
              </div>

              <div>
                <h5>Forensic Record</h5>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  <li>Name: {match.forenseName}</li>
                  <li>Age: {match.forenseAge || 'N/A'}</li>
                  <li>Date: {match.forenseDate || 'N/A'}</li>
                  <li>Delegation: {match.forenseDelegation || 'N/A'}</li>
                </ul>
              </div>
            </div>
            {match.tattooScore > 0 && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5' }}>
                <strong>Tattoo Match Score:</strong> {(match.tattooScore * 100).toFixed(1)}%
                <ul>
                  {match.tattooReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrossRef;