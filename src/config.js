const getApiBaseUrl = () => {
    const { origin } = window.location;

    // Local development or production domains
    if (origin.includes('localhost')) {
        return 'https://datades.abundis.com.mx/api';
    }

    if (origin.includes('tejer.red')) {
        return 'https://cartografia.tejer.red/api';
    }

    // Fallback to current production domain
    return 'https://datades.abundis.com.mx/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Set to true to enable the "Restricted Access" password screen in production
// Default: false (no password required)
export const USE_PASSWORD = false;
