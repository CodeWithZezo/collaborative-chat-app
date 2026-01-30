import { Entity, Column, Index, OneToMany, ManyToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Message } from './message.model';
import { Channel } from './channel.model';
import { Task } from './task.model';
import { Notification } from './notification.model';
import { AuditLog } from './audit.model';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'first_name' })
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'last_name' })
  lastName?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  locale?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'boolean', default: false, name: 'is_online' })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_seen_at' })
  lastSeenAt?: Date;

  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'email_verification_token' })
  emailVerificationToken?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'password_reset_token' })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'password_reset_expires' })
  passwordResetExpires?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'refresh_token', select: false })
  refreshToken?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'notification_preferences' })
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    mentions: boolean;
    tasks: boolean;
    channels: boolean;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'theme_preferences' })
  themePreferences?: {
    mode: 'light' | 'dark' | 'system';
    primaryColor?: string;
  };

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'last_login_ip' })
  lastLoginIp?: string;

  @Column({ type: 'int', default: 0, name: 'failed_login_attempts' })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true, name: 'locked_until' })
  lockedUntil?: Date;

  // Relationships
  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @ManyToMany(() => Channel, (channel) => channel.members)
  channels: Channel[];

  @OneToMany(() => Channel, (channel) => channel.createdBy)
  createdChannels: Channel[];

  @OneToMany(() => Task, (task) => task.createdBy)
  createdTasks: Task[];

  @OneToMany(() => Task, (task) => task.assignedTo)
  assignedTasks: Task[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    // Only hash if password is modified
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, config.security.bcryptRounds);
    }
  }

  @BeforeInsert()
  setDefaults(): void {
    if (!this.notificationPreferences) {
      this.notificationPreferences = {
        email: true,
        push: true,
        inApp: true,
        mentions: true,
        tasks: true,
        channels: true,
      };
    }

    if (!this.themePreferences) {
      this.themePreferences = {
        mode: 'system',
      };
    }
  }

  // Methods
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.username;
  }

  isAccountLocked(): boolean {
    if (this.lockedUntil && this.lockedUntil > new Date()) {
      return true;
    }
    return false;
  }

  canAccessResource(requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.SUPER_ADMIN]: 5,
      [UserRole.ADMIN]: 4,
      [UserRole.MODERATOR]: 3,
      [UserRole.USER]: 2,
      [UserRole.GUEST]: 1,
    };

    return roleHierarchy[this.role] >= roleHierarchy[requiredRole];
  }

  toJSON(): Partial<User> {
    const { password, refreshToken, emailVerificationToken, passwordResetToken, ...rest } = this;
    return rest;
  }
}