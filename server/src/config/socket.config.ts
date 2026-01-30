import { Server as HTTPServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from './index';
import { redisManager } from './redis.config';
import logger from './logger.config';
import { verifyToken } from '../utils/tokenManager.util';

// Socket.IO configuration options
const socketOptions: Partial<ServerOptions> = {
  cors: {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST'],
  },
  pingTimeout: config.socket.pingTimeout,
  pingInterval: config.socket.pingInterval,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6, // 1MB
  perMessageDeflate: {
    threshold: 1024, // Compress messages larger than 1KB
  },
};

// Socket authentication middleware
export interface SocketWithAuth extends Socket {
  userId?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

// Initialize Socket.IO server
export const initializeSocketIO = (httpServer: HTTPServer): Server => {
  const io = new Server(httpServer, socketOptions);

  // Set up Redis adapter for horizontal scaling
  setupRedisAdapter(io);

  // Authentication middleware
  io.use(async (socket: SocketWithAuth, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn('Socket connection attempted without token', {
          socketId: socket.id,
          ip: socket.handshake.address,
        });
        return next(new Error('Authentication token is required'));
      }

      // Verify JWT token
      const decoded = await verifyToken(token);

      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
      };

      logger.info('Socket authenticated successfully', {
        socketId: socket.id,
        userId: socket.userId,
        username: socket.user.username,
      });

      next();
    } catch (error) {
      logger.error('Socket authentication failed', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(new Error('Authentication failed'));
    }
  });

  // Connection event
  io.on('connection', (socket: SocketWithAuth) => {
    logger.info('Client connected', {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.user?.username,
      transport: socket.conn.transport.name,
    });

    // Handle transport upgrade
    socket.conn.on('upgrade', () => {
      logger.info('Transport upgraded', {
        socketId: socket.id,
        userId: socket.userId,
        transport: socket.conn.transport.name,
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message,
      });
    });
  });

  return io;
};

// Setup Redis adapter for Socket.IO clustering
const setupRedisAdapter = (io: Server): void => {
  try {
    const pubClient = redisManager.getPublisher();
    const subClient = redisManager.getSubscriber();

    io.adapter(createAdapter(pubClient, subClient));

    logger.info('Socket.IO Redis adapter configured successfully');
  } catch (error) {
    logger.error('Failed to set up Socket.IO Redis adapter', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Continue without Redis adapter in development
    if (!config.app.isDevelopment) {
      throw error;
    }
  }
};

// Socket.IO helper utilities
export class SocketManager {
  private io: Server | null = null;

  public setIO(io: Server): void {
    this.io = io;
  }

  public getIO(): Server {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }
    return this.io;
  }

  // Emit to specific user
  public emitToUser(userId: string, event: string, data: unknown): void {
    const io = this.getIO();
    io.to(`user:${userId}`).emit(event, data);
    logger.debug('Event emitted to user', { userId, event });
  }

  // Emit to specific channel/room
  public emitToChannel(channelId: string, event: string, data: unknown): void {
    const io = this.getIO();
    io.to(`channel:${channelId}`).emit(event, data);
    logger.debug('Event emitted to channel', { channelId, event });
  }

  // Broadcast to all connected clients
  public broadcast(event: string, data: unknown): void {
    const io = this.getIO();
    io.emit(event, data);
    logger.debug('Event broadcasted to all clients', { event });
  }

  // Get all connected sockets for a user
  public async getUserSockets(userId: string): Promise<string[]> {
    const io = this.getIO();
    const sockets = await io.in(`user:${userId}`).fetchSockets();
    return sockets.map((socket) => socket.id);
  }

  // Join user to room
  public async joinRoom(socketId: string, room: string): Promise<void> {
    const io = this.getIO();
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      await socket.join(room);
      logger.debug('Socket joined room', { socketId, room });
    }
  }

  // Leave room
  public async leaveRoom(socketId: string, room: string): Promise<void> {
    const io = this.getIO();
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      await socket.leave(room);
      logger.debug('Socket left room', { socketId, room });
    }
  }

  // Get online users count
  public async getOnlineUsersCount(): Promise<number> {
    const io = this.getIO();
    const sockets = await io.fetchSockets();
    return sockets.length;
  }

  // Check if user is online
  public async isUserOnline(userId: string): Promise<boolean> {
    const sockets = await this.getUserSockets(userId);
    return sockets.length > 0;
  }
}

// Export singleton instance
export const socketManager = new SocketManager();

export default initializeSocketIO;