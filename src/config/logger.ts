import winston, { Logger } from "winston";
import fs from "fs";

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Define log format for console
const consoleFormat = printf(({ level, message, timestamp, stack }): string => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Define log format for files
const fileFormat = combine(timestamp(), errors({ stack: true }), json());

// Create logs directory if it doesn't exist
const logsDir = "logs";
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create winston logger
const logger: Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: fileFormat,
  defaultMeta: {
    service: "safe-deployment-service",
    version: "1.0.0",
  },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production then log to the `console`
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        consoleFormat
      ),
    })
  );
}

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: "logs/exceptions.log",
    maxsize: 5242880, // 5MB
    maxFiles: 3,
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: "logs/rejections.log",
    maxsize: 5242880, // 5MB
    maxFiles: 3,
  })
);

export default logger;
