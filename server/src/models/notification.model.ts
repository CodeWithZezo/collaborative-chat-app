import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.model';

export enum NotificationType {
  MENTION = 'mention',
  MESSAGE = 'message',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  CHANNEL_INVITE = 'channel_invite',
  CHANNEL_MENTION = 'channel_mention',
  REPLY = 'reply',
  REACTION = 'reaction',
  FILE_SHARED = 'file_shared',
  SYSTEM = 'system',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
@Index(['user', 'isRead'])
@Index(['user', 'type'])
@Index(['createdAt'])
export class Notification extends BaseEntity {
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  data?: {
    channelId?: string;
    channelName?: string;
    messageId?: string;
    taskId?: string;
    taskTitle?: string;
    mentionId?: string;
    senderId?: string;
    senderName?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  };

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'action_url' })
  actionUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'icon_url' })
  iconUrl?: string;

  @Column({ type: 'boolean', default: false, name: 'email_sent' })
  emailSent: boolean;

  @Column({ type: 'boolean', default: false, name: 'push_sent' })
  pushSent: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'email_sent_at' })
  emailSentAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'push_sent_at' })
  pushSentAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  @Column({ type: 'boolean', default: false, name: 'is_actionable' })
  isActionable: boolean;

  @Column({ type: 'jsonb', nullable: true })
  actions?: {
    label: string;
    action: string;
    style?: 'primary' | 'secondary' | 'danger';
  }[];

  // Relationships
  @ManyToOne(() => User, (user) => user.notifications, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'triggered_by_id' })
  triggeredBy?: User;

  @Column({ name: 'triggered_by_id', nullable: true })
  triggeredById?: string;

  // Methods
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return new Date() > this.expiresAt;
  }

  shouldSendEmail(userPreferences: User['notificationPreferences']): boolean {
    if (!userPreferences?.email) {
      return false;
    }

    // Check type-specific preferences
    switch (this.type) {
      case NotificationType.MENTION:
      case NotificationType.CHANNEL_MENTION:
        return userPreferences.mentions ?? true;
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_UPDATED:
      case NotificationType.TASK_COMPLETED:
      case NotificationType.TASK_DUE_SOON:
      case NotificationType.TASK_OVERDUE:
        return userPreferences.tasks ?? true;
      case NotificationType.CHANNEL_INVITE:
        return userPreferences.channels ?? true;
      default:
        return true;
    }
  }

  shouldSendPush(userPreferences: User['notificationPreferences']): boolean {
    if (!userPreferences?.push) {
      return false;
    }

    // Similar logic to email
    return this.shouldSendEmail(userPreferences);
  }

  getPriorityScore(): number {
    const priorityScores = {
      [NotificationPriority.LOW]: 1,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.URGENT]: 4,
    };

    return priorityScores[this.priority];
  }

  getAgeInMinutes(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / 1000 / 60);
  }
}