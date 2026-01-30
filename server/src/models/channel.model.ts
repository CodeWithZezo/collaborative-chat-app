import { Entity, Column, Index, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.model';
import { Message } from './message.model';

export enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
  GROUP = 'group',
}

export enum ChannelMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('channels')
@Index(['name'])
@Index(['type'])
@Index(['createdBy'])
export class Channel extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ChannelType,
    default: ChannelType.PUBLIC,
  })
  type: ChannelType;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  topic?: string;

  @Column({ type: 'boolean', default: false, name: 'is_archived' })
  isArchived: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'archived_at' })
  archivedAt?: Date;

  @Column({ type: 'jsonb', nullable: true, name: 'channel_settings' })
  channelSettings?: {
    allowMentions: boolean;
    allowFileUploads: boolean;
    allowReactions: boolean;
    allowThreads: boolean;
    messageRetentionDays?: number;
    maxMembers?: number;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'member_permissions' })
  memberPermissions?: {
    canInvite: boolean;
    canRemoveMembers: boolean;
    canEditChannel: boolean;
    canDeleteMessages: boolean;
    canPinMessages: boolean;
  };

  @Column({ type: 'timestamp', nullable: true, name: 'last_message_at' })
  lastMessageAt?: Date;

  @Column({ type: 'int', default: 0, name: 'message_count' })
  messageCount: number;

  @Column({ type: 'int', default: 0, name: 'member_count' })
  memberCount: number;

  // Relationships
  @ManyToOne(() => User, (user) => user.createdChannels, { nullable: false })
  @JoinTable({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToMany(() => User, (user) => user.channels)
  @JoinTable({
    name: 'channel_members',
    joinColumn: { name: 'channel_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];

  @OneToMany(() => Message, (message) => message.channel)
  messages: Message[];

  // Methods
  isDirectMessage(): boolean {
    return this.type === ChannelType.DIRECT;
  }

  isPrivate(): boolean {
    return this.type === ChannelType.PRIVATE;
  }

  canUserPost(userId: string): boolean {
    if (this.isArchived) {
      return false;
    }
    // Additional permission checks can be added here
    return true;
  }

  incrementMessageCount(): void {
    this.messageCount += 1;
    this.lastMessageAt = new Date();
  }

  updateMemberCount(count: number): void {
    this.memberCount = count;
  }
}