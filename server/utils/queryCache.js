/**
 * In-Memory Query Cache for Frequent Data
 * Reduces database load by caching frequently accessed data
 */

class QueryCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
    this.maxSize = 1000; // Maximum number of cached entries
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Generate cache key from SQL query and parameters
   */
  _generateKey(sql, params = []) {
    const paramStr = JSON.stringify(params);
    return `${sql}:${paramStr}`;
  }

  /**
   * Get cached value if exists and not expired
   */
  get(sql, params = []) {
    const key = this._generateKey(sql, params);
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.value;
  }

  /**
   * Set cache value with TTL
   */
  set(sql, params = [], value, ttl = null) {
    // Evict if cache is too large (LRU-style, but simple)
    if (this.cache.size >= this.maxSize) {
      this._evictOldest();
    }

    const key = this._generateKey(sql, params);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    this.stats.sets++;
  }

  /**
   * Evict oldest entries (simple FIFO eviction)
   */
  _evictOldest() {
    if (this.cache.size === 0) return;

    // Find oldest entry
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Invalidate cache by pattern (useful for related queries)
   */
  invalidate(pattern) {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Create singleton instance
const queryCache = new QueryCache();

// Clean expired entries every 5 minutes
setInterval(() => {
  queryCache.cleanExpired();
}, 5 * 60 * 1000);

module.exports = queryCache;

