import { Request, Response, NextFunction } from 'express';
import { TokenManager } from '../utils/tokenManager.util';
import { ResponseFormatter } from '../utils/response.util';
import { JWTPayload } from '../config/jwt.config';
import logger from '../config/logger.config';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        username: string;
        role: string;
      };
      token?: string;
    }
  }
}

/**
 * Authentication middleware - Verify JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseFormatter.unauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      ResponseFormatter.unauthorized(res, 'Invalid token format');
      return;
    }

    // Verify token
    const decoded: JWTPayload = await TokenManager.verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };

    req.token = token;

    logger.debug('User authenticated', {
      userId: decoded.userId,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    });

    if (error instanceof Error && error.message === 'Token expired') {
      ResponseFormatter.unauthorized(res, 'Token expired');
    } else if (error instanceof Error && error.message === 'Token has been revoked') {
      ResponseFormatter.unauthorized(res, 'Token has been revoked');
    } else {
      ResponseFormatter.unauthorized(res, 'Invalid token');
    }
  }
};

/**
 * Optional authentication middleware - Verify token if present, but don't require it
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      next();
      return;
    }

    // Verify token
    const decoded: JWTPayload = await TokenManager.verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };

    req.token = token;

    next();
  } catch (error) {
    // Token invalid, but continue without authentication
    logger.debug('Optional authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};

/**
 * Refresh token middleware - Extract and verify refresh token
 */
export const verifyRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      ResponseFormatter.badRequest(res, 'Refresh token is required');
      return;
    }

    // Store refresh token in request for controller to use
    req.body.refreshToken = refreshToken;

    next();
  } catch (error) {
    logger.error('Refresh token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    ResponseFormatter.unauthorized(res, 'Invalid refresh token');
  }
};

/**
 * Check if user is authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    ResponseFormatter.unauthorized(res, 'Authentication required');
    return;
  }
  next();
};

/**
 * Middleware to ensure user is accessing their own resource
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseFormatter.unauthorized(res, 'Authentication required');
      return;
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];

    if (resourceUserId !== req.user.userId) {
      ResponseFormatter.forbidden(res, 'Access denied: You can only access your own resources');
      return;
    }

    next();
  };
};

export default {
  authenticate,
  optionalAuthenticate,
  verifyRefreshToken,
  requireAuth,
  requireOwnership,
};