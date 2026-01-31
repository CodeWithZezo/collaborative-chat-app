import { Request, Response } from 'express';
import userService from '../services/user.service';
import { ResponseFormatter } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import { PaginationUtil } from '../utils/pagination.util';

export class UserController {
  /**
   * Get user by ID
   * GET /api/users/:userId
   */
  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    const user = await userService.getUserById(userId);

    ResponseFormatter.success(res, user, 'User retrieved successfully');
  });

  /**
   * Update user profile
   * PUT /api/users/:userId
   */
  updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const updateData = req.body;

    const user = await userService.updateProfile(userId, updateData);

    ResponseFormatter.success(res, user, 'Profile updated successfully');
  });

  /**
   * Search users
   * GET /api/users/search
   */
  searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { q, limit = 10 } = req.query;

    const users = await userService.searchUsers(q as string, Number(limit));

    ResponseFormatter.success(res, users, 'Users retrieved successfully');
  });

  /**
   * Get online users
   * GET /api/users/online
   */
  getOnlineUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const users = await userService.getOnlineUsers();

    ResponseFormatter.success(res, users, 'Online users retrieved successfully');
  });

  /**
   * Get user statistics
   * GET /api/users/:userId/statistics
   */
  getUserStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    const stats = await userService.getUserStatistics(userId);

    ResponseFormatter.success(res, stats, 'Statistics retrieved successfully');
  });

  /**
   * Update user role (Admin only)
   * PATCH /api/users/:userId/role
   */
  updateUserRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { role } = req.body;
    const adminId = req.user!.userId;

    const user = await userService.updateRole(userId, role, adminId);

    ResponseFormatter.success(res, user, 'User role updated successfully');
  });

  /**
   * Suspend user (Admin only)
   * POST /api/users/:userId/suspend
   */
  suspendUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    await userService.suspendUser(userId, adminId);

    ResponseFormatter.success(res, null, 'User suspended successfully');
  });

  /**
   * Activate user (Admin only)
   * POST /api/users/:userId/activate
   */
  activateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    await userService.activateUser(userId, adminId);

    ResponseFormatter.success(res, null, 'User activated successfully');
  });
}

export default new UserController();