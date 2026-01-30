import { BaseRepository } from './base.repository';
import { Notification, NotificationType } from '../models/notification.model';
import logger from '../config/logger.config';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(Notification);
  }

  async findByUser(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      return await this.repository.find({
        where: { userId },
        relations: ['triggeredBy'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to find notifications by user', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findUnread(userId: string): Promise<Notification[]> {
    try {
      return await this.repository.find({
        where: { userId, isRead: false },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to find unread notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.count({ userId, isRead: false } as any);
    } catch (error) {
      logger.error('Failed to get unread count', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await this.repository.update(notificationId, {
        isRead: true,
        readAt: new Date(),
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.repository.update(
        { userId, isRead: false } as any,
        { isRead: true, readAt: new Date() }
      );
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async deleteOldNotifications(days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .andWhere('isRead = :isRead', { isRead: true })
        .execute();

      return result.affected || 0;
    } catch (error) {
      logger.error('Failed to delete old notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default new NotificationRepository();