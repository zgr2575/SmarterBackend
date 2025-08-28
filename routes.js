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
    logger.error("Error in /api/v1/format route:", error);
    res.status(500).json(new AppError('Formatting failed').toJSON());
  }
});

logger.info("Enhanced routes.js has been initialized successfully");

export default router;
