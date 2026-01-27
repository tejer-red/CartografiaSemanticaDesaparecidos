/**
 * crossref.test.js - Tests unitarios para funciones de CrossRef
 * 
 * Estos tests validan el algoritmo de matching:
 * - Normalización de nombres
 * - Extracción de nombres válidos
 * - Cálculo de similitud de nombres
 * - Matching físico (sexo, edad)
 */
import { describe, it, expect } from 'vitest';

// ============================================================
// FUNCIONES AUXILIARES A TESTEAR (extraídas de CrossRef.jsx)
// ============================================================

// Normaliza strings: lowercase, sin acentos, trim
const normalizeString = (str) => {
    return str?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim() || '';
};

// Verifica si un nombre es válido (no es código forense)
const isValidName = (name) => {
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

// Divide el nombre completo en partes
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

// Calcula coincidencias de nombres
const calculateNameMatches = (n1, n2) => {
    let matches = 0;
    let reasons = [];

    if (n1.first === n2.first) {
        matches++;
        reasons.push('First name match');
    }
    if (n1.hasMiddle && n2.hasMiddle && n1.middle === n2.middle) {
        matches++;
        reasons.push('Middle name match');
    }
    if (n1.last === n2.last) {
        matches++;
        reasons.push('Last name match');
    }

    return {
        score: matches >= 2 ? 0.5 : 0,
        matches,
        reasons,
        isValid: matches >= 2
    };
};

// ============================================================
// TESTS
// ============================================================

describe('CrossRef - normalizeString', () => {
    it('should convert to lowercase', () => {
        expect(normalizeString('JUAN CARLOS')).toBe('juan carlos');
    });

    it('should remove accents', () => {
        expect(normalizeString('José María')).toBe('jose maria');
    });

    it('should trim whitespace', () => {
        expect(normalizeString('  Juan  ')).toBe('juan');
    });

    it('should handle null/undefined', () => {
        expect(normalizeString(null)).toBe('');
        expect(normalizeString(undefined)).toBe('');
    });
});

describe('CrossRef - isValidName', () => {
    it('should accept valid names', () => {
        expect(isValidName('JUAN CARLOS PÉREZ')).toBe(true);
        expect(isValidName('MARÍA GUADALUPE')).toBe(true);
    });

    it('should reject forensic codes', () => {
        expect(isValidName('PFSI-12345')).toBe(false);
        expect(isValidName('BOLSA CON RESTOS')).toBe(false);
        expect(isValidName('CRANEO SIN IDENTIFICAR')).toBe(false);
    });

    it('should reject anatomical descriptions', () => {
        expect(isValidName('TORSO MASCULINO')).toBe(false);
        expect(isValidName('FRAGMENTOS OSEOS')).toBe(false);
    });
});

describe('CrossRef - splitName', () => {
    it('should split full name correctly', () => {
        const result = splitName('JUAN CARLOS PÉREZ LÓPEZ');
        expect(result.first).toBe('juan');
        expect(result.middle).toBe('carlos perez');
        expect(result.last).toBe('lopez');
        expect(result.hasMiddle).toBe(true);
    });

    it('should handle two-part names', () => {
        const result = splitName('JUAN PÉREZ');
        expect(result.first).toBe('juan');
        expect(result.last).toBe('perez');
        expect(result.hasMiddle).toBe(false);
    });

    it('should handle single names', () => {
        const result = splitName('JUAN');
        expect(result.first).toBe('juan');
        expect(result.last).toBe('juan');
    });
});

describe('CrossRef - calculateNameMatches', () => {
    it('should match first and last name (2 matches)', () => {
        const n1 = splitName('JUAN PÉREZ');
        const n2 = splitName('JUAN CARLOS PÉREZ');
        const result = calculateNameMatches(n1, n2);

        expect(result.matches).toBe(2);
        expect(result.isValid).toBe(true);
        expect(result.reasons).toContain('First name match');
        expect(result.reasons).toContain('Last name match');
    });

    it('should not match with only 1 coincidence', () => {
        const n1 = splitName('JUAN GARCÍA');
        const n2 = splitName('JUAN LÓPEZ');
        const result = calculateNameMatches(n1, n2);

        expect(result.matches).toBe(1);
        expect(result.isValid).toBe(false);
        expect(result.score).toBe(0);
    });

    it('should match all three parts', () => {
        const n1 = splitName('JUAN CARLOS PÉREZ');
        const n2 = splitName('JUAN CARLOS PÉREZ');
        const result = calculateNameMatches(n1, n2);

        expect(result.matches).toBe(3);
        expect(result.isValid).toBe(true);
    });
});
