const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    const { origin } = window.location;

    // Local development or production domains
    if (origin.includes('localhost')) {
        return 'http://localhost:8000/api/v1';
    }

    if (origin.includes('tejer.red')) {
        return 'https://cartografia.tejer.red/api/v1';
    }

    // Fallback to local development
    return 'http://localhost:8000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

// Set to true to enable the "Restricted Access" password screen in production
// Default: false (no password required)
export const USE_PASSWORD = false;

