
import winston from "winston";
import config from "./config.js";

const transports = [new winston.transports.Console()];


if (config.loggerToFile) {
  transports.push(new winston.transports.File({ filename: config.logFile }));
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.colorize(),

    winston.format.simple(),
  ),
  transports: transports,
});

logger.add(new winston.transports.Console({
  format: winston.format.printf(({ message }) => {
    return message.includes('netstat -e') ? 
      `Error fetching network stats: For full log see your log file` :
      message.includes('GET /d/data') ? 
        `Request received from ${message.split(' ')[0]} - For full log see your log file` :
        message;
  }),
}));


logger.info("Logger has been initialized successfully");

export default logger;
