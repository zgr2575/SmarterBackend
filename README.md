---

# SmarterBackend

Welcome to SmarterBackend - your go-to solution for efficient backend operations on Node.js. This repository houses the essential codebase that empowers SmarterBackend, providing a streamlined approach to handling backend tasks.

## Features

- **Modular Architecture**: Separate files for routes, logging, and utilities for better organization.
- **Advanced Logging**: Configurable logging with Winston, including optional file logging.
- **Enhanced Configuration**: Comprehensive settings for logging, server behavior, and request handling.
- **Middleware Enhancements**: Request size limits and optional HTTP request logging.
- **Efficient Routing**: Decoupled route handling with specific logging.
- **Utility Functions**: Disk space and network statistics.

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
  apiUsage: true, // Enable API access
  logging: {
    level: 'info', // Logging level
    file: 'server.log' // Log file
  },
  server: {
    port: 8080, // Server port
    requestLimit: '1mb' // Request size limit
  }
};
export default config;
```

## Use Case

SmarterBackend is ideal for developers and businesses looking to streamline their backend operations on Node.js. Whether building a web application, an API, or a backend service, SmarterBackend enhances your development process by providing a robust foundation for handling backend functionality.

## Changelog

### v4

- **Modularization**: Created separate `routes.js`, `logger.js`, and `utils.js`.
- **Logging Improvements**: Added initialization messages and enhanced configuration.
- **Configuration Enhancements**: Improved `config.js` with additional settings.
- **Middleware Enhancements**: Added request size limits and integrated Morgan with Winston.
- **Routing Enhancements**: Decoupled route handling with specific logging.
- **Utility Enhancements**: Moved utility functions to `utils.js`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
