import compression from 'compression';
import NodeCache from 'node-cache';
import logger from '../logger.js';
import { AppError } from '../utils.js';

/**
 * Performance monitoring middleware
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      slowRequests: 0,
      responseTimes: [],
      memoryUsage: [],
      endpoints: new Map()
    };
    
    // Clean up old metrics every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      res.on('finish', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const endMemory = process.memoryUsage();

        // Update metrics
        this.metrics.requests++;
        this.metrics.totalResponseTime += responseTime;
        
        if (res.statusCode >= 400) {
          this.metrics.errors++;
        }
        
        if (responseTime > 1000) { // Slow requests > 1s
          this.metrics.slowRequests++;
        }

        // Store response times (keep last 1000)
        this.metrics.responseTimes.push(responseTime);
        if (this.metrics.responseTimes.length > 1000) {
          this.metrics.responseTimes.shift();
        }

        // Store memory usage
        this.metrics.memoryUsage.push({
          timestamp: endTime,
          heap: endMemory.heapUsed,
          external: endMemory.external
        });
        if (this.metrics.memoryUsage.length > 1000) {
          this.metrics.memoryUsage.shift();
        }

        // Track endpoint metrics
        const endpoint = `${req.method} ${req.route?.path || req.path}`;
        const endpointMetrics = this.metrics.endpoints.get(endpoint) || {
          requests: 0,
          totalTime: 0,
          errors: 0,
          avgResponseTime: 0
        };
        
        endpointMetrics.requests++;
        endpointMetrics.totalTime += responseTime;
        endpointMetrics.avgResponseTime = endpointMetrics.totalTime / endpointMetrics.requests;
        
        if (res.statusCode >= 400) {
          endpointMetrics.errors++;
        }
        
        this.metrics.endpoints.set(endpoint, endpointMetrics);
      });

      next();
    };
  }

  getMetrics() {
    const avgResponseTime = this.metrics.requests > 0 ? 
      this.metrics.totalResponseTime / this.metrics.requests : 0;
    
    const errorRate = this.metrics.requests > 0 ? 
      (this.metrics.errors / this.metrics.requests) * 100 : 0;

    // Calculate percentiles
    const sortedTimes = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedTimes, 50);
    const p95 = this.getPercentile(sortedTimes, 95);
    const p99 = this.getPercentile(sortedTimes, 99);

    return {
      summary: {
        totalRequests: this.metrics.requests,
        totalErrors: this.metrics.errors,
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        slowRequests: this.metrics.slowRequests
      },
      responseTimePercentiles: {
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99)
      },
      endpoints: Object.fromEntries(this.metrics.endpoints),
      memoryTrend: this.metrics.memoryUsage.slice(-10)
    };
  }

  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.floor((percentile / 100) * sortedArray.length);
    return sortedArray[index] || 0;
  }

  cleanup() {
    // Reset counters but keep trends
    const oldRequests = this.metrics.requests;
    this.metrics.requests = Math.floor(oldRequests * 0.1); // Keep 10%
    this.metrics.errors = Math.floor(this.metrics.errors * 0.1);
    this.metrics.totalResponseTime = Math.floor(this.metrics.totalResponseTime * 0.1);
    this.metrics.slowRequests = Math.floor(this.metrics.slowRequests * 0.1);
    
    logger.info(`[PERFORMANCE]: Metrics cleanup completed. Retained 10% of ${oldRequests} requests`);
  }

  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      slowRequests: 0,
      responseTimes: [],
      memoryUsage: [],
      endpoints: new Map()
    };
    logger.info('[PERFORMANCE]: Metrics reset');
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Caching layer
 */
