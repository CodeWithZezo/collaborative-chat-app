import Queue, { Job, QueueOptions } from 'bull';
import { config } from './index';
import logger from './logger.config';

// Queue configuration options
const queueOptions: QueueOptions = {
  redis: {
    host: config.bull.redisHost,
    port: config.bull.redisPort,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
};

// Queue names
export enum QueueNames {
  EMAIL = 'email-queue',
  NOTIFICATION = 'notification-queue',
  FILE_PROCESSING = 'file-processing-queue',
  AUDIT_LOG = 'audit-log-queue',
  SEARCH_INDEX = 'search-index-queue',
  ANALYTICS = 'analytics-queue',
}

// Job data interfaces
export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
  data?: Record<string, unknown>;
}

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface FileProcessingJobData {
  fileId: string;
  filePath: string;
  userId: string;
  action: 'compress' | 'scan' | 'thumbnail';
}

export interface AuditLogJobData {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
}

export interface SearchIndexJobData {
  type: 'create' | 'update' | 'delete';
  documentId: string;
  documentType: 'message' | 'task' | 'channel';
  data?: Record<string, unknown>;
}

export interface AnalyticsJobData {
  event: string;
  userId?: string;
  properties?: Record<string, unknown>;
}

// Queue manager class
class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue.Queue> = new Map();

  private constructor() {}

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  // Initialize all queues
  public initializeQueues(): void {
    Object.values(QueueNames).forEach((queueName) => {
      this.createQueue(queueName);
    });
    logger.info('All queues initialized successfully');
  }

  // Create a queue
  private createQueue(name: string): Queue.Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, queueOptions);

    // Set up event listeners
    queue.on('error', (error) => {
      logger.error(`Queue error: ${name}`, { error: error.message });
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job failed: ${name}`, {
        jobId: job.id,
        error: error.message,
        attempts: job.attemptsMade,
      });
    });

    queue.on('completed', (job) => {
      logger.info(`Job completed: ${name}`, {
        jobId: job.id,
        duration: job.finishedOn ? job.finishedOn - job.processedOn! : 0,
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job stalled: ${name}`, { jobId: job.id });
    });

    this.queues.set(name, queue);
    logger.info(`Queue created: ${name}`);

    return queue;
  }

  // Get a queue
  public getQueue(name: string): Queue.Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue not found: ${name}`);
    }
    return queue;
  }

  // Add job to queue
  public async addJob<T>(queueName: string, data: T, options?: Queue.JobOptions): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(data, options);
    logger.debug(`Job added to queue: ${queueName}`, { jobId: job.id });
    return job;
  }

  // Process jobs in queue
  public processQueue<T>(
    queueName: string,
    concurrency: number,
    processor: (job: Job<T>) => Promise<void>
  ): void {
    const queue = this.getQueue(queueName);
    queue.process(concurrency, async (job: Job<T>) => {
      logger.debug(`Processing job: ${queueName}`, { jobId: job.id });
      await processor(job);
    });
  }

  // Get queue metrics
  public async getQueueMetrics(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  // Clean completed jobs
  public async cleanQueue(queueName: string, grace: number = 3600000): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    logger.info(`Queue cleaned: ${queueName}`, { gracePeriod: grace });
  }

  // Pause queue
  public async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    logger.info(`Queue paused: ${queueName}`);
  }

  // Resume queue
  public async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info(`Queue resumed: ${queueName}`);
  }

  // Close all queues
  public async closeAllQueues(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) => queue.close());
    await Promise.all(closePromises);
    this.queues.clear();
    logger.info('All queues closed successfully');
  }
}

// Export singleton instance
export const queueManager = QueueManager.getInstance();

// Helper functions for specific queues
export const addEmailJob = async (data: EmailJobData, options?: Queue.JobOptions): Promise<Job<EmailJobData>> => {
  return queueManager.addJob(QueueNames.EMAIL, data, options);
};

export const addNotificationJob = async (
  data: NotificationJobData,
  options?: Queue.JobOptions
): Promise<Job<NotificationJobData>> => {
  return queueManager.addJob(QueueNames.NOTIFICATION, data, options);
};

export const addFileProcessingJob = async (
  data: FileProcessingJobData,
  options?: Queue.JobOptions
): Promise<Job<FileProcessingJobData>> => {
  return queueManager.addJob(QueueNames.FILE_PROCESSING, data, options);
};

export const addAuditLogJob = async (
  data: AuditLogJobData,
  options?: Queue.JobOptions
): Promise<Job<AuditLogJobData>> => {
  return queueManager.addJob(QueueNames.AUDIT_LOG, data, options);
};

export const addSearchIndexJob = async (
  data: SearchIndexJobData,
  options?: Queue.JobOptions
): Promise<Job<SearchIndexJobData>> => {
  return queueManager.addJob(QueueNames.SEARCH_INDEX, data, options);
};

export const addAnalyticsJob = async (
  data: AnalyticsJobData,
  options?: Queue.JobOptions
): Promise<Job<AnalyticsJobData>> => {
  return queueManager.addJob(QueueNames.ANALYTICS, data, options);
};

export default queueManager;