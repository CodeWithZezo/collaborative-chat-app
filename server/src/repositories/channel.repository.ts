import { BaseRepository } from './base.repository';
import { Channel, ChannelType } from '../models/channel.model';
import { FindOptionsWhere } from 'typeorm';
import logger from '../config/logger.config';

export class ChannelRepository extends BaseRepository<Channel> {
  constructor() {
    super(Channel);
  }

  /**
   * Find channel by name
   */
  async findByName(name: string): Promise<Channel | null> {
    try {
      return await this.repository.findOne({
        where: { name },
        relations: ['createdBy', 'members'],
      });
    } catch (error) {
      logger.error('Failed to find channel by name', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find user's channels
   */
  async findUserChannels(userId: string): Promise<Channel[]> {
    try {
      return await this.repository
        .createQueryBuilder('channel')
        .leftJoin('channel.members', 'member')
        .where('member.id = :userId', { userId })
        .andWhere('channel.isActive = :isActive', { isActive: true })
        .andWhere('channel.isArchived = :isArchived', { isArchived: false })
        .orderBy('channel.lastMessageAt', 'DESC')
        .getMany();
    } catch (error) {
      logger.error('Failed to find user channels', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find public channels
   */
  async findPublicChannels(limit: number = 50): Promise<Channel[]> {
    try {
      return await this.repository.find({
        where: {
          type: ChannelType.PUBLIC,
          isActive: true,
          isArchived: false,
        },
        order: {
          memberCount: 'DESC',
          lastMessageAt: 'DESC',
        },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to find public channels', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find direct message channel between two users
   */
  async findDirectMessageChannel(user1Id: string, user2Id: string): Promise<Channel | null> {
    try {
      const channel = await this.repository
        .createQueryBuilder('channel')
        .leftJoin('channel.members', 'member')
        .where('channel.type = :type', { type: ChannelType.DIRECT })
        .andWhere('channel.isActive = :isActive', { isActive: true })
        .having('COUNT(DISTINCT member.id) = 2')
        .andWhere('member.id IN (:...userIds)', { userIds: [user1Id, user2Id] })
        .groupBy('channel.id')
        .getOne();

      return channel;
    } catch (error) {
      logger.error('Failed to find direct message channel', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if user is member of channel
   */
  async isUserMember(channelId: string, userId: string): Promise<boolean> {
    try {
      const count = await this.repository
        .createQueryBuilder('channel')
        .leftJoin('channel.members', 'member')
        .where('channel.id = :channelId', { channelId })
        .andWhere('member.id = :userId', { userId })
        .getCount();

      return count > 0;
    } catch (error) {
      logger.error('Failed to check if user is member', {
        channelId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add user to channel
   */
  async addMember(channelId: string, userId: string): Promise<void> {
    try {
      await this.repository
        .createQueryBuilder()
        .relation(Channel, 'members')
        .of(channelId)
        .add(userId);

      // Update member count
      await this.incrementMemberCount(channelId);

      logger.debug('User added to channel', { channelId, userId });
    } catch (error) {
      logger.error('Failed to add member to channel', {
        channelId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Remove user from channel
   */
  async removeMember(channelId: string, userId: string): Promise<void> {
    try {
      await this.repository
        .createQueryBuilder()
        .relation(Channel, 'members')
        .of(channelId)
        .remove(userId);

      // Update member count
      await this.decrementMemberCount(channelId);

      logger.debug('User removed from channel', { channelId, userId });
    } catch (error) {
      logger.error('Failed to remove member from channel', {
        channelId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get channel members
   */
  async getMembers(channelId: string): Promise<any[]> {
    try {
      const channel = await this.repository.findOne({
        where: { id: channelId },
        relations: ['members'],
      });

      return channel?.members || [];
    } catch (error) {
      logger.error('Failed to get channel members', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update message count
   */
  async incrementMessageCount(channelId: string): Promise<void> {
    try {
      await this.repository.increment(
        { id: channelId } as FindOptionsWhere<Channel>,
        'messageCount',
        1
      );

      await this.repository.update(channelId, {
        lastMessageAt: new Date(),
      });
    } catch (error) {
      logger.error('Failed to increment message count', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update member count
   */
  private async incrementMemberCount(channelId: string): Promise<void> {
    try {
      await this.repository.increment(
        { id: channelId } as FindOptionsWhere<Channel>,
        'memberCount',
        1
      );
    } catch (error) {
      logger.error('Failed to increment member count', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Decrement member count
   */
  private async decrementMemberCount(channelId: string): Promise<void> {
    try {
      await this.repository.decrement(
        { id: channelId } as FindOptionsWhere<Channel>,
        'memberCount',
        1
      );
    } catch (error) {
      logger.error('Failed to decrement member count', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Archive channel
   */
  async archive(channelId: string): Promise<void> {
    try {
      await this.repository.update(channelId, {
        isArchived: true,
        archivedAt: new Date(),
      });

      logger.debug('Channel archived', { channelId });
    } catch (error) {
      logger.error('Failed to archive channel', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Unarchive channel
   */
  async unarchive(channelId: string): Promise<void> {
    try {
      await this.repository.update(channelId, {
        isArchived: false,
        archivedAt: null,
      });

      logger.debug('Channel unarchived', { channelId });
    } catch (error) {
      logger.error('Failed to unarchive channel', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Search channels
   */
  async searchChannels(query: string, userId?: string, limit: number = 20): Promise<Channel[]> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('channel')
        .where('channel.name ILIKE :query OR channel.description ILIKE :query', {
          query: `%${query}%`,
        })
        .andWhere('channel.isActive = :isActive', { isActive: true })
        .andWhere('channel.isArchived = :isArchived', { isArchived: false });

      // If userId provided, only show public channels or channels user is member of
      if (userId) {
        queryBuilder.andWhere(
          '(channel.type = :publicType OR EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = channel.id AND cm.user_id = :userId))',
          { publicType: ChannelType.PUBLIC, userId }
        );
      } else {
        queryBuilder.andWhere('channel.type = :publicType', { publicType: ChannelType.PUBLIC });
      }

      return await queryBuilder
        .orderBy('channel.memberCount', 'DESC')
        .addOrderBy('channel.lastMessageAt', 'DESC')
        .take(limit)
        .getMany();
    } catch (error) {
      logger.error('Failed to search channels', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get channel statistics
   */
  async getChannelStatistics(channelId: string): Promise<{
    memberCount: number;
    messageCount: number;
    activeMembers: number;
  }> {
    try {
      const channel = await this.repository.findOne({
        where: { id: channelId },
        select: ['memberCount', 'messageCount'],
      });

      // Count active members (online in last 24 hours)
      const activeMembers = await this.repository
        .createQueryBuilder('channel')
        .leftJoin('channel.members', 'member')
        .where('channel.id = :channelId', { channelId })
        .andWhere('member.lastSeenAt > :timestamp', {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        })
        .getCount();

      return {
        memberCount: channel?.memberCount || 0,
        messageCount: channel?.messageCount || 0,
        activeMembers,
      };
    } catch (error) {
      logger.error('Failed to get channel statistics', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default new ChannelRepository();