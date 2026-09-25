const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
        // Auto-fix typo if Vercel env variable was set as api.carto instead of api-carto
        return envUrl.replace('api.carto.tejer.red', 'api-carto.tejer.red');
    }

    const { protocol, hostname } = window.location;

    if (hostname.includes('tejer.red') || hostname.includes('vercel.app')) {
        return 'https://api-carto.tejer.red/api/v1';
    }

    // Dynamic local network or localhost backend on port 8008
    return `${protocol}//${hostname}:8008/api/v1`;
};

export const API_BASE_URL = getApiBaseUrl();
