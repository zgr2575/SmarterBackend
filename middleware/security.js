import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logger from '../logger.js';
import config from '../config.js';
import { AppError } from '../utils.js';

/**
 * Advanced rate limiting configurations
 */
export const rateLimiters = {
  // General API rate limiter
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Strict rate limiter for sensitive endpoints
  strict: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
      error: 'Rate limit exceeded for sensitive operations.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Authentication rate limiter
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  })
};

/**
 * API Key management
 */
export class ApiKeyManager {
  constructor() {
    this.keys = new Map(); // In production, this would be a database
    this.generateDefaultKeys();
  }

  generateDefaultKeys() {
    // Generate a default admin key for development
    const adminKey = crypto.randomBytes(32).toString('hex');
    this.keys.set(adminKey, {
      name: 'default-admin',
      role: 'admin',
      permissions: ['read', 'write', 'admin'],
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0
    });
    
    // Generate a default read-only key
    const readKey = crypto.randomBytes(32).toString('hex');
    this.keys.set(readKey, {
      name: 'default-readonly',
      role: 'readonly',
      permissions: ['read'],
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0
    });

    logger.info(`[SECURITY]: Default API keys generated - Admin: ${adminKey.substring(0, 8)}..., ReadOnly: ${readKey.substring(0, 8)}...`);
  }

  validateKey(apiKey) {
    const keyData = this.keys.get(apiKey);
    if (!keyData) return null;

    // Update usage statistics
    keyData.lastUsed = new Date();
    keyData.usageCount++;

    return keyData;
  }

  generateKey(name, role = 'readonly', permissions = ['read']) {
    const apiKey = crypto.randomBytes(32).toString('hex');
    this.keys.set(apiKey, {
      name,
      role,
      permissions,
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0
    });

    logger.info(`[SECURITY]: New API key generated for ${name} with role ${role}`);
    return apiKey;
  }

  revokeKey(apiKey) {
    const result = this.keys.delete(apiKey);
    if (result) {
      logger.info(`[SECURITY]: API key revoked: ${apiKey.substring(0, 8)}...`);
    }
    return result;
  }

  listKeys() {
    return Array.from(this.keys.entries()).map(([key, data]) => ({
      key: key.substring(0, 8) + '...',
      ...data
    }));
  }
}

// Global API key manager instance
export const apiKeyManager = new ApiKeyManager();

/**
 * API Key authentication middleware
 */
export const requireApiKey = (permissions = ['read']) => {
  return (req, res, next) => {
    const apiKey = req.header('X-API-Key') || req.query.apiKey;

    if (!apiKey) {
      return res.status(401).json(new AppError('API key required', 401, 'API_KEY_REQUIRED').toJSON());
    }

    const keyData = apiKeyManager.validateKey(apiKey);
    if (!keyData) {
      return res.status(401).json(new AppError('Invalid API key', 401, 'INVALID_API_KEY').toJSON());
    }

    // Check permissions
    const hasPermission = permissions.some(permission => 
      keyData.permissions.includes(permission) || keyData.permissions.includes('admin')
    );

    if (!hasPermission) {
      return res.status(403).json(new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS').toJSON());
    }

    req.apiKey = keyData;
    next();
  };
};

/**
 * IP whitelist/blacklist management
 */
export class IPManager {
  constructor() {
    this.whitelist = new Set();
    this.blacklist = new Set();
    
    // Add localhost to whitelist by default
    this.whitelist.add('127.0.0.1');
    this.whitelist.add('::1');
  }

  addToWhitelist(ip) {
    this.whitelist.add(ip);
    logger.info(`[SECURITY]: IP ${ip} added to whitelist`);
  }

  addToBlacklist(ip) {
    this.blacklist.add(ip);
    logger.info(`[SECURITY]: IP ${ip} added to blacklist`);
  }

  removeFromWhitelist(ip) {
    const result = this.whitelist.delete(ip);
    if (result) {
      logger.info(`[SECURITY]: IP ${ip} removed from whitelist`);
    }
    return result;
  }

  removeFromBlacklist(ip) {
    const result = this.blacklist.delete(ip);
    if (result) {
      logger.info(`[SECURITY]: IP ${ip} removed from blacklist`);
    }
    return result;
  }

  isWhitelisted(ip) {
    return this.whitelist.has(ip);
  }

  isBlacklisted(ip) {
    return this.blacklist.has(ip);
  }

  getWhitelist() {
    return Array.from(this.whitelist);
  }

  getBlacklist() {
    return Array.from(this.blacklist);
  }
}

// Global IP manager instance
export const ipManager = new IPManager();

/**
 * IP filtering middleware
 */
export const ipFilter = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  if (ipManager.isBlacklisted(clientIp)) {
    logger.warn(`[SECURITY]: Blocked request from blacklisted IP: ${clientIp}`);
    return res.status(403).json(new AppError('Access denied', 403, 'IP_BLOCKED').toJSON());
  }

  // If whitelist is not empty and IP is not whitelisted, block
  if (ipManager.getWhitelist().length > 2 && !ipManager.isWhitelisted(clientIp)) { // > 2 because localhost IPs are default
    logger.warn(`[SECURITY]: Blocked request from non-whitelisted IP: ${clientIp}`);
    return res.status(403).json(new AppError('Access denied', 403, 'IP_NOT_WHITELISTED').toJSON());
  }

  next();
};

/**
 * Request signature validation
 */
export const validateSignature = (secret) => {
  return (req, res, next) => {
    const signature = req.header('X-Signature');
    
    if (!signature) {
      return res.status(401).json(new AppError('Request signature required', 401, 'SIGNATURE_REQUIRED').toJSON());
    }

    const payload = JSON.stringify(req.body) + req.originalUrl;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json(new AppError('Invalid request signature', 401, 'INVALID_SIGNATURE').toJSON());
    }

    next();
  };
};

/**
 * Audit logging middleware
 */
export const auditLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Capture original json method to log response
  const originalJson = res.json;
  res.json = function(body) {
    res.locals.responseBody = body;
    return originalJson.call(this, body);
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const auditData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      apiKey: req.apiKey?.name || 'none',
      requestSize: req.get('Content-Length') || 0,
      responseSize: JSON.stringify(res.locals.responseBody || {}).length
    };

    logger.info(`[AUDIT]: ${JSON.stringify(auditData)}`);
  });

  next();
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Basic XSS prevention
      return obj
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};

logger.info('[SECURITY]: Security middleware initialized successfully');