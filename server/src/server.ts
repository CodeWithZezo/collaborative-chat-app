import express, { Application } from 'express';
import { createServer, Server as HTTPServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { databaseManager } from './config/database.config';
import { redisManager } from './config/redis.config';
import { initializeSocketIO, socketManager } from './config/socket.config';
import { queueManager } from './config/queue.config';
import logger, { loggerStream } from './config/logger.config';
import routes from './routes';
import SocketEvents from './events/socket.handler.ts';
import {
  errorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  handleGracefulShutdown,
} from './middlewares/error.middleware';
import { generalRateLimiter } from './middlewares/rateLimit.middleware';
import { requestId, responseTime } from './middlewares/logger.middleware';

class App {
  private app: Application;
  private httpServer: HTTPServer;
  private port: number;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.port = config.app.port;

    this.setupExceptionHandlers();
  }

  /**
   * Setup exception handlers
   */
  private setupExceptionHandlers(): void {
    handleUncaughtException();
    handleUnhandledRejection();
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Request tracking
    this.app.use(requestId);
    this.app.use(responseTime);

    // Logging
    if (config.app.isDevelopment) {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', { stream: loggerStream }));
    }

    // Rate limiting
    this.app.use('/api', generalRateLimiter);

    logger.info('Middleware initialized');
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // API routes
    this.app.use('/', routes);

    // 404 handler
    this.app.use(notFoundHandler);

    // Error handler
    this.app.use(errorHandler);

    logger.info('Routes initialized');
  }

  /**
   * Initialize database
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await databaseManager.connect();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Initialize Redis
   */
  private async initializeRedis(): Promise<void> {
    try {
      await redisManager.connect();
      logger.info('Redis initialized successfully');
    } catch (error) {
      logger.error('Redis initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Initialize Socket.IO
   */
  private initializeSocketIO(): void {
    const io = initializeSocketIO(this.httpServer);
    socketManager.setIO(io);

    const socketEvents = new SocketEvents(io);

    io.on('connection', (socket) => {
      socketEvents.registerEvents(socket as any);
    });

    logger.info('Socket.IO initialized successfully');
  }

  /**
   * Initialize background queues
   */
  private initializeQueues(): void {
    queueManager.initializeQueues();
    logger.info('Background queues initialized successfully');
  }

  /**
   * Start server
   */
  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.initializeDatabase();

      // Initialize Redis
      await this.initializeRedis();

      // Initialize middleware
      this.initializeMiddleware();

      // Initialize routes
      this.initializeRoutes();

      // Initialize Socket.IO
      this.initializeSocketIO();

      // Initialize queues
      this.initializeQueues();

      // Start HTTP server
      this.httpServer.listen(this.port, () => {
        logger.info(`🚀 Server started successfully`, {
          port: this.port,
          environment: config.app.env,
          nodeVersion: process.version,
        });

        if (config.app.isDevelopment) {
          console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎉 Team Collaboration Chat App - Server Running!        ║
║                                                            ║
║   📡 API Server:    http://localhost:${this.port}                 ║
║   🔌 WebSocket:     ws://localhost:${this.port}                   ║
║   🏥 Health Check:  http://localhost:${this.port}/health          ║
║   📊 Environment:   ${config.app.env.toUpperCase().padEnd(42)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
          `);
        }
      });

      // Setup graceful shutdown
      handleGracefulShutdown(this.httpServer);

    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');

    try {
      // Close HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });

      // Close database connection
      await databaseManager.disconnect();

      // Close Redis connections
      await redisManager.disconnect();

      // Close queues
      await queueManager.closeAllQueues();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }
}

// Create and start server
const server = new App();
server.start();

// Export for testing
export default server;