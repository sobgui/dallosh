/**
 * Main Server Bootstrap
 * Initialize and start the Sodular backend server
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { SodularServer } from './core';
import { SodularDatabaseService } from './lib/database';
import { SodularStorageService } from './lib/storage';
import { APIEndpoints } from './api';
import { rootScripts } from './scripts';
import { ENV } from './configs/env';
import { Logger } from './core/utils';
import { SocketServer } from './core/server/socket';

async function bootstrap() {
  try {
    Logger.info('🚀 Starting Sodular Backend Server...');

    // Initialize the Express server
    const app = new SodularServer({
      port: ENV.PORT,
      host: ENV.HOST,
      enableSSL: ENV.ENABLE_SSL,
      sslCertDir: ENV.SSL_CERT_DIR,
      sslPemDir: ENV.SSL_PEM_DIR,
      apiVersion: ENV.API_VERSION,
      apiDocs: ENV.API_DOCS,
      corsOrigin: ENV.CORS_ORIGIN
    });

    // Initialize the Socket server
    const socket = new SocketServer(app.getApp(), {
      cors: {
        origin: ENV.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
      }
    });

    // Store socket reference for shutdown handlers
    (global as any).socketServer = socket;

    // Initialize the database service
    Logger.info('🔍 Initializing database service...');
    const sodularDatabaseService = new SodularDatabaseService({
      type: 'mongodb',
      database: {
        host: ENV.DB_HOST,
        port: ENV.DB_PORT,
        dbName: ENV.DB_NAME
      },
      auth: ENV.DB_USER ? {
        user: ENV.DB_USER,
        password: ENV.DB_PASSWORD || ''
      } : undefined,
      maxQueryLimit: ENV.MAX_QUERY_LIMIT,
      mode: ENV.NODE_ENV as 'development' | 'production' | 'test'
    });

    // Connect to the primary database
    Logger.info('🔍 Connecting to the primary database...');
    console.log('DEBUG: About to connect to database');
    const { isReady: databaseReady, error: databaseError, database } = await sodularDatabaseService.connect();
    console.log('DEBUG: Database connection result:', { databaseReady, databaseError });

    if (!databaseReady) {
      Logger.error('❌ Database connection failed:', databaseError);
      console.error('DEBUG: Database connection failed, exiting');
      process.exit(1);
    }

    Logger.info('✅ Database connected successfully');

    // Run setup scripts (create default data, root user, etc.)
    Logger.info('📋 Running setup scripts...');
    await rootScripts({ isReady: databaseReady, database });

    let sodularStorageService =  new SodularStorageService({
      type: 'local',
      configs:{
        localStoragePath: ENV.LOCAL_STORAGE_PATH,
        prefix:ENV.PREFIX_PATH,
      },
      chunkFileSize:ENV.CHUNK_FILE_SIZE,
      database
    });
  
    let { isReady:storageReady, error:storageError, storage } = await sodularStorageService.connect()
  

    // Setup global middleware for database, storage services, and socket
    Logger.info('🔧 Setting up middleware...');
    app.use((req: any, _res: any, next: any) => {
      Logger.debug('🔧 Middleware: Setting database service:', {
        hasDatabaseService: !!database,
        databaseType: typeof database,
        hasTable: !!(database && database.tables),
        tableType: typeof database.tables,
        hasRef: !!(database && database.ref),
        refType: typeof database.ref,
      });

      Logger.debug('🔧 Middleware: Setting storage service:', {
        hasStorageService: !!storage,
        storageType: typeof storage,
      });

      Logger.debug('🔧 Middleware: Setting socket service:', {
        hasSocketService: !!socket,
        socketType: typeof socket,
      });
      
      (req as any).databaseService = {
        isReady: databaseReady,
        database: database
      };

      (req as any).storageService = {
        isReady: storageReady,
        storage: storage
      };

      (req as any).socket = socket;
      next();
    });

    // Register API endpoints
    Logger.info('🛣️  Registering API endpoints...');
    app.addEndpoints(APIEndpoints);

    // Start the socket server and get the HTTP server
    Logger.info('🔌 Starting socket server...');
    socket.start();
    
    // Get the HTTP server from socket and start it
    const httpServer = socket.getHttpServer();
    if (httpServer) {
      Logger.info('🌟 Starting server with socket support...');
      httpServer.listen(ENV.PORT, ENV.HOST, () => {
        Logger.info(`🚀 Sodular server started successfully with socket support!`);
        Logger.info(`📍 Server running at: http://${ENV.HOST}:${ENV.PORT}`);
        Logger.info(`🌍 Environment: ${ENV.NODE_ENV}`);
        Logger.info(`📊 API Version: ${ENV.API_VERSION}`);
        
        if (ENV.NODE_ENV === 'development') {
          Logger.info(`📚 API Docs: http://${ENV.HOST}:${ENV.PORT}${ENV.API_VERSION}${ENV.API_DOCS}`);
        }
      });
    } else {
      Logger.error('❌ Failed to get HTTP server from socket server');
      process.exit(1);
    }

    Logger.info('🎉 Sodular Backend Server started successfully!');
    Logger.info(`🌐 Server running on: ${ENV.ENABLE_SSL ? 'https' : 'http'}://${ENV.HOST}:${ENV.PORT}`);
    Logger.info(`📚 API Documentation: ${ENV.ENABLE_SSL ? 'https' : 'http'}://${ENV.HOST}:${ENV.PORT}${ENV.API_VERSION}${ENV.API_DOCS}`);
    Logger.info(`🔗 Health Check: ${ENV.ENABLE_SSL ? 'https' : 'http'}://${ENV.HOST}:${ENV.PORT}${ENV.API_VERSION}/health`);

  } catch (error) {
    console.error('DEBUG: Bootstrap error:', error);
    Logger.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  Logger.info('🛑 Received SIGINT, shutting down gracefully...');
  if ((global as any).socketServer) {
    (global as any).socketServer.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  if ((global as any).socketServer) {
    (global as any).socketServer.stop();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  Logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('💥 Unhandled Rejection at:', String(promise) + ' reason: ' + String(reason));
  process.exit(1);
});

// Start the application
bootstrap();
