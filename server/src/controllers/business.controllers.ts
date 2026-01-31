import { Request, Response } from 'express';
import { messageService, channelService, taskService, notificationService } from '../services/business.services';
import { ResponseFormatter } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import { PaginationUtil } from '../utils/pagination.util';

/**
 * Message Controller
 */
export class MessageController {
  sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { channelId, content, type } = req.body;

    const message = await messageService.sendMessage(userId, channelId, content, type);

    ResponseFormatter.created(res, message, 'Message sent successfully');
  });

  getChannelMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { channelId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await messageService.getChannelMessages(channelId, userId, Number(page));

    ResponseFormatter.successWithPagination(
      res,
      result.data,
      { page: Number(page), limit: Number(limit), total: result.total },
      'Messages retrieved successfully'
    );
  });

  deleteMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { messageId } = req.params;

    await messageService.deleteMessage(messageId, userId);

    ResponseFormatter.success(res, null, 'Message deleted successfully');
  });
}

/**
 * Channel Controller
 */
export class ChannelController {
  createChannel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const channelData = req.body;

    const channel = await channelService.createChannel(userId, channelData);

    ResponseFormatter.created(res, channel, 'Channel created successfully');
  });

  getUserChannels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const channels = await channelService.getUserChannels(userId);

    ResponseFormatter.success(res, channels, 'Channels retrieved successfully');
  });

  getChannelById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { channelId } = req.params;

    const channel = await channelRepository.findById(channelId, {
      relations: ['members', 'createdBy'],
    });

    if (!channel) {
      ResponseFormatter.notFound(res, 'Channel not found');
      return;
    }

    ResponseFormatter.success(res, channel, 'Channel retrieved successfully');
  });

  joinChannel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { channelId } = req.params;

    await channelService.joinChannel(channelId, userId);

    ResponseFormatter.success(res, null, 'Joined channel successfully');
  });

  leaveChannel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { channelId } = req.params;

    await channelService.leaveChannel(channelId, userId);

    ResponseFormatter.success(res, null, 'Left channel successfully');
  });

  searchChannels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { q } = req.query;

    const channels = await channelService.searchChannels(q as string, userId);

    ResponseFormatter.success(res, channels, 'Channels retrieved successfully');
  });
}

/**
 * Task Controller
 */
export class TaskController {
  createTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const taskData = req.body;

    const task = await taskService.createTask(userId, taskData);

    ResponseFormatter.created(res, task, 'Task created successfully');
  });

  getUserTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { status } = req.query;

    const tasks = await taskService.getUserTasks(userId, status as any);

    ResponseFormatter.success(res, tasks, 'Tasks retrieved successfully');
  });

  getTaskById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;

    const task = await taskRepository.findById(taskId, {
      relations: ['assignedTo', 'createdBy', 'channel'],
    });

    if (!task) {
      ResponseFormatter.notFound(res, 'Task not found');
      return;
    }

    ResponseFormatter.success(res, task, 'Task retrieved successfully');
  });

  updateTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;
    const updateData = req.body;

    const task = await taskRepository.update(taskId, updateData);

    ResponseFormatter.success(res, task, 'Task updated successfully');
  });

  updateTaskStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    const { status } = req.body;

    const task = await taskService.updateTaskStatus(taskId, status, userId);

    ResponseFormatter.success(res, task, 'Task status updated successfully');
  });

  deleteTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params;

    await taskRepository.delete(taskId);

    ResponseFormatter.success(res, null, 'Task deleted successfully');
  });

  getTaskStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const stats = await taskService.getTaskStatistics(userId);

    ResponseFormatter.success(res, stats, 'Statistics retrieved successfully');
  });
}

/**
 * Notification Controller
 */
export class NotificationController {
  getUserNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const notifications = await notificationService.getUserNotifications(userId);

    ResponseFormatter.success(res, notifications, 'Notifications retrieved successfully');
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const count = await notificationService.getUnreadCount(userId);

    ResponseFormatter.success(res, { count }, 'Unread count retrieved successfully');
  });

  markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { notificationId } = req.params;

    await notificationService.markAsRead(notificationId, userId);

    ResponseFormatter.success(res, null, 'Notification marked as read');
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    await notificationService.markAllAsRead(userId);

    ResponseFormatter.success(res, null, 'All notifications marked as read');
  });
}

export const messageController = new MessageController();
export const channelController = new ChannelController();
export const taskController = new TaskController();
export const notificationController = new NotificationController();

import channelRepository from '../repositories/channel.repository';
import taskRepository from '../repositories/task.repository';