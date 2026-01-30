import { BaseRepository } from './base.repository';
import { Message, MessageType, MessageStatus } from '../models/message.model';
import { FindOptionsWhere } from 'typeorm';
import logger from '../config/logger.config';

export class MessageRepository extends BaseRepository<Message> {
  constructor() {
    super(Message);
  }

  /**
   * Find messages by channel with pagination
   */
  async findByChannel(
    channelId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: Message[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await this.repository.findAndCount({
        where: { channelId },
        relations: ['sender', 'mentions', 'attachments'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      return { data, total };
    } catch (error) {
      logger.error('Failed to find messages by channel', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find messages after specific message (for real-time updates)
   */
  async findAfterMessage(channelId: string, messageId: string, limit: number = 50): Promise<Message[]> {
    try {
      const message = await this.findById(messageId);
      if (!message) {
        return [];
      }

      return await this.repository.find({
        where: {
          channelId,
        },
        relations: ['sender', 'mentions', 'attachments'],
        order: { createdAt: 'ASC' },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to find messages after message', {
        channelId,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find thread messages (replies to a parent message)
   */
  async findThreadMessages(parentMessageId: string): Promise<Message[]> {
    try {
      return await this.repository.find({
        where: { parentMessageId },
        relations: ['sender', 'attachments'],
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      logger.error('Failed to find thread messages', {
        parentMessageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find pinned messages in channel
   */
  async findPinnedMessages(channelId: string): Promise<Message[]> {
    try {
      return await this.repository.find({
        where: {
          channelId,
          isPinned: true,
        },
        relations: ['sender'],
        order: { pinnedAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to find pinned messages', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Search messages in channel
   */
  async searchMessages(channelId: string, query: string, limit: number = 20): Promise<Message[]> {
    try {
      return await this.repository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .where('message.channelId = :channelId', { channelId })
        .andWhere('message.content ILIKE :query', { query: `%${query}%` })
        .orderBy('message.createdAt', 'DESC')
        .take(limit)
        .getMany();
    } catch (error) {
      logger.error('Failed to search messages', {
        channelId,
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find messages by sender
   */
  async findBySender(senderId: string, page: number = 1, limit: number = 50): Promise<{ data: Message[]; total: number }> {
    try {
      return await this.findWithPagination(
        {
          where: { senderId },
          relations: ['channel'],
          order: { createdAt: 'DESC' },
        },
        page,
        limit
      );
    } catch (error) {
      logger.error('Failed to find messages by sender', {
        senderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get unread message count for user in channel
   */
  async getUnreadCount(channelId: string, userId: string, lastReadAt: Date): Promise<number> {
    try {
      return await this.repository
        .createQueryBuilder('message')
        .where('message.channelId = :channelId', { channelId })
        .andWhere('message.senderId != :userId', { userId })
        .andWhere('message.createdAt > :lastReadAt', { lastReadAt })
        .getCount();
    } catch (error) {
      logger.error('Failed to get unread count', {
        channelId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Pin message
   */
  async pinMessage(messageId: string): Promise<void> {
    try {
      await this.repository.update(messageId, {
        isPinned: true,
        pinnedAt: new Date(),
      });

      logger.debug('Message pinned', { messageId });
    } catch (error) {
      logger.error('Failed to pin message', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Unpin message
   */
  async unpinMessage(messageId: string): Promise<void> {
    try {
      await this.repository.update(messageId, {
        isPinned: false,
        pinnedAt: null,
      });

      logger.debug('Message unpinned', { messageId });
    } catch (error) {
      logger.error('Failed to unpin message', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Mark message as edited
   */
  async markAsEdited(messageId: string, newContent: string): Promise<void> {
    try {
      const message = await this.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Store edit history in metadata
      const editHistory = message.metadata?.editHistory || [];
      editHistory.push({
        content: message.content,
        editedAt: new Date(),
      });

      await this.repository.update(messageId, {
        content: newContent,
        isEdited: true,
        editedAt: new Date(),
        metadata: {
          ...message.metadata,
          editHistory,
        },
      });

      logger.debug('Message marked as edited', { messageId });
    } catch (error) {
      logger.error('Failed to mark message as edited', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update message status
   */
  async updateStatus(messageId: string, status: MessageStatus): Promise<void> {
    try {
      await this.repository.update(messageId, { status });
    } catch (error) {
      logger.error('Failed to update message status', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, emoji: string, userId: string): Promise<void> {
    try {
      const message = await this.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      const reactions = message.reactions || [];
      const existingReaction = reactions.find((r) => r.emoji === emoji);

      if (existingReaction) {
        if (!existingReaction.users.includes(userId)) {
          existingReaction.users.push(userId);
          existingReaction.count += 1;
        }
      } else {
        reactions.push({
          emoji,
          count: 1,
          users: [userId],
        });
      }

      await this.repository.update(messageId, { reactions });
    } catch (error) {
      logger.error('Failed to add reaction', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, emoji: string, userId: string): Promise<void> {
    try {
      const message = await this.findById(messageId);
      if (!message || !message.reactions) {
        return;
      }

      const reactions = message.reactions;
      const reactionIndex = reactions.findIndex((r) => r.emoji === emoji);

      if (reactionIndex !== -1) {
        const reaction = reactions[reactionIndex];
        const userIndex = reaction.users.indexOf(userId);

        if (userIndex !== -1) {
          reaction.users.splice(userIndex, 1);
          reaction.count -= 1;

          if (reaction.count === 0) {
            reactions.splice(reactionIndex, 1);
          }
        }
      }

      await this.repository.update(messageId, { reactions });
    } catch (error) {
      logger.error('Failed to remove reaction', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Increment reply count
   */
  async incrementReplyCount(messageId: string): Promise<void> {
    try {
      await this.repository.increment(
        { id: messageId } as FindOptionsWhere<Message>,
        'replyCount',
        1
      );

      await this.repository.update(messageId, {
        lastReplyAt: new Date(),
        isThreadParent: true,
      });
    } catch (error) {
      logger.error('Failed to increment reply count', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get message statistics for channel
   */
  async getChannelMessageStats(channelId: string): Promise<{
    totalMessages: number;
    todayMessages: number;
    activeUsers: number;
  }> {
    try {
      const totalMessages = await this.repository.count({
        where: { channelId },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayMessages = await this.repository.count({
        where: {
          channelId,
        },
      });

      const activeUsers = await this.repository
        .createQueryBuilder('message')
        .select('COUNT(DISTINCT message.senderId)', 'count')
        .where('message.channelId = :channelId', { channelId })
        .andWhere('message.createdAt >= :today', { today })
        .getRawOne();

      return {
        totalMessages,
        todayMessages,
        activeUsers: parseInt(activeUsers.count) || 0,
      };
    } catch (error) {
      logger.error('Failed to get channel message stats', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete messages older than specified days
   */
  async deleteOldMessages(channelId: string, days: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .from(Message)
        .where('channelId = :channelId', { channelId })
        .andWhere('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      logger.info('Old messages deleted', {
        channelId,
        days,
        deletedCount: result.affected || 0,
      });

      return result.affected || 0;
    } catch (error) {
      logger.error('Failed to delete old messages', {
        channelId,
        days,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default new MessageRepository();