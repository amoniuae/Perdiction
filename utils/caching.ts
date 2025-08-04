const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes.

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export const getCachedData = <T>(key: string): T | null => {
  const cachedItem = localStorage.getItem(key);
  if (!cachedItem) {
    return null;
  }

  try {
    const entry: CacheEntry<T> = JSON.parse(cachedItem);
    const isExpired = Date.now() - entry.timestamp > CACHE_DURATION_MS;
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch (error) {
    console.error(`[Cache] Failed to parse cached data for key: ${key}`, error);
    localStorage.removeItem(key);
    return null;
  }
};

export const setCachedData = <T>(key: string, data: T): void => {
  try {
    const entry: CacheEntry<T> = {
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error(`[Cache] Failed to set cache data for key: ${key}`, error);
  }
};
