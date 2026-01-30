import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from './index';

// Define custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports
const transports: winston.transport[] = [];

// Console transport
if (config.app.isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.logging.level,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: config.logging.level,
    })
  );
}

// File transport - All logs
transports.push(
  new DailyRotateFile({
    filename: path.join(config.logging.filePath, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
    level: config.logging.level,
  })
);

// File transport - Error logs only
transports.push(
  new DailyRotateFile({
    filename: path.join(config.logging.filePath, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
    level: 'error',
  })
);

// File transport - HTTP request logs
transports.push(
  new DailyRotateFile({
    filename: path.join(config.logging.filePath, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d',
    format: logFormat,
    level: 'http',
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
  // Don't log in test environment unless explicitly needed
  silent: config.app.isTest,
});

// Create a stream object for Morgan HTTP logger integration
export const loggerStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
export const loggerHelper = {
  logError: (error: Error, context?: Record<string, unknown>): void => {
    logger.error('Error occurred', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  },

  logInfo: (message: string, meta?: Record<string, unknown>): void => {
    logger.info(message, meta);
  },

  logWarning: (message: string, meta?: Record<string, unknown>): void => {
    logger.warn(message, meta);
  },

  logDebug: (message: string, meta?: Record<string, unknown>): void => {
    logger.debug(message, meta);
  },

  logHttp: (message: string, meta?: Record<string, unknown>): void => {
    logger.http(message, meta);
  },

  logAudit: (action: string, userId: string, details?: Record<string, unknown>): void => {
    logger.info('Audit Log', {
      type: 'AUDIT',
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  logPerformance: (operation: string, duration: number, meta?: Record<string, unknown>): void => {
    logger.info('Performance Log', {
      type: 'PERFORMANCE',
      operation,
      duration,
      unit: 'ms',
      ...meta,
    });
  },

  logSecurity: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: Record<string, unknown>): void => {
    logger.warn('Security Event', {
      type: 'SECURITY',
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },
};

export default logger;