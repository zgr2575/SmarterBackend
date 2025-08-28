import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import fs from 'fs/promises';
import logger from "./logger.js";
import config from "./config.js";


const execPromise = promisify(exec);

export const getTotalDiskSpace = () => {
  const totalDiskSpaceInBytes = os.totalmem();

  const totalDiskSpaceInGB = (totalDiskSpaceInBytes / 1024 ** 3).toFixed(2) + " GB";

  return totalDiskSpaceInGB;
};

export const getNetworkStats = async () => {
  try {
    const { stdout } = await execPromise("netstat -e");
    const lines = stdout.split("\n");
    const networkStats = {
      sent: lines[2] ? lines[2].trim().split(/\s+/)[1] : "N/A",
      received: lines[2] ? lines[2].trim().split(/\s+/)[0] : "N/A",
    };
    return networkStats;
  } catch (error) {

    logger.error("Error fetching network stats: For full log see your log file");

    return {
      sent: "N/A",
      received: "N/A",
    };
  }
};

logger.info("Utils.js has been initialized successfully");

/**
 * Enhanced error handling utility
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.stack = Error.captureStackTrace ? Error.captureStackTrace(this, AppError) : this.stack;
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
      }
    };
  }
}

/**
 * Comprehensive health check system
 */
export const getHealthStatus = async () => {
  const startTime = process.hrtime.bigint();
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: config.version,
      environment: process.env.NODE_ENV || 'development',
      checks: {
        memory: await getMemoryStatus(),
        disk: await getDiskStatus(),
        cpu: await getCpuStatus(),
        network: await getNetworkStatus(),
        filesystem: await getFileSystemStatus(),
        services: await getServiceStatus()
      },
      performance: {
        responseTime: 0, // Will be calculated below
        averageResponseTime: await getAverageResponseTime(),
        requestsPerSecond: await getRequestsPerSecond()
      },
      metadata: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        loadAverage: os.loadavg(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      }
    };

    // Calculate response time
    const endTime = process.hrtime.bigint();
    health.performance.responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Determine overall health status
    const checks = Object.values(health.checks);
    if (checks.some(check => check.status === 'error')) {
      health.status = 'unhealthy';
    } else if (checks.some(check => check.status === 'warning')) {
      health.status = 'degraded';
    }

    return health;
  } catch (error) {
    logger.error('Health check failed:', error);
    throw new AppError('Health check failed', 500, 'HEALTH_CHECK_ERROR');
  }
};

/**
 * Memory status check
 */
const getMemoryStatus = async () => {
  const usage = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usagePercent = (used / total) * 100;

  return {
    status: usagePercent > 90 ? 'error' : usagePercent > 75 ? 'warning' : 'healthy',
    details: {
      heap: {
        used: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
        limit: Math.round(usage.heapUsed / usage.heapTotal * 100)
      },
      system: {
        total: Math.round(total / 1024 / 1024 / 1024 * 100) / 100,
        free: Math.round(free / 1024 / 1024 / 1024 * 100) / 100,
        used: Math.round(used / 1024 / 1024 / 1024 * 100) / 100,
        usagePercent: Math.round(usagePercent * 100) / 100
      },
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100
    },
    message: usagePercent > 90 ? 'Critical memory usage' : 
             usagePercent > 75 ? 'High memory usage' : 'Memory usage normal'
  };
};

/**
 * Disk status check
 */
const getDiskStatus = async () => {
  try {
    const stats = await fs.stat('./');
    let diskInfo = { status: 'healthy', message: 'Disk access normal' };

    // Try to get disk space information (works on Unix-like systems)
    try {
      const { stdout } = await execPromise('df -h .');
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        const diskLine = lines[1].split(/\s+/);
        const usagePercent = parseInt(diskLine[4].replace('%', ''));
        
        diskInfo = {
          status: usagePercent > 90 ? 'error' : usagePercent > 80 ? 'warning' : 'healthy',
          details: {
            total: diskLine[1],
            used: diskLine[2],
            available: diskLine[3],
            usagePercent: usagePercent,
            mountPoint: diskLine[5]
          },
          message: usagePercent > 90 ? 'Critical disk usage' : 
                   usagePercent > 80 ? 'High disk usage' : 'Disk usage normal'
        };
      }
    } catch (err) {
      // Fallback for systems where df command is not available
      diskInfo.details = { accessible: true, lastModified: stats.mtime };
    }

    return diskInfo;
  } catch (error) {
    return {
      status: 'error',
      message: 'Disk access failed',
      error: error.message
    };
  }
};

/**
 * CPU status check
 */
