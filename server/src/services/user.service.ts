import userRepository from '../repositories/user.repository';
import { User, UserRole, UserStatus } from '../models/user.model';
import { NotFoundError, AuthorizationError } from '../middlewares/error.middleware';
import logger from '../config/logger.config';

export class UserService {
  async getUserById(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    // Prevent updating sensitive fields
    const { password, email, role, status, refreshToken, ...safeData } = data as any;

    const updated = await userRepository.update(userId, safeData);
    if (!updated) throw new NotFoundError('User not found');

    logger.info('User profile updated', { userId });
    return updated;
  }

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    return await userRepository.searchUsers(query, limit);
  }

  async getOnlineUsers(): Promise<User[]> {
    return await userRepository.findOnlineUsers();
  }

  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await userRepository.updateOnlineStatus(userId, isOnline);
  }

  async getUserStatistics(userId: string): Promise<any> {
    return await userRepository.getUserStatistics(userId);
  }

  async updateRole(userId: string, role: UserRole, adminId: string): Promise<User> {
    const admin = await userRepository.findById(adminId);
    if (!admin?.canAccessResource(UserRole.ADMIN)) {
      throw new AuthorizationError('Insufficient permissions');
    }

    const updated = await userRepository.update(userId, { role });
    if (!updated) throw new NotFoundError('User not found');

    logger.info('User role updated', { userId, role, adminId });
    return updated;
  }

  async suspendUser(userId: string, adminId: string): Promise<void> {
    await userRepository.update(userId, { status: UserStatus.SUSPENDED });
    logger.warn('User suspended', { userId, adminId });
  }

  async activateUser(userId: string, adminId: string): Promise<void> {
    await userRepository.update(userId, { status: UserStatus.ACTIVE });
    logger.info('User activated', { userId, adminId });
  }
}

export default new UserService();