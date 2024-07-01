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
  transports: transports
});

logger.info("Logger has been initialized successfully");

export default logger;
