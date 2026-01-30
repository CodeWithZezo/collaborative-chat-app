import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.model';

export enum ActivityType {
  // Message activities
  MESSAGE_SENT = 'message_sent',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_PINNED = 'message_pinned',
  MESSAGE_UNPINNED = 'message_unpinned',
  REACTION_ADDED = 'reaction_added',
  REACTION_REMOVED = 'reaction_removed',

  // Channel activities
  CHANNEL_CREATED = 'channel_created',
  CHANNEL_UPDATED = 'channel_updated',
  CHANNEL_DELETED = 'channel_deleted',
  CHANNEL_ARCHIVED = 'channel_archived',
  CHANNEL_UNARCHIVED = 'channel_unarchived',
  CHANNEL_JOINED = 'channel_joined',
  CHANNEL_LEFT = 'channel_left',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',

  // Task activities
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UNASSIGNED = 'task_unassigned',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_COMPLETED = 'task_completed',

  // User activities
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_PROFILE_UPDATED = 'user_profile_updated',
  USER_PASSWORD_CHANGED = 'user_password_changed',

  // File activities
  FILE_UPLOADED = 'file_uploaded',
  FILE_DOWNLOADED = 'file_downloaded',
  FILE_DELETED = 'file_deleted',

  // Mention activities
  USER_MENTIONED = 'user_mentioned',

  // Other activities
  NOTIFICATION_SENT = 'notification_sent',
  SEARCH_PERFORMED = 'search_performed',
}

@Entity('activity_logs')
@Index(['user', 'createdAt'])
@Index(['activityType', 'createdAt'])
@Index(['resourceType', 'resourceId'])
export class ActivityLog extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({ type: 'varchar', length: 100, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'varchar', length: 100, name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    channelId?: string;
    channelName?: string;
    messageId?: string;
    taskId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    changes?: Record<string, unknown>;
    additionalInfo?: Record<string, unknown>;
  };

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'ip_address' })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  userAgent?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  platform?: string;

  // Relationships
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  // Methods
  static createActivityLog(
    userId: string,
    activityType: ActivityType,
    resourceType: string,
    resourceId: string,
    metadata?: ActivityLog['metadata']
  ): Partial<ActivityLog> {
    return {
      userId,
      activityType,
      resourceType,
      resourceId,
      metadata,
    };
  }

  isRecentActivity(minutes: number = 5): boolean {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    const diffMinutes = diffMs / 1000 / 60;
    return diffMinutes <= minutes;
  }

  getActivityDescription(): string {
    if (this.description) {
      return this.description;
    }

    // Generate description based on activity type
    const activityDescriptions: Record<ActivityType, string> = {
      [ActivityType.MESSAGE_SENT]: 'Sent a message',
      [ActivityType.MESSAGE_EDITED]: 'Edited a message',
      [ActivityType.MESSAGE_DELETED]: 'Deleted a message',
      [ActivityType.MESSAGE_PINNED]: 'Pinned a message',
      [ActivityType.MESSAGE_UNPINNED]: 'Unpinned a message',
      [ActivityType.REACTION_ADDED]: 'Added a reaction',
      [ActivityType.REACTION_REMOVED]: 'Removed a reaction',
      [ActivityType.CHANNEL_CREATED]: 'Created a channel',
      [ActivityType.CHANNEL_UPDATED]: 'Updated a channel',
      [ActivityType.CHANNEL_DELETED]: 'Deleted a channel',
      [ActivityType.CHANNEL_ARCHIVED]: 'Archived a channel',
      [ActivityType.CHANNEL_UNARCHIVED]: 'Unarchived a channel',
      [ActivityType.CHANNEL_JOINED]: 'Joined a channel',
      [ActivityType.CHANNEL_LEFT]: 'Left a channel',
      [ActivityType.MEMBER_ADDED]: 'Added a member',
      [ActivityType.MEMBER_REMOVED]: 'Removed a member',
      [ActivityType.TASK_CREATED]: 'Created a task',
      [ActivityType.TASK_UPDATED]: 'Updated a task',
      [ActivityType.TASK_DELETED]: 'Deleted a task',
      [ActivityType.TASK_ASSIGNED]: 'Assigned a task',
      [ActivityType.TASK_UNASSIGNED]: 'Unassigned a task',
      [ActivityType.TASK_STATUS_CHANGED]: 'Changed task status',
      [ActivityType.TASK_COMPLETED]: 'Completed a task',
      [ActivityType.USER_LOGIN]: 'Logged in',
      [ActivityType.USER_LOGOUT]: 'Logged out',
      [ActivityType.USER_PROFILE_UPDATED]: 'Updated profile',
      [ActivityType.USER_PASSWORD_CHANGED]: 'Changed password',
      [ActivityType.FILE_UPLOADED]: 'Uploaded a file',
      [ActivityType.FILE_DOWNLOADED]: 'Downloaded a file',
      [ActivityType.FILE_DELETED]: 'Deleted a file',
      [ActivityType.USER_MENTIONED]: 'Mentioned a user',
      [ActivityType.NOTIFICATION_SENT]: 'Sent a notification',
      [ActivityType.SEARCH_PERFORMED]: 'Performed a search',
    };

    return activityDescriptions[this.activityType] || 'Performed an action';
  }
}