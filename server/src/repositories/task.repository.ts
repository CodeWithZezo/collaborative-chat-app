import { BaseRepository } from './base.repository';
import { Task, TaskStatus, TaskPriority } from '../models/task.model';
import logger from '../config/logger.config';

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(Task);
  }

  async findByAssignee(userId: string, status?: TaskStatus): Promise<Task[]> {
    try {
      const where: any = { assignedToId: userId };
      if (status) where.status = status;

      return await this.repository.find({
        where,
        relations: ['createdBy', 'channel'],
        order: { dueDate: 'ASC', priority: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to find tasks by assignee', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findByChannel(channelId: string): Promise<Task[]> {
    try {
      return await this.repository.find({
        where: { channelId },
        relations: ['assignedTo', 'createdBy'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to find tasks by channel', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findOverdueTasks(): Promise<Task[]> {
    try {
      return await this.repository
        .createQueryBuilder('task')
        .where('task.dueDate < :now', { now: new Date() })
        .andWhere('task.status != :doneStatus', { doneStatus: TaskStatus.DONE })
        .andWhere('task.status != :cancelledStatus', { cancelledStatus: TaskStatus.CANCELLED })
        .getMany();
    } catch (error) {
      logger.error('Failed to find overdue tasks', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    try {
      const updateData: any = { status };
      if (status === TaskStatus.DONE) {
        updateData.completedAt = new Date();
        updateData.progressPercentage = 100;
      }

      await this.repository.update(taskId, updateData);
    } catch (error) {
      logger.error('Failed to update task status', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getTaskStatistics(userId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
  }> {
    try {
      const total = await this.count({ assignedToId: userId } as any);
      const todo = await this.count({ assignedToId: userId, status: TaskStatus.TODO } as any);
      const inProgress = await this.count({ assignedToId: userId, status: TaskStatus.IN_PROGRESS } as any);
      const done = await this.count({ assignedToId: userId, status: TaskStatus.DONE } as any);

      const overdueCount = await this.repository
        .createQueryBuilder('task')
        .where('task.assignedToId = :userId', { userId })
        .andWhere('task.dueDate < :now', { now: new Date() })
        .andWhere('task.status != :doneStatus', { doneStatus: TaskStatus.DONE })
        .getCount();

      return { total, todo, inProgress, done, overdue: overdueCount };
    } catch (error) {
      logger.error('Failed to get task statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export default new TaskRepository();