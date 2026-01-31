import { Router } from 'express';
import {
  authController,
  userController,
  messageController,
  channelController,
  taskController,
  notificationController,
  healthController,
} from '../controllers';
import {
  authenticate,
  optionalAuthenticate,
} from '../middlewares/auth.middleware';
import {
  requireRole,
  requireAdmin,
  requireOwnershipOrRole,
} from '../middlewares/authorization.middleware';
import {
  authRateLimiter,
  registrationRateLimiter,
  passwordResetRateLimiter,
  generalRateLimiter,
  messageSendRateLimiter,
  searchRateLimiter,
} from '../middlewares/rateLimit.middleware';
import { handleValidationErrors } from '../middlewares/validation.middleware';
import {
  authValidators,
  userValidators,
  channelValidators,
  messageValidators,
  taskValidators,
  commonValidators,
} from '../validators';
import { UserRole } from '../models/user.model';

const router = Router();

/**
 * Health routes
 */
router.get('/health', healthController.healthCheck);
router.get('/api/health', healthController.healthCheck);
router.get('/api/health/detailed', authenticate, requireAdmin, healthController.detailedHealthCheck);
router.get('/api/health/metrics', authenticate, requireAdmin, healthController.getMetrics);
router.post('/api/health/metrics/reset', authenticate, requireAdmin, healthController.resetMetrics);

/**
 * Auth routes
 */
const authRouter = Router();

authRouter.post(
  '/register',
  registrationRateLimiter,
  authValidators.register,
  handleValidationErrors,
  authController.register
);

authRouter.post(
  '/login',
  authRateLimiter,
  authValidators.login,
  handleValidationErrors,
  authController.login
);

authRouter.post(
  '/logout',
  authenticate,
  authController.logout
);

authRouter.post(
  '/refresh',
  generalRateLimiter,
  authController.refreshToken
);

authRouter.post(
  '/verify-email',
  authValidators.verifyEmail,
  handleValidationErrors,
  authController.verifyEmail
);

authRouter.post(
  '/forgot-password',
  passwordResetRateLimiter,
  authValidators.forgotPassword,
  handleValidationErrors,
  authController.forgotPassword
);

authRouter.post(
  '/reset-password',
  authValidators.resetPassword,
  handleValidationErrors,
  authController.resetPassword
);

authRouter.post(
  '/change-password',
  authenticate,
  authValidators.changePassword,
  handleValidationErrors,
  authController.changePassword
);

authRouter.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

authRouter.get(
  '/verify',
  authenticate,
  authController.verifyToken
);

router.use('/api/auth', authRouter);

/**
 * User routes
 */
const userRouter = Router();

userRouter.get(
  '/search',
  authenticate,
  searchRateLimiter,
  userController.searchUsers
);

userRouter.get(
  '/online',
  authenticate,
  userController.getOnlineUsers
);

userRouter.get(
  '/:userId',
  authenticate,
  commonValidators.uuid('userId'),
  handleValidationErrors,
  userController.getUserById
);

userRouter.put(
  '/:userId',
  authenticate,
  requireOwnershipOrRole('userId', UserRole.ADMIN),
  commonValidators.uuid('userId'),
  userValidators.updateProfile,
  handleValidationErrors,
  userController.updateProfile
);

userRouter.get(
  '/:userId/statistics',
  authenticate,
  commonValidators.uuid('userId'),
  handleValidationErrors,
  userController.getUserStatistics
);

userRouter.patch(
  '/:userId/role',
  authenticate,
  requireAdmin,
  commonValidators.uuid('userId'),
  userValidators.updateRole,
  handleValidationErrors,
  userController.updateUserRole
);

userRouter.post(
  '/:userId/suspend',
  authenticate,
  requireAdmin,
  commonValidators.uuid('userId'),
  handleValidationErrors,
  userController.suspendUser
);

userRouter.post(
  '/:userId/activate',
  authenticate,
  requireAdmin,
  commonValidators.uuid('userId'),
  handleValidationErrors,
  userController.activateUser
);

router.use('/api/users', userRouter);

/**
 * Channel routes
 */
const channelRouter = Router();

channelRouter.post(
  '/',
  authenticate,
  channelValidators.create,
  handleValidationErrors,
  channelController.createChannel
);

channelRouter.get(
  '/',
  authenticate,
  channelController.getUserChannels
);

channelRouter.get(
  '/search',
  authenticate,
  searchRateLimiter,
  channelController.searchChannels
);

channelRouter.get(
  '/:channelId',
  authenticate,
  commonValidators.uuid('channelId'),
  handleValidationErrors,
  channelController.getChannelById
);

channelRouter.post(
  '/:channelId/join',
  authenticate,
  commonValidators.uuid('channelId'),
  handleValidationErrors,
  channelController.joinChannel
);

channelRouter.post(
  '/:channelId/leave',
  authenticate,
  commonValidators.uuid('channelId'),
  handleValidationErrors,
  channelController.leaveChannel
);

router.use('/api/channels', channelRouter);

/**
 * Message routes
 */
const messageRouter = Router();

messageRouter.post(
  '/',
  authenticate,
  messageSendRateLimiter,
  messageValidators.send,
  handleValidationErrors,
  messageController.sendMessage
);

messageRouter.get(
  '/channel/:channelId',
  authenticate,
  commonValidators.uuid('channelId'),
  commonValidators.pagination,
  handleValidationErrors,
  messageController.getChannelMessages
);

messageRouter.delete(
  '/:messageId',
  authenticate,
  commonValidators.uuid('messageId'),
  handleValidationErrors,
  messageController.deleteMessage
);

router.use('/api/messages', messageRouter);

/**
 * Task routes
 */
const taskRouter = Router();

taskRouter.post(
  '/',
  authenticate,
  taskValidators.create,
  handleValidationErrors,
  taskController.createTask
);

taskRouter.get(
  '/',
  authenticate,
  taskController.getUserTasks
);

taskRouter.get(
  '/statistics',
  authenticate,
  taskController.getTaskStatistics
);

taskRouter.get(
  '/:taskId',
  authenticate,
  commonValidators.uuid('taskId'),
  handleValidationErrors,
  taskController.getTaskById
);

taskRouter.put(
  '/:taskId',
  authenticate,
  commonValidators.uuid('taskId'),
  handleValidationErrors,
  taskController.updateTask
);

taskRouter.patch(
  '/:taskId/status',
  authenticate,
  commonValidators.uuid('taskId'),
  taskValidators.updateStatus,
  handleValidationErrors,
  taskController.updateTaskStatus
);

taskRouter.delete(
  '/:taskId',
  authenticate,
  commonValidators.uuid('taskId'),
  handleValidationErrors,
  taskController.deleteTask
);

router.use('/api/tasks', taskRouter);

/**
 * Notification routes
 */
const notificationRouter = Router();

notificationRouter.get(
  '/',
  authenticate,
  notificationController.getUserNotifications
);

notificationRouter.get(
  '/unread/count',
  authenticate,
  notificationController.getUnreadCount
);

notificationRouter.patch(
  '/:notificationId/read',
  authenticate,
  commonValidators.uuid('notificationId'),
  handleValidationErrors,
  notificationController.markAsRead
);

notificationRouter.post(
  '/read-all',
  authenticate,
  notificationController.markAllAsRead
);

router.use('/api/notifications', notificationRouter);

export default router;