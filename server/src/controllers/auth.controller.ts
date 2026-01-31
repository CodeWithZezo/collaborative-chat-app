import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service.ts';
import { ResponseFormatter } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import logger from '../config/logger.config';

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username, email, password, firstName, lastName } = req.body;

    const result = await authService.register({
      username,
      email,
      password,
      firstName,
      lastName,
    });

    ResponseFormatter.created(res, result, 'User registered successfully');
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { identifier, password } = req.body;
    const ip = req.ip;

    const result = await authService.login({ identifier, password }, ip);

    ResponseFormatter.success(res, result, 'Login successful');
  });

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const token = req.token!;

    await authService.logout(userId, token);

    ResponseFormatter.success(res, null, 'Logout successful');
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    const result = await authService.refreshToken(refreshToken);

    ResponseFormatter.success(res, result, 'Token refreshed successfully');
  });

  /**
   * Verify email
   * POST /api/auth/verify-email
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, token } = req.body;

    await authService.verifyEmail(userId, token);

    ResponseFormatter.success(res, null, 'Email verified successfully');
  });

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    await authService.requestPasswordReset(email);

    ResponseFormatter.success(res, null, 'Password reset email sent');
  });

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, token, newPassword } = req.body;

    await authService.resetPassword(userId, token, newPassword);

    ResponseFormatter.success(res, null, 'Password reset successful');
  });

  /**
   * Change password (authenticated)
   * POST /api/auth/change-password
   */
  changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(userId, currentPassword, newPassword);

    ResponseFormatter.success(res, null, 'Password changed successfully');
  });

  /**
   * Get current user
   * GET /api/auth/me
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const user = await userService.getUserById(userId);

    ResponseFormatter.success(res, user, 'User retrieved successfully');
  });

  /**
   * Verify token
   * GET /api/auth/verify
   */
  verifyToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    ResponseFormatter.success(res, { valid: true, user: req.user }, 'Token is valid');
  });
}

export default new AuthController();

import userService from '../services/user.service';