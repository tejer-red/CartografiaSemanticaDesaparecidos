import { API_BASE_URL } from '../config';

/**
 * api.js - Servicio centralizado para comunicación con el backend
 * 
 * PROCESO:
 * Centraliza todas las llamadas fetch para:
 * 1. Manejo unificado de errores (timeouts, status 4xx/5xx)
 * 2. Inyección automática de headers (Content-Type, API_KEY)
 * 3. Log estandarizado para debugging
 * 
 * MÉTODOS DISPONIBLES:
 * - getCedulas(startDate, endDate)
 * - getForenses(startDate, endDate)
 * - getNotebooks()
 * - saveNotebook(notes, name, meta)
 * - loadNotebook(id)
 * - checkPassword(password)
 */

class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
        // La API key debería venir de variables de entorno idealmente
        // Por ahora la tomamos del config si existiera, o se pasa manualmente
        this.apiKey = import.meta.env.VITE_API_KEY || '';
    }

    // Método base para todas las peticiones
    async _fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}/${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            // Inyectar API Key si existe
            ...(this.apiKey && { 'HTTP_API_KEY': this.apiKey }),
            ...options.headers
        };

        try {
            if (import.meta.env.DEV) {
                console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
            }

            const response = await fetch(url, {
                ...options,
                headers
            });

            // Manejo unificado de errores HTTP
            if (!response.ok) {
                // Intentar parsear el error JSON si existe
                let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) errorMessage = errorData.error;
                } catch (e) {
                    // Ignorar si el body no es JSON
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`❌ API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ============================================================
    // ENDPOINTS DE DATOS
    // ============================================================

    /**
     * Obtiene cédulas de búsqueda por rango de fechas
     * Endpoint: specificDate.php
     */
    async getCedulas(startDate, endDate) {
        if (!startDate || !endDate) {
            throw new Error('getCedulas requires startDate and endDate');
        }
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate
        });
        return this._fetch(`specificDate.php?${params}`);
    }

    /**
     * Obtiene registros forenses (PFSI) por rango de fechas
     * Endpoint: sininden.php
     */
    async getForenses(startDate, endDate) {
        if (!startDate || !endDate) {
            throw new Error('getForenses requires startDate and endDate');
        }
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate
        });
        return this._fetch(`sininden.php?${params}`);
    }

    // ============================================================
    // ENDPOINTS DE NOTEBOOKS
    // ============================================================

    /**
     * Lista todos los cuadernos guardados
     * Endpoint: list.php
     */
    async getNotebooks() {
        return this._fetch('list.php');
    }

    /**
     * Guarda un cuaderno nuevo o actualiza existente
     * Endpoint: save.php
     */
    async saveNotebook(payload) {
        // Validar payload mínimo
        if (!payload.notes || !payload.name) {
            throw new Error('saveNotebook requires notes array and name string');
        }

        return this._fetch('save.php', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Carga un cuaderno por ID
     * Endpoint: load.php
     */
    async loadNotebook(id) {
        if (!id) throw new Error('loadNotebook requires an ID');
        return this._fetch(`load.php?id=${id}`);
    }

    // ============================================================
    // SEGURIDAD
    // ============================================================

    /**
     * Verifica password de acceso restringido
     * Endpoint: check_password.php
     */
    async checkPassword(password) {
        return this._fetch('check_password.php', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
    }
}

// Exportar una instancia única (Singleton)
export default new ApiService();
