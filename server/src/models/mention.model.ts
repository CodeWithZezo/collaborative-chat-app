import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.model';
import { Message } from './message.model';

export enum MentionType {
  USER = 'user',
  CHANNEL = 'channel',
  EVERYONE = 'everyone',
  HERE = 'here',
}

@Entity('mentions')
@Index(['message', 'mentionedUser'])
@Index(['mentionedUser', 'isRead'])
export class Mention extends BaseEntity {
  @Column({
    type: 'enum',
    enum: MentionType,
    default: MentionType.USER,
  })
  type: MentionType;

  @Column({ type: 'int', name: 'position_start' })
  positionStart: number;

  @Column({ type: 'int', name: 'position_end' })
  positionEnd: number;

  @Column({ type: 'varchar', length: 100, name: 'mention_text' })
  mentionText: string;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt?: Date;

  @Column({ type: 'boolean', default: false, name: 'notification_sent' })
  notificationSent: boolean;

  // Relationships
  @ManyToOne(() => Message, (message) => message.mentions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @Column({ name: 'message_id' })
  messageId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentioned_user_id' })
  mentionedUser?: User;

  @Column({ name: 'mentioned_user_id', nullable: true })
  mentionedUserId?: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentioned_by_id' })
  mentionedBy: User;

  @Column({ name: 'mentioned_by_id' })
  mentionedById: string;

  // Methods
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  isSpecialMention(): boolean {
    return this.type === MentionType.EVERYONE || this.type === MentionType.HERE;
  }
}