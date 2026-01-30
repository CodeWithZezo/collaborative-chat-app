import morgan from 'morgan';
import { Request, Response } from 'express';
import logger, { loggerStream } from '../config/logger.config';
import { config } from '../config';

/**
 * Custom Morgan token for user ID
 */
morgan.token('user-id', (req: Request) => {
  return req.user?.userId || 'anonymous';
});

/**
 * Custom Morgan token for response time in milliseconds
 */
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '-';
});

/**
 * Custom Morgan token for request ID
 */
morgan.token('request-id', (req: Request) => {
  return (req as any).id || '-';
});

/**
 * Development logging format
 */
export const developmentLogger = morgan(
  ':method :url :status :response-time ms - :res[content-length] - :user-id',
  {
    stream: loggerStream,
  }
);

/**
 * Production logging format (JSON)
 */
export const productionLogger = morgan(
  (tokens, req: Request, res: Response) => {
    return JSON.stringify({
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: tokens.status(req, res),
      contentLength: tokens.res(req, res, 'content-length'),
      responseTime: tokens['response-time'](req, res),
      userId: tokens['user-id'](req, res),
      requestId: tokens['request-id'](req, res),
      ip: tokens['remote-addr'](req, res),
      userAgent: tokens['user-agent'](req, res),
      timestamp: new Date().toISOString(),
    });
  },
  {
    stream: loggerStream,
  }
);

/**
 * Request ID middleware
 */
export const requestId = (req: Request, res: Response, next: Function): void => {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  (req as any).id = id;
  res.setHeader('X-Request-ID', id);
  next();
};

/**
 * Response time middleware
 */
export const responseTime = (req: Request, res: Response, next: Function): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', duration.toString());

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration,
        userId: req.user?.userId,
      });
    }
  });

  next();
};

/**
 * Request details logger
 */
export const logRequestDetails = (req: Request, res: Response, next: Function): void => {
  logger.debug('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
    body: config.app.isDevelopment ? req.body : undefined,
  });

  next();
};

/**
 * Response logger
 */
export const logResponse = (req: Request, res: Response, next: Function): void => {
  const originalSend = res.send;

  res.send = function (data: any): Response {
    res.send = originalSend;

    logger.debug('Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userId: req.user?.userId,
      responseData: config.app.isDevelopment && res.statusCode >= 400 ? data : undefined,
    });

    return res.send(data);
  };

  next();
};

/**
 * Skip logging for certain routes
 */
const skipRoutes = ['/health', '/api/health', '/favicon.ico'];

export const shouldSkipLogging = (req: Request): boolean => {
  return skipRoutes.includes(req.path);
};

/**
 * Conditional logger based on environment
 */
export const conditionalLogger = config.app.isDevelopment ? developmentLogger : productionLogger;

/**
 * Complete logging middleware stack
 */
export const loggingMiddleware = [requestId, responseTime, conditionalLogger];

/**
 * API metrics collector
 */
export class ApiMetrics {
  private static requests: Map<string, number> = new Map();
  private static errors: Map<string, number> = new Map();
  private static responseTimes: Map<string, number[]> = new Map();

  static recordRequest(endpoint: string): void {
    const count = this.requests.get(endpoint) || 0;
    this.requests.set(endpoint, count + 1);
  }

  static recordError(endpoint: string): void {
    const count = this.errors.get(endpoint) || 0;
    this.errors.set(endpoint, count + 1);
  }

  static recordResponseTime(endpoint: string, time: number): void {
    const times = this.responseTimes.get(endpoint) || [];
    times.push(time);

    // Keep only last 100 response times
    if (times.length > 100) {
      times.shift();
    }

    this.responseTimes.set(endpoint, times);
  }

  static getMetrics(): {
    requests: Record<string, number>;
    errors: Record<string, number>;
    avgResponseTimes: Record<string, number>;
  } {
    const avgResponseTimes: Record<string, number> = {};

    this.responseTimes.forEach((times, endpoint) => {
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      avgResponseTimes[endpoint] = Math.round(avg);
    });

    return {
      requests: Object.fromEntries(this.requests),
      errors: Object.fromEntries(this.errors),
      avgResponseTimes,
    };
  }

  static reset(): void {
    this.requests.clear();
    this.errors.clear();
    this.responseTimes.clear();
  }
}

/**
 * Metrics collection middleware
 */
export const metricsCollector = (req: Request, res: Response, next: Function): void => {
  if (!config.monitoring.enableMetrics) {
    next();
    return;
  }

  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  const startTime = Date.now();

  ApiMetrics.recordRequest(endpoint);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    ApiMetrics.recordResponseTime(endpoint, duration);

    if (res.statusCode >= 400) {
      ApiMetrics.recordError(endpoint);
    }
  });

  next();
};

export default {
  developmentLogger,
  productionLogger,
  requestId,
  responseTime,
  logRequestDetails,
  logResponse,
  conditionalLogger,
  loggingMiddleware,
  metricsCollector,
  ApiMetrics,
};