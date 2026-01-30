import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.model';

export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',

  // Authorization
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  ROLE_CHANGED = 'role_changed',
  ACCESS_DENIED = 'access_denied',

  // Data operations
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  BULK_DELETE = 'bulk_delete',
  EXPORT = 'export',
  IMPORT = 'import',

  // Security events
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_REACTIVATED = 'account_reactivated',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

  // Configuration changes
  SETTINGS_CHANGED = 'settings_changed',
  INTEGRATION_ENABLED = 'integration_enabled',
  INTEGRATION_DISABLED = 'integration_disabled',

  // Administrative actions
  USER_CREATED = 'user_created',
  USER_DELETED = 'user_deleted',
  CHANNEL_CREATED = 'channel_created',
  CHANNEL_DELETED = 'channel_deleted',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  ADMIN_ACTION = 'admin_action',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('audit_logs')
@Index(['user', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['severity', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['success'])
export class AuditLog extends BaseEntity {
  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.INFO,
  })
  severity: AuditSeverity;

  @Column({ type: 'varchar', length: 100, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'varchar', length: 100, name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'old_values' })
  oldValues?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true, name: 'new_values' })
  newValues?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    source?: string;
    reason?: string;
    changes?: Record<string, unknown>;
    additionalData?: Record<string, unknown>;
  };

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'ip_address' })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  userAgent?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  endpoint?: string;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'http_method' })
  httpMethod?: string;

  @Column({ type: 'int', nullable: true, name: 'status_code' })
  statusCode?: number;

  @Column({ type: 'int', nullable: true, name: 'response_time_ms' })
  responseTimeMs?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  platform?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location?: string;

  @Column({ type: 'boolean', default: false, name: 'requires_review' })
  requiresReview: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'reviewed_by_id' })
  reviewedById?: string;

  @Column({ type: 'text', nullable: true, name: 'review_notes' })
  reviewNotes?: string;

  // Relationships
  @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  // Methods
  static createAuditLog(
    action: AuditAction,
    resourceType: string,
    resourceId: string,
    userId?: string,
    options?: {
      severity?: AuditSeverity;
      description?: string;
      success?: boolean;
      errorMessage?: string;
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
      metadata?: AuditLog['metadata'];
    }
  ): Partial<AuditLog> {
    return {
      action,
      resourceType,
      resourceId,
      userId,
      severity: options?.severity || AuditSeverity.INFO,
      description: options?.description,
      success: options?.success !== undefined ? options.success : true,
      errorMessage: options?.errorMessage,
      oldValues: options?.oldValues,
      newValues: options?.newValues,
      metadata: options?.metadata,
    };
  }

  isSecurityEvent(): boolean {
    const securityActions = [
      AuditAction.LOGIN_FAILED,
      AuditAction.ACCESS_DENIED,
      AuditAction.ACCOUNT_LOCKED,
      AuditAction.ACCOUNT_SUSPENDED,
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.RATE_LIMIT_EXCEEDED,
    ];

    return securityActions.includes(this.action);
  }

  isCritical(): boolean {
    return this.severity === AuditSeverity.CRITICAL;
  }

  needsReview(): boolean {
    return this.requiresReview && !this.reviewedAt;
  }

  markAsReviewed(reviewerId: string, notes?: string): void {
    this.reviewedAt = new Date();
    this.reviewedById = reviewerId;
    this.reviewNotes = notes;
  }

  getChangeSummary(): string[] {
    const changes: string[] = [];

    if (this.oldValues && this.newValues) {
      Object.keys(this.newValues).forEach((key) => {
        const oldValue = this.oldValues![key];
        const newValue = this.newValues![key];

        if (oldValue !== newValue) {
          changes.push(`${key}: ${oldValue} → ${newValue}`);
        }
      });
    }

    return changes;
  }

  getSeverityLevel(): number {
    const severityLevels = {
      [AuditSeverity.INFO]: 1,
      [AuditSeverity.WARNING]: 2,
      [AuditSeverity.ERROR]: 3,
      [AuditSeverity.CRITICAL]: 4,
    };

    return severityLevels[this.severity];
  }
}