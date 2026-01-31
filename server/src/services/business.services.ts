import messageRepository from '../repositories/message.repository';
import channelRepository from '../repositories/channel.repository';
import taskRepository from '../repositories/task.repository';
import notificationRepository from '../repositories/notification.repository';
import { mentionRepository } from '../repositories/additional.repository';
import { Message } from '../models/message.model';
import { Channel, ChannelType } from '../models/channel.model';
import { Task, TaskStatus } from '../models/task.model';
import { Notification, NotificationType, NotificationPriority } from '../models/notification.model';
import { NotFoundError, AuthorizationError } from '../middlewares/error.middleware';
import { ValidationUtil } from '../utils/validation.util';
import { socketManager } from '../config/socket.config';
import logger from '../config/logger.config';

/**
 * Message Service
 */
export class MessageService {
  async sendMessage(senderId: string, channelId: string, content: string, type: string = 'text'): Promise<Message> {
    // Check if user is member of channel
    const isMember = await channelRepository.isUserMember(channelId, senderId);
    if (!isMember) throw new AuthorizationError('Not a member of this channel');

    // Create message
    const message = await messageRepository.create({
      senderId,
      channelId,
      content,
      type: type as any,
    });

    // Extract and create mentions
    const mentions = ValidationUtil.extractMentions(content);
    for (const username of mentions) {
      const mentionedUser = await userRepository.findByUsername(username);
      if (mentionedUser) {
        await mentionRepository.create({
          messageId: message.id,
          mentionedUserId: mentionedUser.id,
          mentionedById: senderId,
          type: 'user',
          mentionText: `@${username}`,
          positionStart: content.indexOf(`@${username}`),
          positionEnd: content.indexOf(`@${username}`) + username.length + 1,
        });
      }
    }

    // Update channel
    await channelRepository.incrementMessageCount(channelId);

    // Emit socket event
    socketManager.emitToChannel(channelId, 'message:new', message);

    logger.info('Message sent', { messageId: message.id, channelId });
    return message;
  }

  async getChannelMessages(channelId: string, userId: string, page: number = 1): Promise<any> {
    const isMember = await channelRepository.isUserMember(channelId, userId);
    if (!isMember) throw new AuthorizationError('Not authorized');

    return await messageRepository.findByChannel(channelId, page);
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await messageRepository.findById(messageId);
    if (!message) throw new NotFoundError('Message not found');
    if (message.senderId !== userId) throw new AuthorizationError('Not authorized');

    await messageRepository.delete(messageId);
    socketManager.emitToChannel(message.channelId, 'message:deleted', { messageId });
    logger.info('Message deleted', { messageId });
  }
}

/**
 * Channel Service
 */
export class ChannelService {
  async createChannel(userId: string, data: any): Promise<Channel> {
    const channel = await channelRepository.create({
      ...data,
      createdById: userId,
    });

    // Add creator as member
    await channelRepository.addMember(channel.id, userId);

    logger.info('Channel created', { channelId: channel.id, userId });
    return channel;
  }

  async getUserChannels(userId: string): Promise<Channel[]> {
    return await channelRepository.findUserChannels(userId);
  }

  async joinChannel(channelId: string, userId: string): Promise<void> {
    const channel = await channelRepository.findById(channelId);
    if (!channel) throw new NotFoundError('Channel not found');
    if (channel.type === ChannelType.PRIVATE) throw new AuthorizationError('Channel is private');

    await channelRepository.addMember(channelId, userId);
    socketManager.emitToChannel(channelId, 'channel:member_joined', { userId });
    logger.info('User joined channel', { channelId, userId });
  }

  async leaveChannel(channelId: string, userId: string): Promise<void> {
    await channelRepository.removeMember(channelId, userId);
    socketManager.emitToChannel(channelId, 'channel:member_left', { userId });
    logger.info('User left channel', { channelId, userId });
  }

  async searchChannels(query: string, userId: string): Promise<Channel[]> {
    return await channelRepository.searchChannels(query, userId);
  }
}

/**
 * Task Service
 */
export class TaskService {
  async createTask(userId: string, data: any): Promise<Task> {
    const task = await taskRepository.create({
      ...data,
      createdById: userId,
    });

    // Send notification to assignee
    if (task.assignedToId && task.assignedToId !== userId) {
      await notificationRepository.create({
        userId: task.assignedToId,
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.MEDIUM,
        title: 'New Task Assigned',
        message: `You have been assigned: ${task.title}`,
        data: { taskId: task.id },
      });
    }

    logger.info('Task created', { taskId: task.id });
    return task;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, userId: string): Promise<Task> {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new NotFoundError('Task not found');

    await taskRepository.updateTaskStatus(taskId, status);
    const updated = await taskRepository.findById(taskId);

    logger.info('Task status updated', { taskId, status });
    return updated!;
  }

  async getUserTasks(userId: string, status?: TaskStatus): Promise<Task[]> {
    return await taskRepository.findByAssignee(userId, status);
  }

  async getTaskStatistics(userId: string): Promise<any> {
    return await taskRepository.getTaskStatistics(userId);
  }
}

/**
 * Notification Service
 */
export class NotificationService {
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await notificationRepository.findByUser(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundError('Notification not found');
    }

    await notificationRepository.markAsRead(notificationId);
    socketManager.emitToUser(userId, 'notification:read', { notificationId });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await notificationRepository.markAllAsRead(userId);
    socketManager.emitToUser(userId, 'notifications:all_read', {});
  }
}

export const messageService = new MessageService();
export const channelService = new ChannelService();
export const taskService = new TaskService();
export const notificationService = new NotificationService();

import userRepository from '../repositories/user.repository';