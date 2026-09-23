const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    const { protocol, hostname } = window.location;

    if (window.location.origin.includes('tejer.red')) {
        return 'https://cartografia.tejer.red/api/v1';
    }

    // Dynamic local network or localhost backend on port 8008
    return `${protocol}//${hostname}:8008/api/v1`;
};

export const API_BASE_URL = getApiBaseUrl();
