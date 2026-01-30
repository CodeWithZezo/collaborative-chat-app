import Redis, { RedisOptions } from 'ioredis';
import { config } from './index';
import logger from './logger.config';

// Redis configuration options
const redisOptions: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.db,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}, retrying in ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Redis client manager
export class RedisManager {
  private static instance: RedisManager;
  private client: Redis | null = null;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info('Redis is already connected');
        return;
      }

      // Create main client
      this.client = new Redis(redisOptions);

      // Create publisher client for pub/sub
      this.publisher = new Redis(redisOptions);

      // Create subscriber client for pub/sub
      this.subscriber = new Redis(redisOptions);

      // Set up event listeners
      this.setupEventListeners();

      // Wait for connections
      await Promise.all([
        this.waitForConnection(this.client, 'Main client'),
        this.waitForConnection(this.publisher, 'Publisher'),
        this.waitForConnection(this.subscriber, 'Subscriber'),
      ]);

      this.isConnected = true;
      logger.info('Redis connections established successfully', {
        host: config.redis.host,
        port: config.redis.port,
      });
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: config.redis.host,
        port: config.redis.port,
      });
      throw error;
    }
  }

  private waitForConnection(client: Redis, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${name} connection timeout`));
      }, 10000);

      client.once('ready', () => {
        clearTimeout(timeout);
        logger.info(`${name} ready`);
        resolve();
      });

      client.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private setupEventListeners(): void {
    // Main client events
    this.client?.on('error', (error) => {
      logger.error('Redis client error', { error: error.message });
    });

    this.client?.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    this.client?.on('end', () => {
      logger.warn('Redis client connection ended');
      this.isConnected = false;
    });

    // Publisher events
    this.publisher?.on('error', (error) => {
      logger.error('Redis publisher error', { error: error.message });
    });

    // Subscriber events
    this.subscriber?.on('error', (error) => {
      logger.error('Redis subscriber error', { error: error.message });
    });
  }

  public async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.info('Redis is already disconnected');
        return;
      }

      await Promise.all([
        this.client?.quit(),
        this.publisher?.quit(),
        this.subscriber?.quit(),
      ]);

      this.client = null;
      this.publisher = null;
      this.subscriber = null;
      this.isConnected = false;

      logger.info('Redis connections closed successfully');
    } catch (error) {
      logger.error('Failed to close Redis connections', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public getClient(): Redis {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client is not connected. Call connect() first.');
    }
    return this.client;
  }

  public getPublisher(): Redis {
    if (!this.publisher || !this.isConnected) {
      throw new Error('Redis publisher is not connected. Call connect() first.');
    }
    return this.publisher;
  }

  public getSubscriber(): Redis {
    if (!this.subscriber || !this.isConnected) {
      throw new Error('Redis subscriber is not connected. Call connect() first.');
    }
    return this.subscriber;
  }

  public isConnectionActive(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client?.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // Cache helper methods
  public async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    const client = this.getClient();
    if (expirySeconds) {
      await client.setex(key, expirySeconds, value);
    } else {
      await client.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  public async delete(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  public async setJson(key: string, value: unknown, expirySeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), expirySeconds);
  }

  public async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  // Pub/Sub methods
  public async publish(channel: string, message: string): Promise<void> {
    const publisher = this.getPublisher();
    await publisher.publish(channel, message);
  }

  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.getSubscriber();
    await subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  public async unsubscribe(channel: string): Promise<void> {
    const subscriber = this.getSubscriber();
    await subscriber.unsubscribe(channel);
  }
}

// Export singleton instance
export const redisManager = RedisManager.getInstance();

// Export default for convenience
export default redisManager;