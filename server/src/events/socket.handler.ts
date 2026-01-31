import { Server, Socket } from 'socket.io';
import { SocketWithAuth } from '../config/socket.config';
import { messageService, channelService } from '../services/business.services';
import userService from '../services/user.service';
import logger from '../config/logger.config';

export class SocketEvents {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Register all socket event handlers
   */
  public registerEvents(socket: SocketWithAuth): void {
    // Connection established
    this.handleConnection(socket);

    // Message events
    socket.on('message:send', (data) => this.handleSendMessage(socket, data));
    socket.on('message:typing', (data) => this.handleTyping(socket, data));
    socket.on('message:read', (data) => this.handleMessageRead(socket, data));

    // Channel events
    socket.on('channel:join', (data) => this.handleJoinChannel(socket, data));
    socket.on('channel:leave', (data) => this.handleLeaveChannel(socket, data));

    // Presence events
    socket.on('presence:update', (data) => this.handlePresenceUpdate(socket, data));

    // Disconnection
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  /**
   * Handle new connection
   */
  private async handleConnection(socket: SocketWithAuth): Promise<void> {
    const userId = socket.userId!;

    // Join user's personal room
    await socket.join(`user:${userId}`);

    // Update online status
    await userService.updateOnlineStatus(userId, true);

    // Join user's channels
    const channels = await channelService.getUserChannels(userId);
    for (const channel of channels) {
      await socket.join(`channel:${channel.id}`);
    }

    // Broadcast user online status
    this.io.emit('user:online', { userId });

    logger.info('Socket connection established', { userId, socketId: socket.id });
  }

  /**
   * Handle disconnect
   */
  private async handleDisconnect(socket: SocketWithAuth): Promise<void> {
    const userId = socket.userId!;

    // Update online status
    await userService.updateOnlineStatus(userId, false);

    // Broadcast user offline status
    this.io.emit('user:offline', { userId });

    logger.info('Socket disconnected', { userId, socketId: socket.id });
  }

  /**
   * Handle send message
   */
  private async handleSendMessage(socket: SocketWithAuth, data: any): Promise<void> {
    try {
      const userId = socket.userId!;
      const { channelId, content, type } = data;

      const message = await messageService.sendMessage(userId, channelId, content, type);

      // Broadcast to channel
      this.io.to(`channel:${channelId}`).emit('message:new', message);

      logger.debug('Message sent via socket', { messageId: message.id, userId, channelId });
    } catch (error) {
      socket.emit('error', {
        event: 'message:send',
        message: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(socket: SocketWithAuth, data: any): void {
    const userId = socket.userId!;
    const { channelId, isTyping } = data;

    socket.to(`channel:${channelId}`).emit('user:typing', {
      userId,
      channelId,
      isTyping,
    });
  }

  /**
   * Handle message read
   */
  private handleMessageRead(socket: SocketWithAuth, data: any): void {
    const userId = socket.userId!;
    const { messageId, channelId } = data;

    socket.to(`channel:${channelId}`).emit('message:read', {
      userId,
      messageId,
    });
  }

  /**
   * Handle join channel
   */
  private async handleJoinChannel(socket: SocketWithAuth, data: any): Promise<void> {
    try {
      const { channelId } = data;

      await socket.join(`channel:${channelId}`);

      socket.emit('channel:joined', { channelId });

      logger.debug('User joined channel room', {
        userId: socket.userId,
        channelId,
      });
    } catch (error) {
      socket.emit('error', {
        event: 'channel:join',
        message: error instanceof Error ? error.message : 'Failed to join channel',
      });
    }
  }

  /**
   * Handle leave channel
   */
  private async handleLeaveChannel(socket: SocketWithAuth, data: any): Promise<void> {
    try {
      const { channelId } = data;

      await socket.leave(`channel:${channelId}`);

      socket.emit('channel:left', { channelId });

      logger.debug('User left channel room', {
        userId: socket.userId,
        channelId,
      });
    } catch (error) {
      socket.emit('error', {
        event: 'channel:leave',
        message: error instanceof Error ? error.message : 'Failed to leave channel',
      });
    }
  }

  /**
   * Handle presence update
   */
  private async handlePresenceUpdate(socket: SocketWithAuth, data: any): Promise<void> {
    const userId = socket.userId!;
    const { status } = data; // online, away, busy, offline

    this.io.emit('user:presence', {
      userId,
      status,
      timestamp: new Date(),
    });
  }
}

export default SocketEvents;