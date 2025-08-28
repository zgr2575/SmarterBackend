# SmarterBackend v7.0 🚀

Welcome to SmarterBackend - a sophisticated, enterprise-ready Node.js backend solution with comprehensive monitoring, security, and performance features. This repository offers a robust, scalable, and easily configurable backend solution with 50+ advanced features.

## ✨ Key Features

### 🔒 Security & Authentication
- **API Key Management**: Full CRUD operations with role-based permissions
- **IP Whitelist/Blacklist**: Comprehensive IP filtering system
- **Request Signature Validation**: HMAC-based request integrity verification
- **Input Sanitization**: XSS prevention and data validation
- **Audit Logging**: Complete request/response tracking
- **Rate Limiting**: Advanced rate limiting with multiple tiers

### 📊 Monitoring & Analytics
- **Health Checks**: Comprehensive system health monitoring
- **Performance Metrics**: Real-time performance tracking and analysis
- **Alert System**: Configurable threshold-based alerting
- **Uptime Monitoring**: Detailed availability reporting
- **Custom Metrics**: User-defined metric collection system
- **Resource Monitoring**: Memory, CPU, disk, and network monitoring

### ⚡ Performance & Caching
- **Response Compression**: Intelligent compression middleware
- **Memory Optimization**: Automatic memory management
- **Static Asset Optimization**: Enhanced caching strategies
- **Performance Profiling**: Built-in benchmarking tools
- **Request Analytics**: Detailed request/response analysis

### 🛠 Developer Experience
- **Comprehensive Testing**: Jest-based testing infrastructure
- **API Documentation**: Auto-generated Swagger documentation
- **Development Tools**: Debug logging and monitoring
- **Environment Configuration**: Flexible environment-based config
- **Error Handling**: Structured error responses with stack traces

### 🔧 Utility Features
- **Data Validation**: Email, URL, IP, port validation utilities
- **Data Formatting**: Bytes, duration, percentage formatters
- **File Management**: File system access and management tools
- **System Information**: Detailed system and environment reporting

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/zgr2575/SmarterBackend.git
cd SmarterBackend
npm install
```

### Basic Usage

```bash
# Start the server
npm start

# Run tests
npm test

# Generate test coverage
npm run test:coverage

# Watch tests during development
npm run test:watch
```

### Environment Configuration

Create a `.env` file for environment-specific settings:

```env
PORT=8080
NODE_ENV=production
LOG_LEVEL=info
LOGGER_ENABLED=true
LOGGER_TO_FILE=true
MAX_REQUEST_SIZE=1mb
STATIC_FOLDER=static
```

## 📡 API Endpoints

### Health & Status
- `GET /health` - Comprehensive health check with detailed system status
- `GET /ping` - Simple connectivity test
- `GET /status` - Quick status for load balancers

### System Information
- `GET /metrics` - Detailed system metrics and performance data
- `GET /environment` - Environment configuration (sensitive data redacted)
- `GET /config` - Server configuration (safe fields only)

### Validation & Formatting
- `POST /api/v1/validate` - Input validation service (email, URL, IP, etc.)
- `POST /api/v1/format` - Data formatting service (bytes, duration, percentage)

### Performance & Monitoring
- `GET /api/v1/performance` - Performance metrics and cache statistics
- `GET /api/v1/alerts` - Recent alerts and threshold information
- `GET /api/v1/uptime` - Uptime statistics and availability reports
- `POST /api/v1/benchmark` - Performance benchmarking tool

### Administration (Requires API Key)
- `GET /api/v1/admin/apikeys` - List API keys
- `POST /api/v1/admin/apikeys` - Create new API key
- `DELETE /api/v1/admin/apikeys/:key` - Revoke API key

### Legacy Support
- `GET /d/data` - Server data (legacy endpoint)
- `GET /d/data/cpu` - CPU data (legacy endpoint)

## 🔐 Security

### API Key Authentication

Generate API keys for secure access to admin endpoints:

```bash
curl -X POST http://localhost:8080/api/v1/admin/apikeys \
  -H "X-API-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "new-service", "role": "readonly", "permissions": ["read"]}'
```

### Rate Limiting

Built-in rate limiting protects against abuse:
- General API: 100 requests per 15 minutes
- Authentication: 5 attempts per 15 minutes
- Admin operations: 20 requests per 15 minutes

### IP Management

Control access with IP whitelisting/blacklisting:

```javascript
// Add IP to whitelist
ipManager.addToWhitelist('192.168.1.100');

