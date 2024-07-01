# SmarterBackend

Welcome to SmarterBackend - a sophisticated and modular Node.js backend for static web hosting. This repository offers a robust, easily configurable backend solution.

## Features

- **Modular Architecture**: Organized codebase with separate modules for routes, logging, and utilities.
- **Advanced Logging**: Configurable with Winston, supporting console and file logging.
- **Customizable Configuration**: Extensive settings for server behavior, API usage, and logging.
- **Enhanced Security**: Basic authentication and CORS support.
- **Middleware Enhancements**: Request size limits and HTTP request logging.
- **Efficient Routing**: Decoupled route handling for better maintainability.
- **Utility Functions**: Disk space and network statistics retrieval.
- **Bare Server Integration**: Supports proxying with @tomphttp/bare-server-node.

## Installation

Clone the project and install dependencies:

```bash
git clone https://github.com/zgr2575/SmarterBackend.git
cd SmarterBackend
npm install
```

## Usage

Start the server:

```bash
node index.js
```

## Configuration

Customize your `config.js` for API usage, logging levels, and other server settings:

```javascript
const config = {
  port: process.env.PORT || 8080,
  apiUsage: false, // Setting this to true will enable the ability to access this server as an API.
  loggerEnabled: true, // Enable or disable logging
  loggerToFile: true, // Enable or disable logging to a file
  logFile: 'server.log', // Log file name
  logLevel: 'info', // Log level (error, warn, info, verbose, debug, silly)
  version: 3, // Server version
  updateAvailable: false, // Whether an update is available
  maxRequestSize: '1mb', // Max request size for JSON and URL-encoded data
  staticFolder: 'static', // Static files folder
};

export default config;
```

## Logging

Setup logging using Winston in `logger.js`:

```javascript
import winston from 'winston';
import config from './config.js';

const transports = [
  new winston.transports.Console(),
];

if (config.loggerToFile) {
  transports.push(new winston.transports.File({ filename: config.logFile }));
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: transports,
});

export default logger;
```

## Routing

Organized route handling in `routes.js`:

```javascript
import express from 'express';
import { getServerStats } from './utils.js';
import logger from './logger.js';

const router = express.Router();

router.get('/d/data', async (req, res) => {
  try {
    const serverStats = await getServerStats();
    logger.info("Server data requested and sent.");
    res.json(serverStats);
  } catch (error) {
    logger.error("Error in /d/data route:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
```

## Utilities

Utility functions in `utils.js`:

```javascript
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);

export const getTotalDiskSpace = () => {
  const totalDiskSpaceInBytes = os.totalmem();
  return (totalDiskSpaceInBytes / (1024 ** 3)).toFixed(2) + " GB";
};

export const getNetworkStats = async () => {
  try {
    const { stdout } = await execPromise("netstat -e");
    const lines = stdout.split("\n");
    return {
      sent: lines[2]?.trim().split(/\s+/)[1] || "N/A",
      received: lines[2]?.trim().split(/\s+/)[0] || "N/A",
    };
  } catch (error) {
    console.error("Error fetching network stats:", error);
    return { sent: "N/A", received: "N/A" };
  }
};

export const getServerStats = async () => {
  const diskSpace = getTotalDiskSpace();
  const networkStats = await getNetworkStats();
  return {
    server: "Smarter Back End v5",
    version: 3,
    updateAvailable: false,
    serverUptime: process.uptime(),
    serverMemory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + " MB",
    serverId: Math.floor(Math.random() * 101),
    serverIdentity: "SBE SERVER",
    cpuUsage: process.cpuUsage(),
    diskSpace: diskSpace,
    networkStats: networkStats,
  };
};
```

## API Documentation

### Base URL

```
http://localhost:8080
```

### Get Server Data

#### URL

```
GET /d/data
```

#### Description

Retrieves server statistics including disk space, network stats, memory usage, and uptime.

#### Response

```json
{
  "server": "Smarter Back End v5",
  "version": 3,
  "updateAvailable": false,
  "serverUptime": 12345.67,
  "serverMemory": "50.23 MB",
  "serverId": 42,
  "serverIdentity": "SBE SERVER",
  "cpuUsage": {
    "user": 123456,
    "system": 654321
  },
  "diskSpace": "15.62 GB",
  "networkStats": {
    "sent": "123456",
    "received": "654321"
  }
}
```

### 404 Not Found

#### URL

```
ANY /{any}
```

#### Description

Handles any undefined routes and returns a 404 Not Found response.

#### Response

```
404 Not Found
```

### 500 Internal Server Error

#### URL

```
ANY /{any}
```

#### Description

Handles any server errors and returns a 500 Internal Server Error response.

#### Response

```
500 Internal Server Error
```

## Changelog

### v4.0.0

- **Modularization**: Created separate `routes.js`, `logger.js`, and `utils.js`.
- **Logging Improvements**: Added initialization messages and enhanced configuration.
- **Configuration Enhancements**: Improved `config.js` with additional settings.
- **Middleware Enhancements**: Added request size limits and integrated Morgan with Winston.
- **Routing Enhancements**: Decoupled route handling with specific logging.
- **Utility Enhancements**: Moved utility functions to `utils.js`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
