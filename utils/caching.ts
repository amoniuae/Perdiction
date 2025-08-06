// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  MAX_CACHE_SIZE: 50, // Maximum number of cache entries
  CLEANUP_THRESHOLD: 0.8, // Clean up when 80% full
} as const;

interface CacheEntry<T> {
  timestamp: number;
  data: T;
  size?: number; // Optional size tracking
  accessCount: number;
  lastAccessed: number;
}

interface CacheMetadata {
  totalEntries: number;
  lastCleanup: number;
}

// Cache statistics for monitoring
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  oldestEntry: number;
}

// Get cache statistics
export const getCacheStats = (): CacheStats => {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
  let oldestTimestamp = Date.now();
  let hits = 0;
  let misses = 0;

  keys.forEach(key => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const entry: CacheEntry<any> = JSON.parse(item);
        hits += entry.accessCount || 0;
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
        }
      }
    } catch (error) {
      // Invalid cache entry, will be cleaned up
    }
  });

  return {
    hits,
    misses,
    size: keys.length,
    oldestEntry: oldestTimestamp
  };
};

// Clean up old or least-used cache entries
const cleanupCache = (): void => {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
  
  if (keys.length < CACHE_CONFIG.MAX_CACHE_SIZE * CACHE_CONFIG.CLEANUP_THRESHOLD) {
    return;
  }

  const entries: Array<{ key: string; entry: CacheEntry<any> }> = [];
  
  keys.forEach(key => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const entry: CacheEntry<any> = JSON.parse(item);
        entries.push({ key, entry });
      }
    } catch (error) {
      // Remove invalid entries
      localStorage.removeItem(key);
    }
  });

  // Sort by last accessed time (oldest first) and access count (least used first)
  entries.sort((a, b) => {
    const scoreA = a.entry.lastAccessed + (a.entry.accessCount * 1000);
    const scoreB = b.entry.lastAccessed + (b.entry.accessCount * 1000);
    return scoreA - scoreB;
  });

  // Remove oldest 20% of entries
  const toRemove = Math.floor(entries.length * 0.2);
  for (let i = 0; i < toRemove; i++) {
    localStorage.removeItem(entries[i].key);
  }
};

// Cache metadata management
const getCacheMetadata = (): CacheMetadata => {
  try {
    const metadata = localStorage.getItem('__cache_metadata__');
    return metadata ? JSON.parse(metadata) : { totalEntries: 0, lastCleanup: Date.now() };
  } catch {
    return { totalEntries: 0, lastCleanup: Date.now() };
  }
};

const setCacheMetadata = (metadata: CacheMetadata): void => {
  try {
    localStorage.setItem('__cache_metadata__', JSON.stringify(metadata));
  } catch (error) {
    console.warn('[Cache] Failed to update cache metadata:', error);
  }
};

// Improved cache cleanup
const cleanupExpiredEntries = (): void => {
  const metadata = getCacheMetadata();
  const now = Date.now();
  
  // Only cleanup if it's been more than 5 minutes since last cleanup
  if (now - metadata.lastCleanup < 5 * 60 * 1000) return;
  
  let cleanedCount = 0;
  const keys = Object.keys(localStorage);
  
  for (const key of keys) {
    if (key.startsWith('__cache_metadata__')) continue;
    
    try {
      const item = localStorage.getItem(key);
      if (!item) continue;
      
      const entry = JSON.parse(item);
      if (entry.timestamp && now - entry.timestamp > CACHE_CONFIG.DEFAULT_DURATION_MS) {
        localStorage.removeItem(key);
        cleanedCount++;
      }
    } catch {
      // Remove corrupted entries
      localStorage.removeItem(key);
      cleanedCount++;
    }
  }
  
  setCacheMetadata({
    totalEntries: keys.length - cleanedCount - 1, // -1 for metadata
    lastCleanup: now
  });
  
  if (cleanedCount > 0) {
    console.log(`[Cache] Cleaned up ${cleanedCount} expired entries`);
  }
};

export const getCachedData = <T>(key: string): T | null => {
  if (!key || typeof key !== 'string') {
    console.warn('[Cache] Invalid cache key provided');
    return null;
  }

  const prefixedKey = `cache_${key}`;
  const cachedItem = localStorage.getItem(prefixedKey);
  
  if (!cachedItem) {
    return null;
  }

  try {
    const entry: CacheEntry<T> = JSON.parse(cachedItem);
    
    // Validate entry structure
    if (!entry.timestamp || typeof entry.timestamp !== 'number') {
      localStorage.removeItem(prefixedKey);
      return null;
    }
    
    const isExpired = Date.now() - entry.timestamp > CACHE_CONFIG.DEFAULT_DURATION_MS;
    
    if (isExpired) {
      localStorage.removeItem(prefixedKey);
      return null;
    }
    
    // Update access statistics
    entry.accessCount = (entry.accessCount || 0) + 1;
    entry.lastAccessed = Date.now();
    localStorage.setItem(prefixedKey, JSON.stringify(entry));
    
    return entry.data;
  } catch (error) {
    console.error(`[Cache] Failed to parse cached data for key: ${key}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      keyLength: cachedItem.length
    });
    localStorage.removeItem(prefixedKey);
    return null;
  }
};

export const setCachedData = <T>(key: string, data: T): void => {
  if (!key || typeof key !== 'string') {
    console.warn('[Cache] Invalid cache key provided');
    return;
  }

  if (data === null || data === undefined) {
    console.warn('[Cache] Attempting to cache null/undefined data');
    return;
  }

  try {
    cleanupCache(); // Clean up before adding new data
    
    const serializedData = JSON.stringify(data);
    const dataSize = new Blob([serializedData]).size;
    
    // Check if data is too large (5MB limit)
    if (dataSize > 5 * 1024 * 1024) {
      console.warn(`[Cache] Data too large to cache: ${dataSize} bytes`);
      return;
    }
    
    const prefixedKey = `cache_${key}`;
    const entry: CacheEntry<T> = {
      timestamp: Date.now(),
      data,
      size: dataSize,
      accessCount: 0,
      lastAccessed: Date.now(),
    };
    
    localStorage.setItem(prefixedKey, JSON.stringify(entry));
    
    // Update metadata
    const metadata = getCacheMetadata();
    setCacheMetadata({
      ...metadata,
      totalEntries: metadata.totalEntries + 1
    });
    
  } catch (error) {
    console.error(`[Cache] Failed to set cache data for key: ${key}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      dataSize: JSON.stringify(data).length
    });
    
    // If storage is full, try to clean up and retry once
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      cleanupCache();
      try {
        localStorage.setItem(prefixedKey, JSON.stringify(entry));
      } catch (retryError) {
        console.error(`[Cache] Failed to set cache data after cleanup for key: ${key}`, retryError);
      }
    }
  }
};

// Clear all cache data
export const clearCache = (): void => {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
  keys.forEach(key => localStorage.removeItem(key));
};

// Clear expired cache entries
export const clearExpiredCache = (): void => {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
  const now = Date.now();
  
  keys.forEach(key => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const entry: CacheEntry<any> = JSON.parse(item);
        if (now - entry.timestamp > CACHE_CONFIG.DEFAULT_DURATION_MS) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      localStorage.removeItem(key);
    }
  });
};