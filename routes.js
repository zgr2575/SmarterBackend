import express from "express";
import { 
  getTotalDiskSpace, 
  getNetworkStats, 
  getHealthStatus,
  getSystemMetrics,
  getEnvironmentInfo,
  AppError,
  validateInput,
  formatters
} from "./utils.js";
import { 
  apiKeyManager, 
  requireApiKey, 
  ipManager, 
  auditLogger,
  sanitizeInput
} from "./middleware/security.js";
import { 
  performanceMonitor, 
  cacheManager, 
  memoryOptimizer 
} from "./middleware/performance.js";
import { 
  alertManager, 
  uptimeMonitor, 
  metricsCollector 
} from "./middleware/monitoring.js";
import logger from "./logger.js";
import config from "./config.js";

const router = express.Router();

/**
 * @swagger
 * /d/data:
 *   get:
 *     summary: Retrieve server data
 *     responses:
 *       200:
 *         description: A JSON object containing server data
 */
router.get("/d/data", async (req, res) => {
  try {
    const diskSpace = await getTotalDiskSpace();

    const networkStats = await getNetworkStats();

    const serverStats = {
      server: "Smarter Back End v6",
      version: config.version,
      updateAvailable: config.updateAvailable,
      serverUptime: process.uptime(),
      serverMemory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + " MB",
      serverId: Math.floor(Math.random() * 101),
      serverIdentity: "SBE SERVER",
      cpuUsage: process.cpuUsage(),
      diskSpace: diskSpace,
      networkStats: networkStats,
    };

    logger.info("[SMARTERBACKEND]: SERVER DATA HAS BEEN REQUESTED | STATUS: PACKAGING");

    res.status(200).json(serverStats);

    logger.info("[SMARTERBACKEND]: SERVER DATA HAS BEEN SENT | STATUS: SENT");
  } catch (error) {
    logger.error("Error in /d/data route:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * @swagger
 * /d/data/cpu:
 *   get:
 *     summary: Retrieve cpu data
 *     responses:
 *       200:
 *         description: A JSON object containing cpu data
 */
router.get("/d/data/cpu", async (req, res) => {
  try {

    const cpuStats = {
      serverIdentity: "SBE SERVER",
      cpuUsage: process.cpuUsage(),
    };

    logger.info("[SMARTERBACKEND]: CPU DATA HAS BEEN REQUESTED | STATUS: PACKAGING");
    res.status(200).json(cpuStats);
    logger.info("[SMARTERBACKEND]: CPU DATA HAS BEEN SENT | STATUS: SENT");
  } catch (error) {
    logger.error("Error in /d/data route:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Comprehensive health check endpoint
 *     description: Returns detailed health status of all system components
 *     responses:
 *       200:
 *         description: Health check results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 checks:
 *                   type: object
 *                 performance:
 *                   type: object
 */
router.get("/health", async (req, res) => {
  try {
    const healthStatus = await getHealthStatus();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    logger.info(`[HEALTH]: Health check requested - Status: ${healthStatus.status}`);
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error("Error in /health route:", error);
    res.status(500).json(new AppError('Health check failed').toJSON());
  }
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: System metrics endpoint
 *     description: Returns detailed system metrics and performance data
 *     responses:
 *       200:
 *         description: System metrics data
 */
router.get("/metrics", async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    logger.info("[METRICS]: System metrics requested");
    res.status(200).json(metrics);
  } catch (error) {
    logger.error("Error in /metrics route:", error);
    res.status(500).json(new AppError('Failed to retrieve metrics').toJSON());
  }
});

/**
 * @swagger
 * /environment:
 *   get:
 *     summary: Environment information endpoint
 *     description: Returns environment configuration and system info (sensitive data redacted)
 *     responses:
 *       200:
 *         description: Environment information
 */
router.get("/environment", (req, res) => {
  try {
    const envInfo = getEnvironmentInfo();
    logger.info("[ENVIRONMENT]: Environment info requested");
    res.status(200).json(envInfo);
  } catch (error) {
    logger.error("Error in /environment route:", error);
    res.status(500).json(new AppError('Failed to retrieve environment info').toJSON());
  }
});

/**
 * @swagger
 * /config:
 *   get:
 *     summary: Server configuration endpoint
 *     description: Returns current server configuration (excluding sensitive data)
 *     responses:
 *       200:
 *         description: Server configuration
 */
router.get("/config", (req, res) => {
  try {
    const safeConfig = {
      port: config.port,
      version: config.version,
      logLevel: config.logLevel,
      loggerEnabled: config.loggerEnabled,
      staticFolder: config.staticFolder,
      maxRequestSize: config.maxRequestSize,
      environment: process.env.NODE_ENV || 'development'
    };
    
    logger.info("[CONFIG]: Configuration requested");
    res.status(200).json(safeConfig);
  } catch (error) {
    logger.error("Error in /config route:", error);
    res.status(500).json(new AppError('Failed to retrieve configuration').toJSON());
  }
});

/**
 * @swagger
 * /ping:
 *   get:
 *     summary: Simple ping endpoint
 *     description: Basic connectivity test endpoint
 *     responses:
 *       200:
 *         description: Pong response
 */
router.get("/ping", (req, res) => {
  const response = {
    message: "pong",
    timestamp: new Date().toISOString(),
    uptime: formatters.duration(process.uptime()),
    version: config.version
  };
  
  res.status(200).json(response);
});

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Quick status check
 *     description: Lightweight status endpoint for load balancers
 *     responses:
 *       200:
 *         description: Service status OK
 */
router.get("/status", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "SmarterBackend",
    version: config.version
  });
});

/**
 * @swagger
 * /api/v1/validate:
 *   post:
 *     summary: Input validation endpoint
 *     description: Validates various types of input data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, url, port, ip, alphanumeric, path]
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post("/api/v1/validate", (req, res) => {
  try {
    const { type, value } = req.body;
    
    if (!type || value === undefined) {
      return res.status(400).json(new AppError('Missing type or value', 400, 'VALIDATION_ERROR').toJSON());
    }
    
    let isValid = false;
    let message = '';
    
    switch (type) {
      case 'email':
        isValid = validateInput.email(value);
        message = isValid ? 'Valid email address' : 'Invalid email format';
        break;
      case 'url':
        isValid = validateInput.url(value);
        message = isValid ? 'Valid URL' : 'Invalid URL format';
        break;
      case 'port':
        isValid = validateInput.port(value);
        message = isValid ? 'Valid port number' : 'Invalid port number (1-65535)';
        break;
      case 'ip':
        isValid = validateInput.ipAddress(value);
        message = isValid ? 'Valid IP address' : 'Invalid IP address format';
        break;
      case 'alphanumeric':
        isValid = validateInput.isAlphanumeric(value);
        message = isValid ? 'Valid alphanumeric string' : 'Contains non-alphanumeric characters';
        break;
      case 'path':
        isValid = validateInput.isValidPath(value);
        message = isValid ? 'Valid path' : 'Invalid path format';
        break;
      default:
        return res.status(400).json(new AppError('Unsupported validation type', 400, 'UNSUPPORTED_TYPE').toJSON());
    }
    
    const response = {
      type,
      value,
      isValid,
      message,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`[VALIDATION]: ${type} validation - ${isValid ? 'PASS' : 'FAIL'}`);
    res.status(200).json(response);
    
  } catch (error) {
    logger.error("Error in /api/v1/validate route:", error);
    res.status(500).json(new AppError('Validation failed').toJSON());
  }
});

/**
 * @swagger
 * /api/v1/format:
 *   post:
 *     summary: Data formatting endpoint
 *     description: Formats various types of data (bytes, duration, percentage, etc.)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [bytes, duration, percentage, timestamp]
 *               value:
 *                 type: number
 *               total:
 *                 type: number
 *                 description: Required for percentage type
 *     responses:
 *       200:
 *         description: Formatted result
 */
router.post("/api/v1/format", (req, res) => {
  try {
    const { type, value, total } = req.body;
    
    if (!type || value === undefined) {
      return res.status(400).json(new AppError('Missing type or value', 400, 'FORMAT_ERROR').toJSON());
    }
    
    let formatted = '';
    let isValid = true;
    
    switch (type) {
      case 'bytes':
        formatted = formatters.bytes(value);
        break;
      case 'duration':
        formatted = formatters.duration(value);
        break;
      case 'percentage':
        if (total === undefined) {
          return res.status(400).json(new AppError('Total value required for percentage formatting', 400, 'MISSING_TOTAL').toJSON());
        }
        formatted = formatters.percentage(value, total);
        break;
      case 'timestamp':
        formatted = formatters.timestamp(value ? new Date(value) : undefined);
        break;
      default:
        return res.status(400).json(new AppError('Unsupported format type', 400, 'UNSUPPORTED_FORMAT').toJSON());
    }
    
    const response = {
      type,
      originalValue: value,
      formattedValue: formatted,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`[FORMAT]: ${type} formatting requested`);
    res.status(200).json(response);
    
  } catch (error) {
  }
});

/**
 * @swagger
 * /api/v1/admin/apikeys:
 *   get:
 *     summary: List all API keys (admin only)
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *   post:
 *     summary: Generate new API key (admin only)
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: API key created
 */
router.get("/api/v1/admin/apikeys", requireApiKey(['admin']), auditLogger, (req, res) => {
  try {
    const keys = apiKeyManager.listKeys();
    res.status(200).json({
      keys,
      total: keys.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error in /api/v1/admin/apikeys GET:", error);
    res.status(500).json(new AppError('Failed to list API keys').toJSON());
  }
});

router.post("/api/v1/admin/apikeys", requireApiKey(['admin']), sanitizeInput, auditLogger, (req, res) => {
  try {
    const { name, role = 'readonly', permissions = ['read'] } = req.body;
    
    if (!name || !validateInput.isAlphanumeric(name.replace(/[-_]/g, ''))) {
      return res.status(400).json(new AppError('Valid name is required', 400, 'INVALID_NAME').toJSON());
    }
    
    const apiKey = apiKeyManager.generateKey(name, role, permissions);
    
    res.status(201).json({
      message: 'API key created successfully',
      apiKey: apiKey,
      keyData: {
        name,
        role,
        permissions,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error("Error in /api/v1/admin/apikeys POST:", error);
    res.status(500).json(new AppError('Failed to create API key').toJSON());
  }
});

/**
 * @swagger
 * /api/v1/admin/apikeys/{key}:
 *   delete:
 *     summary: Revoke API key (admin only)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key revoked
 */
router.delete("/api/v1/admin/apikeys/:key", requireApiKey(['admin']), auditLogger, (req, res) => {
  try {
    const { key } = req.params;
    const revoked = apiKeyManager.revokeKey(key);
    
    if (revoked) {
      res.status(200).json({
        message: 'API key revoked successfully',
        key: key.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json(new AppError('API key not found', 404, 'KEY_NOT_FOUND').toJSON());
    }
  } catch (error) {
    logger.error("Error in /api/v1/admin/apikeys DELETE:", error);
    res.status(500).json(new AppError('Failed to revoke API key').toJSON());
  }
});

/**
 * @swagger
 * /api/v1/performance:
 *   get:
 *     summary: Get performance metrics
 *     responses:
 *       200:
 *         description: Performance metrics data
 */
router.get("/api/v1/performance", (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    const cacheStats = cacheManager.getStats();
    const memoryStats = memoryOptimizer.getMemoryStats();
    
    const data = {
      performance: metrics,
      cache: cacheStats,
      memory: memoryStats,
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(data);
  } catch (error) {
    logger.error("Error in /api/v1/performance:", error);
    res.status(500).json(new AppError('Failed to get performance metrics').toJSON());
  }
});

/**
 * @swagger
 * /api/v1/alerts:
 *   get:
 *     summary: Get recent alerts
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Recent alerts
 */
router.get("/api/v1/alerts", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = alertManager.getRecentAlerts(limit);
    const stats = alertManager.getAlertStats();
    
    res.status(200).json({
      alerts,
      stats,
      thresholds: alertManager.getThresholds(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error in /api/v1/alerts:", error);
    res.status(500).json(new AppError('Failed to get alerts').toJSON());
  }
});

/**
 * @swagger
 * /api/v1/uptime:
 *   get:
 *     summary: Get uptime statistics
 *     responses:
 *       200:
 *         description: Uptime statistics
 */
router.get("/api/v1/uptime", (req, res) => {
  try {
    const uptimeStats = uptimeMonitor.getUptimeStats();
    const availability = uptimeMonitor.getAvailabilityReport(req.query.period || '24h');
    
    res.status(200).json({
      uptime: uptimeStats,
      availability,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error in /api/v1/uptime:", error);
    res.status(500).json(new AppError('Failed to get uptime data').toJSON());
  }
});

/**
 * @swagger
 * /api/v1/benchmark:
 *   post:
 *     summary: Run performance benchmark
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               iterations:
 *                 type: integer
 *                 default: 1000
 *               endpoint:
 *                 type: string
 *                 default: '/ping'
 *     responses:
 *       200:
 *         description: Benchmark results
 */
router.post("/api/v1/benchmark", sanitizeInput, async (req, res) => {
  try {
    const { iterations = 1000, endpoint = '/ping' } = req.body;
    
    if (iterations > 10000) {
      return res.status(400).json(new AppError('Maximum 10000 iterations allowed', 400, 'LIMIT_EXCEEDED').toJSON());
    }
    
    const startTime = Date.now();
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const iterStart = process.hrtime.bigint();
      
      // Simulate internal request
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
      
      const iterEnd = process.hrtime.bigint();
      const duration = Number(iterEnd - iterStart) / 1000000;
      results.push(duration);
    }
    
    const totalTime = Date.now() - startTime;
    const sortedResults = results.sort((a, b) => a - b);
    
    const benchmark = {
      iterations,
      endpoint,
      totalTime: `${totalTime}ms`,
      avgResponseTime: Math.round((results.reduce((a, b) => a + b, 0) / results.length) * 100) / 100,
      minResponseTime: Math.round(sortedResults[0] * 100) / 100,
      maxResponseTime: Math.round(sortedResults[sortedResults.length - 1] * 100) / 100,
      p50: Math.round(sortedResults[Math.floor(sortedResults.length * 0.5)] * 100) / 100,
      p95: Math.round(sortedResults[Math.floor(sortedResults.length * 0.95)] * 100) / 100,
      p99: Math.round(sortedResults[Math.floor(sortedResults.length * 0.99)] * 100) / 100,
      requestsPerSecond: Math.round((iterations / totalTime) * 1000),
      timestamp: new Date().toISOString()
    };
    
    logger.info(`[BENCHMARK]: Completed ${iterations} iterations in ${totalTime}ms`);
    res.status(200).json(benchmark);
    
  } catch (error) {
    logger.error("Error in /api/v1/benchmark:", error);
    res.status(500).json(new AppError('Benchmark failed').toJSON());
  }
});

logger.info("Enhanced routes.js has been initialized successfully");

export default router;
