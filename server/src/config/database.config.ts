import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from './index';
import logger from './logger.config';
import path from 'path';

// Database configuration
const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize, // Should be false in production
  logging: config.database.logging,
  entities: [path.join(__dirname, '../models/**/*.model.{ts,js}')],
  migrations: [path.join(__dirname, '../migrations/**/*.{ts,js}')],
  subscribers: [path.join(__dirname, '../subscribers/**/*.{ts,js}')],
  
  // Connection pool settings for production
  extra: {
    max: 20, // Maximum number of connections in pool
    min: 5,  // Minimum number of connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 5000, // Timeout for new connections
  },

  // Enable connection retry
  maxQueryExecutionTime: 5000, // Log queries that take more than 5 seconds
  
  // SSL configuration for production
  ssl: config.app.isProduction
    ? {
        rejectUnauthorized: false,
      }
    : false,
};

// Create DataSource instance
export const AppDataSource = new DataSource(databaseConfig);

// Database connection manager
export class DatabaseManager {
  private static instance: DatabaseManager;
  private dataSource: DataSource;
  private isConnected = false;

  private constructor() {
    this.dataSource = AppDataSource;
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info('Database is already connected');
        return;
      }

      await this.dataSource.initialize();
      this.isConnected = true;
      logger.info('Database connection established successfully', {
        host: config.database.host,
        database: config.database.database,
      });

      // Run pending migrations in production
      if (config.app.isProduction) {
        await this.runMigrations();
      }
    } catch (error) {
      logger.error('Failed to connect to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: config.database.host,
        database: config.database.database,
      });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.info('Database is already disconnected');
        return;
      }

      await this.dataSource.destroy();
      this.isConnected = false;
      logger.info('Database connection closed successfully');
    } catch (error) {
      logger.error('Failed to close database connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public getDataSource(): DataSource {
    if (!this.isConnected) {
      throw new Error('Database is not connected. Call connect() first.');
    }
    return this.dataSource;
  }

  public isConnectionActive(): boolean {
    return this.isConnected && this.dataSource.isInitialized;
  }

  private async runMigrations(): Promise<void> {
    try {
      logger.info('Running database migrations...');
      await this.dataSource.runMigrations();
      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Failed to run database migrations', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();

// Export default for convenience
export default AppDataSource;