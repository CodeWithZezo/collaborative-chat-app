import { Request, Response, NextFunction } from 'express';
import { ResponseFormatter } from '../utils/response.util';
import { UserRole } from '../models/user.model';
import logger from '../config/logger.config';

/**
 * Role hierarchy for permission checks
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.ADMIN]: 4,
  [UserRole.MODERATOR]: 3,
  [UserRole.USER]: 2,
  [UserRole.GUEST]: 1,
};

/**
 * Check if user has required role
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseFormatter.unauthorized(res, 'Authentication required');
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Authorization failed - insufficient role', {
        userId: req.user.userId,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      ResponseFormatter.forbidden(res, 'Insufficient permissions');
      return;
    }

    logger.debug('Authorization successful', {
      userId: req.user.userId,
      userRole,
      path: req.path,
    });

    next();
  };
};

/**
 * Check if user has minimum role level
 */
export const requireMinRole = (minRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseFormatter.unauthorized(res, 'Authentication required');
      return;
    }

    const userRole = req.user.role as UserRole;
    const userRoleLevel = ROLE_HIERARCHY[userRole];
    const minRoleLevel = ROLE_HIERARCHY[minRole];

    if (userRoleLevel < minRoleLevel) {
      logger.warn('Authorization failed - role level too low', {
        userId: req.user.userId,
        userRole,
        userRoleLevel,
        minRole,
        minRoleLevel,
        path: req.path,
      });

      ResponseFormatter.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};

/**
 * Check if user is admin or super admin
 */
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);

/**
 * Check if user is super admin
 */
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

/**
 * Check if user is moderator or higher
 */
export const requireModerator = requireMinRole(UserRole.MODERATOR);

/**
 * Check if user can access resource based on ownership or role
 */
export const requireOwnershipOrRole = (userIdParam: string = 'userId', minRole: UserRole = UserRole.MODERATOR) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseFormatter.unauthorized(res, 'Authentication required');
      return;
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    const userRole = req.user.role as UserRole;
    const userRoleLevel = ROLE_HIERARCHY[userRole];
    const minRoleLevel = ROLE_HIERARCHY[minRole];

    // Check if user owns the resource
    const isOwner = resourceUserId === req.user.userId;

    // Check if user has sufficient role
    const hasSufficientRole = userRoleLevel >= minRoleLevel;

    if (!isOwner && !hasSufficientRole) {
      logger.warn('Authorization failed - not owner and insufficient role', {
        userId: req.user.userId,
        resourceUserId,
        userRole,
        minRole,
        path: req.path,
      });

      ResponseFormatter.forbidden(res, 'Access denied');
      return;
    }

    next();
  };
};

/**
 * Check if user can perform admin action (super admin only or admin on non-admin users)
 */
export const requireAdminAction = (targetUserIdParam: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      ResponseFormatter.unauthorized(res, 'Authentication required');
      return;
    }

    const userRole = req.user.role as UserRole;

    // Super admin can do anything
    if (userRole === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    // Admin can only act on non-admin users
    if (userRole === UserRole.ADMIN) {
      const targetUserId = req.params[targetUserIdParam] || req.body[targetUserIdParam];

      // TODO: In a real implementation, fetch target user's role from database
      // For now, we'll allow the action and let the service layer handle the check
      next();
      return;
    }

    ResponseFormatter.forbidden(res, 'Insufficient permissions for this action');
  };
};

/**
 * Permission checker - flexible permission validation
 */
export const checkPermission = (permissionChecker: (req: Request) => boolean | Promise<boolean>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      ResponseFormatter.unauthorized(res, 'Authentication required');
      return;
    }

    try {
      const hasPermission = await permissionChecker(req);

      if (!hasPermission) {
        logger.warn('Authorization failed - custom permission check', {
          userId: req.user.userId,
          path: req.path,
        });

        ResponseFormatter.forbidden(res, 'Permission denied');
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user.userId,
        path: req.path,
      });

      ResponseFormatter.internalError(res, 'Failed to verify permissions');
    }
  };
};

/**
 * Rate limit bypass for admins
 */
export const adminBypassRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user) {
    const userRole = req.user.role as UserRole;
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
      // Mark request to bypass rate limiting
      (req as any).skipRateLimit = true;
    }
  }
  next();
};

export default {
  requireRole,
  requireMinRole,
  requireAdmin,
  requireSuperAdmin,
  requireModerator,
  requireOwnershipOrRole,
  requireAdminAction,
  checkPermission,
  adminBypassRateLimit,
};