import { BaseRepository } from './base.repository';
import { User, UserRole, UserStatus } from '../models/user.model';
import { FindOptionsWhere } from 'typeorm';
import logger from '../config/logger.config';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.repository.findOne({
        where: { email },
        select: ['id', 'email', 'username', 'password', 'role', 'status', 'emailVerified', 'lockedUntil', 'failedLoginAttempts'],
      });
    } catch (error) {
      logger.error('Failed to find user by email', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      return await this.repository.findOne({
        where: { username },
      });
    } catch (error) {
      logger.error('Failed to find user by username', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find user by email or username
   */
  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    try {
      return await this.repository.findOne({
        where: [{ email: identifier }, { username: identifier }],
        select: ['id', 'email', 'username', 'password', 'role', 'status', 'emailVerified', 'lockedUntil', 'failedLoginAttempts'],
      });
    } catch (error) {
      logger.error('Failed to find user by email or username', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      return await this.exists({ email } as FindOptionsWhere<User>);
    } catch (error) {
      logger.error('Failed to check email existence', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    try {
      return await this.exists({ username } as FindOptionsWhere<User>);
    } catch (error) {
      logger.error('Failed to check username existence', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const result = await this.repository.update(userId, {
        password: newPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      logger.error('Failed to update password', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update failed login attempts
   */
  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await this.repository.increment({ id: userId } as FindOptionsWhere<User>, 'failedLoginAttempts', 1);
    } catch (error) {
      logger.error('Failed to increment failed login attempts', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await this.repository.update(userId, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    } catch (error) {
      logger.error('Failed to reset failed login attempts', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Lock user account
   */
  async lockAccount(userId: string, lockDuration: number = 30 * 60 * 1000): Promise<void> {
    try {
      const lockedUntil = new Date(Date.now() + lockDuration);
      await this.repository.update(userId, { lockedUntil });
    } catch (error) {
      logger.error('Failed to lock account', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update user online status
   */
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await this.repository.update(userId, {
        isOnline,
        lastSeenAt: new Date(),
      });
    } catch (error) {
      logger.error('Failed to update online status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId: string, ip?: string): Promise<void> {
    try {
      await this.repository.update(userId, {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      });
    } catch (error) {
      logger.error('Failed to update last login', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string): Promise<void> {
    try {
      await this.repository.update(userId, {
        emailVerified: true,
        emailVerificationToken: null,
      });
    } catch (error) {
      logger.error('Failed to verify email', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find online users
   */
  async findOnlineUsers(): Promise<User[]> {
    try {
      return await this.repository.find({
        where: { isOnline: true, status: UserStatus.ACTIVE },
        select: ['id', 'username', 'email', 'avatarUrl', 'lastSeenAt'],
      });
    } catch (error) {
      logger.error('Failed to find online users', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    try {
      return await this.repository.find({
        where: { role },
      });
    } catch (error) {
      logger.error('Failed to find users by role', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Search users by username or email
   */
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    try {
      return await this.repository
        .createQueryBuilder('user')
        .where('user.username ILIKE :query OR user.email ILIKE :query', {
          query: `%${query}%`,
        })
        .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
        .select(['user.id', 'user.username', 'user.email', 'user.avatarUrl', 'user.firstName', 'user.lastName'])
        .take(limit)
        .getMany();
    } catch (error) {
      logger.error('Failed to search users', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update user refresh token
   */
  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    try {
      await this.repository.update(userId, { refreshToken });
    } catch (error) {
      logger.error('Failed to update refresh token', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find user by refresh token
   */
  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    try {
      return await this.repository.findOne({
        where: { refreshToken },
        select: ['id', 'email', 'username', 'role', 'status'],
      });
    } catch (error) {
      logger.error('Failed to find user by refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string): Promise<{
    messageCount: number;
    channelCount: number;
    taskCount: number;
  }> {
    try {
      const result = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.messages', 'message')
        .leftJoinAndSelect('user.channels', 'channel')
        .leftJoinAndSelect('user.assignedTasks', 'task')
        .where('user.id = :userId', { userId })
        .select([
          'COUNT(DISTINCT message.id) as messageCount',
          'COUNT(DISTINCT channel.id) as channelCount',
          'COUNT(DISTINCT task.id) as taskCount',
        ])
        .getRawOne();

      return {
        messageCount: parseInt(result.messageCount) || 0,
        channelCount: parseInt(result.channelCount) || 0,
        taskCount: parseInt(result.taskCount) || 0,
      };
    } catch (error) {
      logger.error('Failed to get user statistics', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default new UserRepository();