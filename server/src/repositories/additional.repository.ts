import { BaseRepository } from './base.repository';
import { Mention } from '../models/mention.model';
import { ActivityLog, ActivityType } from '../models/activity.model';
import { AuditLog, AuditAction, AuditSeverity } from '../models/audit.model';
import logger from '../config/logger.config';

/**
 * Mention Repository
 */
export class MentionRepository extends BaseRepository<Mention> {
  constructor() {
    super(Mention);
  }

  async findByUser(userId: string, isRead?: boolean): Promise<Mention[]> {
    try {
      const where: any = { mentionedUserId: userId };
      if (isRead !== undefined) where.isRead = isRead;

      return await this.repository.find({
        where,
        relations: ['message', 'mentionedBy'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to find mentions by user', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async markAsRead(mentionId: string): Promise<void> {
    try {
      await this.repository.update(mentionId, {
        isRead: true,
        readAt: new Date(),
      });
    } catch (error) {
      logger.error('Failed to mark mention as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.count({ mentionedUserId: userId, isRead: false } as any);
    } catch (error) {
      logger.error('Failed to get unread mention count', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

/**
 * Activity Log Repository
 */
export class ActivityLogRepository extends BaseRepository<ActivityLog> {
  constructor() {
    super(ActivityLog);
  }

  async findByUser(userId: string, limit: number = 100): Promise<ActivityLog[]> {
    try {
      return await this.repository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to find activity logs by user', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findByResource(resourceType: string, resourceId: string): Promise<ActivityLog[]> {
    try {
      return await this.repository.find({
        where: { resourceType, resourceId },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to find activity logs by resource', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getRecentActivity(limit: number = 50): Promise<ActivityLog[]> {
    try {
      return await this.repository.find({
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to get recent activity', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

/**
 * Audit Log Repository
 */
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor() {
    super(AuditLog);
  }

  async findByUser(userId: string, page: number = 1, limit: number = 50): Promise<{ data: AuditLog[]; total: number }> {
    try {
      return await this.findWithPagination(
        {
          where: { userId },
          order: { createdAt: 'DESC' },
        },
        page,
        limit
      );
    } catch (error) {
      logger.error('Failed to find audit logs by user', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findByAction(action: AuditAction, limit: number = 100): Promise<AuditLog[]> {
    try {
      return await this.repository.find({
        where: { action },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to find audit logs by action', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findBySeverity(severity: AuditSeverity, limit: number = 100): Promise<AuditLog[]> {
    try {
      return await this.repository.find({
        where: { severity },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to find audit logs by severity', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findSecurityEvents(limit: number = 100): Promise<AuditLog[]> {
    try {
      return await this.repository
        .createQueryBuilder('audit')
        .where('audit.action IN (:...actions)', {
          actions: [
            AuditAction.LOGIN_FAILED,
            AuditAction.ACCESS_DENIED,
            AuditAction.ACCOUNT_LOCKED,
            AuditAction.SUSPICIOUS_ACTIVITY,
          ],
        })
        .orderBy('audit.createdAt', 'DESC')
        .take(limit)
        .getMany();
    } catch (error) {
      logger.error('Failed to find security events', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findFailedLogins(hours: number = 24): Promise<AuditLog[]> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      return await this.repository.find({
        where: {
          action: AuditAction.LOGIN_FAILED,
        },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to find failed logins', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const mentionRepository = new MentionRepository();
export const activityLogRepository = new ActivityLogRepository();
export const auditLogRepository = new AuditLogRepository();