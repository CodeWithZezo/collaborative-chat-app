import { body, param, query } from 'express-validator';

/**
 * Auth validators
 */
export const authValidators = {
  register: [
    body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_-]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
    body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
  ],

  login: [
    body('identifier').trim().notEmpty(),
    body('password').notEmpty(),
  ],

  verifyEmail: [
    body('userId').isUUID(),
    body('token').notEmpty(),
  ],

  forgotPassword: [
    body('email').isEmail().normalizeEmail(),
  ],

  resetPassword: [
    body('userId').isUUID(),
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  ],

  changePassword: [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  ],
};

/**
 * User validators
 */
export const userValidators = {
  updateProfile: [
    body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('avatarUrl').optional().isURL(),
  ],

  updateRole: [
    body('role').isIn(['super_admin', 'admin', 'moderator', 'user', 'guest']),
  ],
};

/**
 * Channel validators
 */
export const channelValidators = {
  create: [
    body('name').trim().isLength({ min: 2, max: 50 }).matches(/^[a-zA-Z0-9_-]+$/),
    body('description').optional().trim().isLength({ max: 500 }),
    body('type').isIn(['public', 'private', 'direct', 'group']),
  ],
};

/**
 * Message validators
 */
export const messageValidators = {
  send: [
    body('channelId').isUUID(),
    body('content').trim().notEmpty().isLength({ max: 5000 }),
    body('type').optional().isIn(['text', 'file', 'image', 'video', 'audio']),
  ],
};

/**
 * Task validators
 */
export const taskValidators = {
  create: [
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('status').optional().isIn(['todo', 'in_progress', 'in_review', 'done', 'cancelled']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('dueDate').optional().isISO8601(),
    body('assignedToId').optional().isUUID(),
    body('channelId').optional().isUUID(),
  ],

  updateStatus: [
    body('status').isIn(['todo', 'in_progress', 'in_review', 'done', 'cancelled']),
  ],
};

/**
 * Common validators
 */
export const commonValidators = {
  uuid: (field: string = 'id') => param(field).isUUID(),
  pagination: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
};