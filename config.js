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
  