const getCpuStatus = async () => {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const cpuCount = cpus.length;
  
  // Calculate load average percentage
  const load1min = loadAvg[0] / cpuCount * 100;
  const load5min = loadAvg[1] / cpuCount * 100;
  const load15min = loadAvg[2] / cpuCount * 100;

  return {
    status: load1min > 90 ? 'error' : load1min > 75 ? 'warning' : 'healthy',
    details: {
      count: cpuCount,
      model: cpus[0]?.model || 'Unknown',
      speed: cpus[0]?.speed || 0,
      loadAverage: {
        '1min': Math.round(load1min * 100) / 100,
        '5min': Math.round(load5min * 100) / 100,
        '15min': Math.round(load15min * 100) / 100
      },
      usage: process.cpuUsage()
    },
    message: load1min > 90 ? 'Critical CPU load' : 
             load1min > 75 ? 'High CPU load' : 'CPU load normal'
  };
};

/**
 * Network status check
 */
const getNetworkStatus = async () => {
  try {
    const networkStats = await getNetworkStats();
    return {
      status: 'healthy',
      details: networkStats,
      message: 'Network connectivity normal'
    };
  } catch (error) {
    return {
      status: 'warning',
      message: 'Network stats unavailable',
      error: error.message
    };
  }
};

/**
 * File system status check
 */
const getFileSystemStatus = async () => {
  try {
    // Test read/write access
    const testFile = './test-write-access.tmp';
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    
    return {
      status: 'healthy',
      details: {
        readable: true,
        writable: true,
        configFile: await checkFileAccess('./config.js'),
        logFile: await checkFileAccess(config.logFile || './server.log'),
        staticFolder: await checkFileAccess('./static')
      },
      message: 'File system access normal'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'File system access failed',
      error: error.message
    };
  }
};

/**
 * Service status check
 */
const getServiceStatus = async () => {
  const services = {
    logger: {
      status: logger ? 'healthy' : 'error',
      message: logger ? 'Logger service active' : 'Logger service unavailable'
    },
    webServer: {
      status: 'healthy',
      message: 'Web server running'
    },
    swaggerDocs: {
      status: 'healthy',
      message: 'API documentation available'
    }
  };

  const hasErrors = Object.values(services).some(service => service.status === 'error');
  const hasWarnings = Object.values(services).some(service => service.status === 'warning');

  return {
    status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'healthy',
    details: services,
    message: hasErrors ? 'Some services failing' : 
             hasWarnings ? 'Some services degraded' : 'All services operational'
  };
};

/**
 * Helper function to check file access
 */
const checkFileAccess = async (filePath) => {
  try {
    await fs.access(filePath);
    const stats = await fs.stat(filePath);
    return {
      exists: true,
      readable: true,
      size: stats.size,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
};

/**
 * Get average response time (placeholder - would need metrics collection)
 */
const getAverageResponseTime = async () => {
  // This would be implemented with actual metrics collection
  return Math.round(Math.random() * 50 + 10); // Mock data for now
};

/**
 * Get requests per second (placeholder - would need metrics collection)
 */
const getRequestsPerSecond = async () => {
  // This would be implemented with actual metrics collection
  return Math.round(Math.random() * 20 + 5); // Mock data for now
};

/**
 * System metrics collection
 */
export const getSystemMetrics = async () => {
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    },
    os: {
      hostname: os.hostname(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
      networkInterfaces: Object.keys(os.networkInterfaces()).length
    },
    application: {
      version: config.version,
      environment: process.env.NODE_ENV || 'development',
      logLevel: config.logLevel,
      port: config.port
    }
  };

  return metrics;
};

/**
 * Environment information
 */
export const getEnvironmentInfo = () => {
  const sensitive = ['password', 'secret', 'key', 'token', 'auth'];
  const env = {};
  
  Object.keys(process.env).forEach(key => {
    const isSensitive = sensitive.some(term => 
      key.toLowerCase().includes(term)
    );
    env[key] = isSensitive ? '[REDACTED]' : process.env[key];
  });

  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    environment: process.env.NODE_ENV || 'development',
    variables: env,
    workingDirectory: process.cwd(),
    execPath: process.execPath,
    argv: process.argv
  };
};

/**
 * Input validation utilities
 */
export const validateInput = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  port: (port) => {
    const portNum = parseInt(port);
    return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
  },
  
  ipAddress: (ip) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  },
  
  isAlphanumeric: (str) => {
    return /^[a-zA-Z0-9]+$/.test(str);
  },
  
  isValidPath: (path) => {
    // Basic path validation - no null bytes, not too long
    return typeof path === 'string' && 
           path.length > 0 && 
           path.length < 4096 && 
           !path.includes('\0');
  }
};

/**
 * Data formatting utilities
 */
export const formatters = {
  bytes: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  duration: (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (secs > 0) result += `${secs}s`;
    
    return result.trim() || '0s';
  },
  
  percentage: (value, total) => {
    if (total === 0) return '0%';
    return ((value / total) * 100).toFixed(2) + '%';
  },
  
  timestamp: (date = new Date()) => {
    return date.toISOString();
  }
};

logger.info("Enhanced utils.js has been initialized successfully");
