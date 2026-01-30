// Export authentication middleware
export * from './auth.middleware';
export { default as authMiddleware } from './auth.middleware';

// Export authorization middleware
export * from './authorization.middleware';
export { default as authorizationMiddleware } from './authorization.middleware';

// Export error handling middleware
export * from './error.middleware';
export { default as errorMiddleware } from './error.middleware';

// Export rate limiting middleware
export * from './rateLimit.middleware';
export { default as rateLimitMiddleware } from './rateLimit.middleware';

// Export validation middleware
export * from './validation.middleware';
export { default as validationMiddleware } from './validation.middleware';

// Export logging middleware
export * from './logger.middleware';
export { default as loggerMiddleware } from './logger.middleware';