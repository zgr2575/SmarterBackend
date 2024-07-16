import dotenv from "dotenv";
dotenv.config();

const config = {
    port: process.env.PORT || 8080,
    apiUsage: process.env.API_USAGE === 'true',
    loggerEnabled: process.env.LOGGER_ENABLED === 'true',
    loggerToFile: process.env.LOGGER_TO_FILE === 'true',
    logFile: process.env.LOG_FILE || 'server.log',
    logLevel: process.env.LOG_LEVEL || 'info',
    version: process.env.VERSION || 3,
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb',
    staticFolder: process.env.STATIC_FOLDER || 'static',
};

export default config;

