import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { redisManager } from '../config/redis.config';
import { config } from '../config';
import { ResponseFormatter } from '../utils/response.util';
import logger from '../config/logger.config';

/**
 * Redis store for rate limiting (for distributed systems)
 */
class RedisStore {
  private prefix: string;

  constructor(prefix: string = 'rate-limit:') {
    this.prefix = prefix;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const redisKey = `${this.prefix}${key}`;

    try {
      const client = redisManager.getClient();

      // Increment counter
      const hits = await client.incr(redisKey);

      // Set expiry on first request
      if (hits === 1) {
        await client.expire(redisKey, config.security.rateLimitWindowMs / 1000);
      }

      // Get TTL for reset time
      const ttl = await client.ttl(redisKey);
      const resetTime = new Date(Date.now() + ttl * 1000);

      return {
        totalHits: hits,
        resetTime,
      };
    } catch (error) {
      logger.error('Redis rate limit store error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback: allow request if Redis fails
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + config.security.rateLimitWindowMs),
      };
    }
  }

  async decrement(key: string): Promise<void> {
    const redisKey = `${this.prefix}${key}`;

    try {
      const client = redisManager.getClient();
      await client.decr(redisKey);
    } catch (error) {
      logger.error('Redis rate limit decrement error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = `${this.prefix}${key}`;

    try {
      const client = redisManager.getClient();
      await client.del(redisKey);
    } catch (error) {
      logger.error('Redis rate limit reset error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Custom rate limit handler
 */
const rateLimitHandler = (req: Request, res: Response): void => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    userId: req.user?.userId,
  });

  ResponseFormatter.tooManyRequests(res, 'Too many requests, please try again later');
};

/**
 * Skip rate limit for certain conditions
 */
const skipRateLimit = (req: Request): boolean => {
  // Skip for admin bypass
  if ((req as any).skipRateLimit) {
    return true;
  }

  // Skip for health check endpoints
  if (req.path === '/health' || req.path === '/api/health') {
    return true;
  }

  return false;
};

/**
 * Key generator for rate limiting
 */
const keyGenerator = (req: Request): string => {
  // Use user ID if authenticated, otherwise use IP
  return req.user?.userId || req.ip || 'unknown';
};

/**
 * General API rate limiter
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  handler: rateLimitHandler,
  keyGenerator,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: rateLimitHandler,
  keyGenerator: (req: Request) => req.ip || 'unknown',
});

/**
 * Rate limiter for registration
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: 'Too many accounts created, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req: Request) => req.ip || 'unknown',
});

/**
 * Rate limiter for password reset
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req: Request) => req.body.email || req.ip || 'unknown',
});

/**
 * Rate limiter for file uploads
 */
export const fileUploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  handler: rateLimitHandler,
  keyGenerator,
});

/**
 * Rate limiter for search requests
 */
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  handler: rateLimitHandler,
  keyGenerator,
});

/**
 * Rate limiter for message sending
 */
export const messageSendRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: 'You are sending messages too quickly',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  handler: rateLimitHandler,
  keyGenerator,
});

/**
 * Custom rate limiter with Redis store
 */
export const createCustomRateLimiter = (options: {
  windowMs: number;
  max: number;
  prefix?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  const store = new RedisStore(options.prefix);

  return async (req: Request, res: Response, next: Function): Promise<void> => {
    if (skipRateLimit(req)) {
      next();
      return;
    }

    const key = keyGenerator(req);

    try {
      const { totalHits, resetTime } = await store.increment(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - totalHits).toString());
      res.setHeader('X-RateLimit-Reset', resetTime.getTime().toString());

      if (totalHits > options.max) {
        logger.warn('Custom rate limit exceeded', {
          key,
          hits: totalHits,
          limit: options.max,
          path: req.path,
        });

        rateLimitHandler(req, res);
        return;
      }

      // Decrement on successful request if option is set
      if (options.skipSuccessfulRequests) {
        res.on('finish', () => {
          if (res.statusCode < 400) {
            store.decrement(key).catch((error) => {
              logger.error('Failed to decrement rate limit', {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            });
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Allow request if rate limiting fails
      next();
    }
  };
};

/**
 * Dynamic rate limiter based on user role
 */
export const dynamicRateLimiter = (req: Request, res: Response, next: Function): void => {
  const baseLimit = config.security.rateLimitMaxRequests;

  // Adjust limit based on user role
  let limit = baseLimit;

  if (req.user) {
    switch (req.user.role) {
      case 'super_admin':
        limit = baseLimit * 10; // 10x for super admins
        break;
      case 'admin':
        limit = baseLimit * 5; // 5x for admins
        break;
      case 'moderator':
        limit = baseLimit * 2; // 2x for moderators
        break;
      default:
        limit = baseLimit;
    }
  }

  const limiter = createCustomRateLimiter({
    windowMs: config.security.rateLimitWindowMs,
    max: limit,
    prefix: 'dynamic-rate-limit:',
  });

  limiter(req, res, next);
};

export default {
  generalRateLimiter,
  authRateLimiter,
  registrationRateLimiter,
  passwordResetRateLimiter,
  fileUploadRateLimiter,
  searchRateLimiter,
  messageSendRateLimiter,
  createCustomRateLimiter,
  dynamicRateLimiter,
};