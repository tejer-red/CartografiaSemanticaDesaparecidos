import createLogger from './logger';
const logger = createLogger('Cache');

export const getCuadernoId = () => {
  const match = window.location.pathname.match(/\/cuaderno\/([^\/]+)/);
  return match ? match[1] : null;
};

export const getCachedData = (endpoint, params) => {
  const cuadernoId = getCuadernoId();
  if (!cuadernoId) return null;

  const cacheKey = `cuaderno_${cuadernoId}_${endpoint}_${JSON.stringify(params)}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsedData = JSON.parse(cached);
      // Force re-fetch if cache is an empty array
      if (Array.isArray(parsedData) && parsedData.length === 0) {
        logger.log(`Cache ignored for ${endpoint} because it was an empty array`, params);
        localStorage.removeItem(cacheKey);
        return null;
      }
      logger.log(`Cache hit for ${endpoint}`, params);
      return parsedData;
    }
  } catch (e) {
    logger.error('Error reading from cache', e);
  }
  return null;
};

export const setCachedData = (endpoint, params, data) => {
  const cuadernoId = getCuadernoId();
  if (!cuadernoId) return;

  const cacheKey = `cuaderno_${cuadernoId}_${endpoint}_${JSON.stringify(params)}`;
  
  if (Array.isArray(data) && data.length === 0) {
    logger.log(`Skipping cache for ${endpoint} because data is empty array`, params);
    return;
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
    logger.log(`Cached data for ${endpoint}`, params);
  } catch (e) {
    logger.error('Error saving to cache', e);
  }
};
