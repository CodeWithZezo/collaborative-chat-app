import { Request, Response, NextFunction } from 'express';
import { ResponseFormatter } from '../utils/response.util';
import logger from '../config/logger.config';
import { config } from '../config';

/**
 * Custom error class
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, code?: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error types
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service error') {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler - 404 errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route not found: ${req.method} ${req.path}`);
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction): void => {
  let error = err;

  // Convert non-AppError errors to AppError
  if (!(error instanceof AppError)) {
    error = new AppError(
      error.message || 'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }

  const appError = error as AppError;

  // Log error
  if (appError.statusCode >= 500) {
    logger.error('Server error', {
      message: appError.message,
      statusCode: appError.statusCode,
      code: appError.code,
      stack: appError.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      ip: req.ip,
    });
  } else if (appError.statusCode >= 400) {
    logger.warn('Client error', {
      message: appError.message,
      statusCode: appError.statusCode,
      code: appError.code,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
    });
  }

  // Send error response
  const response = {
    success: false,
    message: appError.message,
    error: {
      code: appError.code || `ERROR_${appError.statusCode}`,
      message: appError.message,
      ...(appError.details && { details: appError.details }),
      ...(config.app.isDevelopment && { stack: appError.stack }),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  res.status(appError.statusCode).json(response);
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
    });

    // Give time for logger to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
    });

    // Give time for logger to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};

/**
 * Graceful shutdown handler
 */
export const handleGracefulShutdown = (server: any): void => {
  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, starting graceful shutdown`);

    server.close(() => {
      logger.info('HTTP server closed');

      // Close database connections, redis, etc.
      // This will be called from the main server file

      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Validation error formatter for express-validator
 */
export const formatValidationErrors = (errors: any[]): Record<string, string[]> => {
  const formatted: Record<string, string[]> = {};

  errors.forEach((error) => {
    const field = error.path || error.param || 'unknown';
    if (!formatted[field]) {
      formatted[field] = [];
    }
    formatted[field].push(error.msg);
  });

  return formatted;
};

/**
 * Database error handler
 */
export const handleDatabaseError = (error: any): AppError => {
  // Handle specific database errors
  if (error.code === '23505') {
    // Unique constraint violation (PostgreSQL)
    return new ConflictError('Resource already exists');
  }

  if (error.code === '23503') {
    // Foreign key constraint violation (PostgreSQL)
    return new ValidationError('Referenced resource does not exist');
  }

  if (error.code === '22P02') {
    // Invalid text representation (PostgreSQL)
    return new ValidationError('Invalid data format');
  }

  // Generic database error
  return new DatabaseError('Database operation failed');
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  asyncHandler,
  notFoundHandler,
  errorHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  handleGracefulShutdown,
  formatValidationErrors,
  handleDatabaseError,
};