// Add IP to blacklist
ipManager.addToBlacklist('10.0.0.50');
```

## 📈 Monitoring

### Health Checks

The health endpoint provides comprehensive system monitoring:

```json
{
  "status": "healthy",
  "uptime": 3600.5,
  "checks": {
    "memory": {
      "status": "healthy",
      "details": {
        "usagePercent": 45.2
      }
    },
    "cpu": {
      "status": "healthy",
      "details": {
        "loadAverage": {"1min": 0.8}
      }
    },
    "disk": {
      "status": "healthy"
    }
  }
}
```

### Performance Metrics

Track performance with detailed metrics:

```json
{
  "summary": {
    "totalRequests": 1250,
    "errorRate": 2.1,
    "avgResponseTime": 45.2
  },
  "responseTimePercentiles": {
    "p50": 35,
    "p95": 120,
    "p99": 250
  }
}
```

### Alert System

Configure alerts for system thresholds:

```javascript
// Update memory threshold
alertManager.updateThreshold('memory', 'warning', 85);
alertManager.updateThreshold('memory', 'critical', 95);
```

## 🧪 Testing

Comprehensive test suite with Jest:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

Test categories:
- **API Tests**: Endpoint functionality and responses
- **Security Tests**: Authentication and authorization
- **Performance Tests**: Response times and concurrency
- **Validation Tests**: Input validation utilities
- **Integration Tests**: End-to-end functionality

## 📊 Performance Optimization

### Caching Strategy

Built-in caching with statistics:

```javascript
// Cache responses for 5 minutes
app.use('/api/data', cacheManager.middleware({
  ttl: 300,
  keyGenerator: (req) => `data:${req.query.type}`
}));
```

### Memory Management

Automatic memory optimization:

```javascript
// Start memory monitoring
memoryOptimizer.startMonitoring();

// Set custom threshold (100MB)
memoryOptimizer.setMemoryThreshold(100);
```

### Compression

Intelligent response compression:
- Threshold: 1KB minimum
- Level: 6 (balanced compression/speed)
- Supports gzip, deflate, br

## 🔧 Configuration

### Basic Configuration

```javascript
const config = {
  port: process.env.PORT || 8080,
  logLevel: process.env.LOG_LEVEL || 'info',
  loggerEnabled: process.env.LOGGER_ENABLED === 'true',
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb',
  staticFolder: process.env.STATIC_FOLDER || 'static'
};
```

### Security Configuration

```javascript
// API key permissions
const permissions = ['read', 'write', 'admin'];

// Rate limiting
const rateLimits = {
  general: 100,    // per 15 minutes
  auth: 5,         // per 15 minutes  
  admin: 20        // per 15 minutes
};
```

## 📝 API Documentation

### Swagger Documentation

Access interactive API documentation at:
```
http://localhost:8080/api-docs
```

### Example Requests

#### Validate Email
```bash
curl -X POST http://localhost:8080/api/v1/validate \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "value": "user@example.com"}'
```

#### Format Bytes
```bash
curl -X POST http://localhost:8080/api/v1/format \
  -H "Content-Type: application/json" \
  -d '{"type": "bytes", "value": 1048576}'
```

#### Get Health Status
```bash
curl http://localhost:8080/health
```

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**:
   ```bash
   NODE_ENV=production
   PORT=8080
   LOG_LEVEL=warn
   ```

2. **Process Management** (PM2):
   ```bash
   npm install -g pm2
   pm2 start index.js --name "smarterbackend"
   ```

3. **Reverse Proxy** (Nginx):
   ```nginx
   location / {
     proxy_pass http://localhost:8080;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
   }
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "index.js"]
```

## 📊 Monitoring Integration

### Metrics Export

Export metrics to external monitoring systems:

```javascript
// Custom metrics
metricsCollector.increment('api.requests', 1, {endpoint: '/health'});
metricsCollector.gauge('memory.usage', process.memoryUsage().heapUsed);
metricsCollector.histogram('response.time', responseTime);
```

### Alert Webhooks

Configure webhooks for critical alerts:

```javascript
alertManager.on('alert', (alert) => {
  if (alert.level === 'critical') {
    // Send to Slack, PagerDuty, etc.
    webhookSender.send(alert);
  }
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Add tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 📋 Changelog

### v7.0.0 - Major QOL Update (50 New Features)

#### 🆕 New Features
- Comprehensive health monitoring system
- Advanced security middleware with API key management
- Performance monitoring and metrics collection
- Alert system with configurable thresholds
- Uptime monitoring and availability reporting
- Caching layer with statistics
- Memory optimization tools
- Input validation and data formatting utilities
- Testing infrastructure with Jest
- Enhanced error handling and logging

#### 🔒 Security Enhancements
- API key-based authentication with RBAC
- IP whitelist/blacklist management
- Request signature validation
- Input sanitization middleware
- Comprehensive audit logging

#### ⚡ Performance Improvements
- Response compression middleware
- Static asset optimization
- Memory usage monitoring
- Performance benchmarking tools
- Request/response caching

#### 🛠 Developer Experience
- Complete test suite with coverage
- Enhanced API documentation
- Development debugging tools
- Environment-based configuration
- Structured error responses

### v6.0.0 - Previous Release
- API support with Swagger documentation
- Logging improvements
- Configuration enhancements
- Bug fixes and routing improvements
- Utility enhancements
- Rate limiting implementation
- Enhanced error handling

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Express.js for the robust web framework
- Winston for excellent logging capabilities
- Jest for comprehensive testing framework
- Swagger for API documentation
- All contributors and users of SmarterBackend

---

**SmarterBackend v7.0** - A truly "smarter" solution for modern backend development! 🎉