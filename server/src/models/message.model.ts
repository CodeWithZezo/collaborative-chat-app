import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.model';
import { Channel } from './channel.model';
import { Mention } from './mention.model';
import { Attachment } from './attachment.model';

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  SYSTEM = 'system',
  TASK = 'task',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('messages')
@Index(['channel', 'createdAt'])
@Index(['sender'])
@Index(['type'])
@Index(['parentMessage'])
export class Message extends BaseEntity {
  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'boolean', default: false, name: 'is_edited' })
  isEdited: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'edited_at' })
  editedAt?: Date;

  @Column({ type: 'boolean', default: false, name: 'is_pinned' })
  isPinned: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'pinned_at' })
  pinnedAt?: Date;

  @Column({ type: 'boolean', default: false, name: 'is_thread_parent' })
  isThreadParent: boolean;

  @Column({ type: 'int', default: 0, name: 'reply_count' })
  replyCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_reply_at' })
  lastReplyAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    links?: string[];
    codeBlocks?: { language: string; code: string }[];
    quotedMessageId?: string;
    forwarded?: boolean;
    edited?: boolean;
    editHistory?: { content: string; editedAt: Date }[];
  };

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'client_message_id' })
  clientMessageId?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'preview_text' })
  previewText?: string;

  @Column({ type: 'tsvector', nullable: true, name: 'search_vector' })
  searchVector?: string;

  // Relationships
  @ManyToOne(() => User, (user) => user.messages, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => Channel, (channel) => channel.messages, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @Column({ name: 'channel_id' })
  channelId: string;

  @ManyToOne(() => Message, (message) => message.replies, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_message_id' })
  parentMessage?: Message;

  @Column({ name: 'parent_message_id', nullable: true })
  parentMessageId?: string;

  @OneToMany(() => Message, (message) => message.parentMessage)
  replies: Message[];

  @OneToMany(() => Mention, (mention) => mention.message, { cascade: true })
  mentions: Mention[];

  @OneToMany(() => Attachment, (attachment) => attachment.message, { cascade: true })
  attachments: Attachment[];

  // Methods
  addReaction(emoji: string, userId: string): void {
    if (!this.reactions) {
      this.reactions = [];
    }

    const existingReaction = this.reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
      if (!existingReaction.users.includes(userId)) {
        existingReaction.users.push(userId);
        existingReaction.count += 1;
      }
    } else {
      this.reactions.push({
        emoji,
        count: 1,
        users: [userId],
      });
    }
  }

  removeReaction(emoji: string, userId: string): void {
    if (!this.reactions) {
      return;
    }

    const reactionIndex = this.reactions.findIndex((r) => r.emoji === emoji);

    if (reactionIndex !== -1) {
      const reaction = this.reactions[reactionIndex];
      const userIndex = reaction.users.indexOf(userId);

      if (userIndex !== -1) {
        reaction.users.splice(userIndex, 1);
        reaction.count -= 1;

        if (reaction.count === 0) {
          this.reactions.splice(reactionIndex, 1);
        }
      }
    }
  }

  markAsEdited(newContent: string): void {
    if (!this.metadata) {
      this.metadata = {};
    }

    if (!this.metadata.editHistory) {
      this.metadata.editHistory = [];
    }

    this.metadata.editHistory.push({
      content: this.content,
      editedAt: new Date(),
    });

    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
  }

  togglePin(): void {
    this.isPinned = !this.isPinned;
    this.pinnedAt = this.isPinned ? new Date() : null;
  }

  incrementReplyCount(): void {
    this.replyCount += 1;
    this.lastReplyAt = new Date();
  }

  isThread(): boolean {
    return this.parentMessageId !== null && this.parentMessageId !== undefined;
  }

  generatePreviewText(maxLength: number = 100): string {
    if (this.type !== MessageType.TEXT) {
      return `[${this.type.toUpperCase()}]`;
    }

    const cleanContent = this.content.replace(/<[^>]*>/g, '').trim();
    return cleanContent.length > maxLength
      ? cleanContent.substring(0, maxLength) + '...'
      : cleanContent;
  }
}