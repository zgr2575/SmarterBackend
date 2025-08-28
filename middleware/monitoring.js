import { EventEmitter } from 'events';
import logger from '../logger.js';
import { AppError, formatters } from '../utils.js';

/**
 * Alert system for monitoring thresholds
 */
export class AlertManager extends EventEmitter {
  constructor() {
    super();
    this.thresholds = {
      memory: {
        warning: 80, // percentage
        critical: 90
      },
      cpu: {
        warning: 75,
        critical: 90
      },
      responseTime: {
        warning: 1000, // milliseconds
        critical: 5000
      },
      errorRate: {
        warning: 5, // percentage
        critical: 10
      },
      diskSpace: {
        warning: 80,
        critical: 90
      }
    };
    
    this.alerts = [];
    this.maxAlerts = 1000;
    this.cooldownPeriod = 5 * 60 * 1000; // 5 minutes
    this.lastAlerts = new Map(); // Track last alert time per type
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on('alert', (alert) => {
      this.handleAlert(alert);
    });
  }

  checkThresholds(metrics) {
    const alerts = [];
    
    // Memory check
    if (metrics.memory?.usagePercent) {
      const level = this.getAlertLevel(metrics.memory.usagePercent, this.thresholds.memory);
      if (level) {
        alerts.push({
          type: 'memory',
          level,
          value: metrics.memory.usagePercent,
          threshold: this.thresholds.memory[level],
          message: `Memory usage: ${metrics.memory.usagePercent}%`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // CPU check
    if (metrics.cpu?.loadAverage?.['1min']) {
      const level = this.getAlertLevel(metrics.cpu.loadAverage['1min'], this.thresholds.cpu);
      if (level) {
        alerts.push({
          type: 'cpu',
          level,
          value: metrics.cpu.loadAverage['1min'],
          threshold: this.thresholds.cpu[level],
          message: `CPU load: ${metrics.cpu.loadAverage['1min']}%`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Response time check
    if (metrics.performance?.averageResponseTime) {
      const level = this.getAlertLevel(metrics.performance.averageResponseTime, this.thresholds.responseTime);
      if (level) {
        alerts.push({
          type: 'responseTime',
          level,
          value: metrics.performance.averageResponseTime,
          threshold: this.thresholds.responseTime[level],
          message: `Response time: ${metrics.performance.averageResponseTime}ms`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Emit alerts
    alerts.forEach(alert => {
      if (this.shouldEmitAlert(alert)) {
        this.emit('alert', alert);
      }
    });
    
    return alerts;
  }

  getAlertLevel(value, threshold) {
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return null;
  }

  shouldEmitAlert(alert) {
    const key = `${alert.type}-${alert.level}`;
    const lastAlert = this.lastAlerts.get(key);
    const now = Date.now();
    
    if (!lastAlert || (now - lastAlert) > this.cooldownPeriod) {
      this.lastAlerts.set(key, now);
      return true;
    }
    
    return false;
  }

  handleAlert(alert) {
    // Store alert
    this.alerts.unshift(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.pop();
    }
    
    // Log alert
    const logLevel = alert.level === 'critical' ? 'error' : 'warn';
    logger[logLevel](`[ALERT-${alert.level.toUpperCase()}]: ${alert.message}`);
    
    // In production, this would send notifications via email, Slack, etc.
    if (alert.level === 'critical') {
      this.sendCriticalAlert(alert);
    }
  }

  sendCriticalAlert(alert) {
    // Placeholder for critical alert notifications
    logger.error(`[CRITICAL-ALERT]: ${alert.message} - Immediate attention required!`);
    
    // In production, implement:
    // - Email notifications
    // - Slack/Teams webhooks
    // - SMS alerts
    // - PagerDuty integration
  }

  getRecentAlerts(limit = 50) {
    return this.alerts.slice(0, limit);
  }

  getAlertStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    
    const recentAlerts = this.alerts.filter(alert => 
      now - new Date(alert.timestamp).getTime() < oneDay
    );
    
    const criticalAlerts = recentAlerts.filter(alert => alert.level === 'critical');
    const warningAlerts = recentAlerts.filter(alert => alert.level === 'warning');
    
    return {
      total: this.alerts.length,
      last24h: recentAlerts.length,
      critical: criticalAlerts.length,
      warnings: warningAlerts.length,
      byType: this.groupAlertsByType(recentAlerts)
    };
  }

  groupAlertsByType(alerts) {
    return alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {});
  }

  updateThreshold(type, level, value) {
    if (this.thresholds[type] && this.thresholds[type][level] !== undefined) {
      this.thresholds[type][level] = value;
      logger.info(`[ALERT]: Updated ${type} ${level} threshold to ${value}`);
      return true;
    }
    return false;
  }

  getThresholds() {
    return { ...this.thresholds };
  }
}

/**
 * Uptime monitoring
 */
export class UptimeMonitor {
  constructor() {
    this.startTime = new Date();
    this.downtime = [];
    this.uptimeChecks = [];
    this.isUp = true;
    this.checkInterval = null;
  }

  start() {
    this.startTime = new Date();
    this.isUp = true;
    
    // Check uptime every minute
    this.checkInterval = setInterval(() => {
      this.recordUptimeCheck();
    }, 60000);
    
    logger.info('[UPTIME]: Monitoring started');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('[UPTIME]: Monitoring stopped');
  }

  recordDowntime(reason = 'Unknown') {
    if (this.isUp) {
      this.isUp = false;
      this.downtime.push({
        start: new Date(),
        end: null,
        reason,
        duration: null
      });
      logger.error(`[UPTIME]: Service went down - Reason: ${reason}`);
    }
  }

  recordUptime() {
    if (!this.isUp && this.downtime.length > 0) {
      const lastDowntime = this.downtime[this.downtime.length - 1];
      lastDowntime.end = new Date();
      lastDowntime.duration = lastDowntime.end.getTime() - lastDowntime.start.getTime();
      this.isUp = true;
      
      logger.info(`[UPTIME]: Service restored - Downtime: ${formatters.duration(lastDowntime.duration / 1000)}`);
    }
  }

  recordUptimeCheck() {
    this.uptimeChecks.unshift({
      timestamp: new Date(),
      status: this.isUp ? 'up' : 'down'
    });
    
    // Keep only last 1440 checks (24 hours if checking every minute)
    if (this.uptimeChecks.length > 1440) {
      this.uptimeChecks.pop();
    }
  }

  getUptimeStats() {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();
    
    // Calculate total downtime
    let totalDowntime = 0;
    this.downtime.forEach(incident => {
      if (incident.duration) {
        totalDowntime += incident.duration;
      } else if (!incident.end && !this.isUp) {
        // Current ongoing downtime
        totalDowntime += now.getTime() - incident.start.getTime();
      }
    });
    
    const uptimePercentage = uptime > 0 ? ((uptime - totalDowntime) / uptime) * 100 : 100;
    
    return {
      isUp: this.isUp,
      startTime: this.startTime,
      currentUptime: formatters.duration(uptime / 1000),
      uptimePercentage: Math.round(uptimePercentage * 10000) / 10000, // 4 decimal places
      totalDowntime: formatters.duration(totalDowntime / 1000),
      incidentCount: this.downtime.length,
      lastIncident: this.downtime.length > 0 ? this.downtime[this.downtime.length - 1] : null,
      checks: this.uptimeChecks.slice(0, 100) // Last 100 checks
    };
  }

  getAvailabilityReport(period = '24h') {
    const periodMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const duration = periodMs[period] || periodMs['24h'];
    const cutoff = new Date(Date.now() - duration);
    
    const relevantChecks = this.uptimeChecks.filter(check => 
      check.timestamp >= cutoff
    );
    
    const upChecks = relevantChecks.filter(check => check.status === 'up').length;
    const totalChecks = relevantChecks.length;
    
    const availability = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 100;
    
    return {
      period,
      availability: Math.round(availability * 100) / 100,
      totalChecks,
      upChecks,
      downChecks: totalChecks - upChecks
    };
  }
}

/**
 * Custom metrics collection system
 */
export class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.timeSeries = new Map();
    this.maxDataPoints = 1000;
  }

  // Record a counter metric
  increment(name, value = 1, tags = {}) {
    const key = this.buildKey(name, tags);
    const current = this.metrics.get(key) || { type: 'counter', value: 0, tags };
    current.value += value;
    current.lastUpdated = new Date();
    this.metrics.set(key, current);
  }

  // Record a gauge metric
  gauge(name, value, tags = {}) {
    const key = this.buildKey(name, tags);
    this.metrics.set(key, {
      type: 'gauge',
      value,
      tags,
      lastUpdated: new Date()
    });
    
    // Store in time series
    this.addToTimeSeries(key, value);
  }

  // Record a histogram metric
  histogram(name, value, tags = {}) {
    const key = this.buildKey(name, tags);
    const metric = this.metrics.get(key) || {
      type: 'histogram',
      values: [],
      tags,
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity
    };
    
    metric.values.push(value);
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.lastUpdated = new Date();
    
    // Keep only recent values
    if (metric.values.length > 1000) {
      metric.values.shift();
    }
    
    this.metrics.set(key, metric);
  }

  buildKey(name, tags) {
    const tagString = Object.keys(tags)
      .sort()
      .map(key => `${key}:${tags[key]}`)
      .join(',');
    return tagString ? `${name}{${tagString}}` : name;
  }

  addToTimeSeries(key, value) {
    if (!this.timeSeries.has(key)) {
      this.timeSeries.set(key, []);
    }
    
    const series = this.timeSeries.get(key);
    series.push({
      timestamp: new Date(),
      value
    });
    
    // Limit data points
    if (series.length > this.maxDataPoints) {
      series.shift();
    }
  }

  getMetric(name, tags = {}) {
    const key = this.buildKey(name, tags);
    return this.metrics.get(key);
  }

  getAllMetrics() {
    const result = {};
    this.metrics.forEach((metric, key) => {
      result[key] = { ...metric };
      
      // Add calculated fields for histograms
      if (metric.type === 'histogram' && metric.count > 0) {
        const values = [...metric.values].sort((a, b) => a - b);
        result[key].avg = metric.sum / metric.count;
        result[key].p50 = this.getPercentile(values, 50);
        result[key].p95 = this.getPercentile(values, 95);
        result[key].p99 = this.getPercentile(values, 99);
      }
    });
    return result;
  }

  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.floor((percentile / 100) * sortedArray.length);
    return sortedArray[index] || 0;
  }

  getTimeSeries(name, tags = {}) {
    const key = this.buildKey(name, tags);
    return this.timeSeries.get(key) || [];
  }

  reset() {
    this.metrics.clear();
    this.timeSeries.clear();
    logger.info('[METRICS]: All metrics reset');
  }
}

// Global instances
export const alertManager = new AlertManager();
export const uptimeMonitor = new UptimeMonitor();
export const metricsCollector = new MetricsCollector();

logger.info('[MONITORING]: Monitoring systems initialized successfully');