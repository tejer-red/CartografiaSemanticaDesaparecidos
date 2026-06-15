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
      logger.log(`Cache hit for ${endpoint}`, params);
      return JSON.parse(cached);
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
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
    logger.log(`Cached data for ${endpoint}`, params);
  } catch (e) {
    logger.error('Error saving to cache', e);
  }
};
