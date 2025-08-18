import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Application } from 'express';
import { Logger } from '../utils';

export interface SocketServerConfig {
  cors?: {
    origin: string | string[];
    methods?: string[];
  };
}

export class SocketServer {
  private io: SocketIOServer | null = null;
  private httpServer: HTTPServer | null = null;
  private app: Application;
  private config: SocketServerConfig;

  constructor(app: Application, config: SocketServerConfig = {}) {
    this.app = app;
    this.config = config;
  }

  /**
   * Start the socket server
   */
  start(): void {
    try {
      // Create HTTP server from Express app
      this.httpServer = new HTTPServer(this.app);
      
      // Create Socket.IO server
      this.io = new SocketIOServer(this.httpServer, {
        cors: this.config.cors || {
          origin: "*",
          methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
        },
        transports: ['websocket', 'polling']
      });

      // Handle socket connections
      this.io.on('connection', (socket) => {
        Logger.info(`Socket connected: ${socket.id}`);
        
        // Handle disconnection
        socket.on('disconnect', () => {
          Logger.info(`Socket disconnected: ${socket.id}`);
        });

        // Handle join room (for specific database/table combinations)
        socket.on('join', (data: { database_id?: string; table_id: string }) => {
          const channel = this.buildChannel(data.database_id, data.table_id);
          socket.join(channel);
          Logger.debug(`Socket ${socket.id} joined channel: ${channel}`);
        });

        // Handle leave room
        socket.on('leave', (data: { database_id?: string; table_id: string }) => {
          const channel = this.buildChannel(data.database_id, data.table_id);
          socket.leave(channel);
          Logger.debug(`Socket ${socket.id} left channel: ${channel}`);
        });
      });

      Logger.info('Socket server started successfully');
    } catch (error) {
      Logger.error('Failed to start socket server:', error);
      throw error;
    }
  }

  /**
   * Build channel name for database/table combination
   */
  private buildChannel(databaseId?: string, tableId: string = ''): string {
    if (databaseId) {
      return `/ref/database/${databaseId}/tables/${tableId}`;
    }
    return `/ref/tables/${tableId}`;
  }

  /**
   * Emit event to a specific channel
   */
  emit(channel: string, event: string, data: any): void {
    if (!this.io) {
      Logger.warn('Socket server not started, cannot emit event');
      return;
    }

    try {
      this.io.to(channel).emit(event, data);
      Logger.debug(`Emitted event '${event}' to channel '${channel}' with data:`, data);
    } catch (error) {
      Logger.error(`Failed to emit event '${event}' to channel '${channel}':`, error);
    }
  }

  /**
   * Emit ref events (created, replaced, patched, deleted)
   */
  emitRefEvent(
    databaseId: string | undefined, 
    tableId: string, 
    event: 'created' | 'replaced' | 'patched' | 'deleted', 
    data: any
  ): void {
    const channel = this.buildChannel(databaseId, tableId);
    this.emit(channel, event, data);
  }

  /**
   * Get the HTTP server instance
   */
  getHttpServer(): HTTPServer | null {
    return this.httpServer;
  }

  /**
   * Get the Socket.IO instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Stop the socket server
   */
  stop(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
    Logger.info('Socket server stopped');
  }
}