export class CacheManager {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes default
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      logger.debug(`[CACHE]: HIT for key: ${key}`);
      return value;
    } else {
      this.stats.misses++;
      logger.debug(`[CACHE]: MISS for key: ${key}`);
      return null;
    }
  }

  set(key, value, ttl = null) {
    const success = ttl ? this.cache.set(key, value, ttl) : this.cache.set(key, value);
    if (success) {
      this.stats.sets++;
      logger.debug(`[CACHE]: SET key: ${key}${ttl ? ` (TTL: ${ttl}s)` : ''}`);
    }
    return success;
  }

  del(key) {
    const count = this.cache.del(key);
    if (count > 0) {
      this.stats.deletes++;
      logger.debug(`[CACHE]: DELETE key: ${key}`);
    }
    return count;
  }

  flush() {
    this.cache.flushAll();
    logger.info('[CACHE]: All keys flushed');
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 ? 
      (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      keys: this.cache.keys().length,
      size: this.cache.getStats()
    };
  }

  middleware(options = {}) {
    const { 
      keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
      ttl = 300,
      condition = () => true
    } = options;

    return (req, res, next) => {
      // Only cache GET requests by default
      if (req.method !== 'GET' || !condition(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const cachedResponse = this.get(key);

      if (cachedResponse) {
        logger.debug(`[CACHE]: Serving cached response for ${key}`);
        return res.json(cachedResponse);
      }

      // Intercept response
      const originalJson = res.json;
      res.json = (body) => {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.set(key, body, ttl);
        }
        return originalJson.call(res, body);
      };

      next();
    };
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager();

/**
 * Response compression middleware
 */
export const compressionMiddleware = compression({
  filter: (req, res) => {
    // Don't compress responses if the client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use compression filter function
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses > 1KB
  level: 6, // Compression level 1-9
  chunkSize: 1024,
  windowBits: 15,
  memLevel: 8
});

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  constructor() {
    this.gcInterval = null;
    this.memoryThreshold = 100 * 1024 * 1024; // 100MB
    this.checkInterval = 30000; // 30 seconds
  }

  startMonitoring() {
    this.gcInterval = setInterval(() => {
      const usage = process.memoryUsage();
      
      if (usage.heapUsed > this.memoryThreshold) {
        logger.warn(`[MEMORY]: High memory usage detected: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          logger.info('[MEMORY]: Garbage collection forced');
        }
      }
    }, this.checkInterval);
    
    logger.info('[MEMORY]: Memory monitoring started');
  }

  stopMonitoring() {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
      logger.info('[MEMORY]: Memory monitoring stopped');
    }
  }

  getMemoryStats() {
    const usage = process.memoryUsage();
    return {
      heap: {
        used: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
        limit: Math.round(this.memoryThreshold / 1024 / 1024 * 100) / 100
      },
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100,
      resident: Math.round(usage.rss / 1024 / 1024 * 100) / 100
    };
  }

  setMemoryThreshold(thresholdMB) {
    this.memoryThreshold = thresholdMB * 1024 * 1024;
    logger.info(`[MEMORY]: Memory threshold set to ${thresholdMB}MB`);
  }
}

// Global memory optimizer instance
export const memoryOptimizer = new MemoryOptimizer();

/**
 * Static asset optimization middleware
 */
export const staticOptimizer = (options = {}) => {
  const { 
    maxAge = 31536000, // 1 year
    etag = true,
    lastModified = true,
    cacheControl = true
  } = options;

  return (req, res, next) => {
    if (cacheControl) {
      // Set cache headers for static assets
      if (req.url.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.set({
          'Cache-Control': `public, max-age=${maxAge}`,
          'Expires': new Date(Date.now() + maxAge * 1000).toUTCString()
        });
      }
    }

    if (etag) {
      // ETag generation is handled by Express by default
    }

    next();
  };
};

/**
 * Performance metrics collection middleware
 */
export const metricsCollector = (req, res, next) => {
  req.startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - req.startTime) / 1000000; // Convert to milliseconds
    
    // Collect custom metrics
    const metrics = {
      method: req.method,
      route: req.route?.path || req.path,
      statusCode: res.statusCode,
      responseTime: duration,
      contentLength: res.get('Content-Length') || 0,
      timestamp: new Date().toISOString()
    };
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn(`[METRICS]: Slow request detected: ${metrics.method} ${metrics.route} (${duration}ms)`);
    }
    
    // Store metrics (in production, send to monitoring service)
    logger.debug(`[METRICS]: ${JSON.stringify(metrics)}`);
  });
  
  next();
};

logger.info('[PERFORMANCE]: Performance middleware initialized successfully');