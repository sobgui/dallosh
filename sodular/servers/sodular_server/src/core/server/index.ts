/**
 * Sodular Express Server
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env, isDevelopment } from '@/configs/env';
import { HTTP_STATUS } from '@/configs/constant';
import { ResponseHelper, ApiError } from '../helpers';
import { Logger } from '../utils';
import { swaggerSpec } from './docs';

// Server configuration interface
export interface ServerConfig {
  port?: number;
  host?: string;
  enableSSL?: boolean;
  sslCertDir?: string;
  sslPemDir?: string;
  corsOrigin?: string;
  apiVersion?: string;
  apiDocs?: string;
}

// Endpoint interface
export interface Endpoint {
  path: string;
  router: express.Router;
}

export class SodularServer {
  private app: Application;
  private config: ServerConfig;

  constructor(config?: ServerConfig) {
    this.app = express();
    this.config = {
      port: config?.port || env.PORT,
      host: config?.host || env.HOST,
      enableSSL: config?.enableSSL || env.ENABLE_SSL,
      sslCertDir: config?.sslCertDir || env.SSL_CERT_DIR,
      sslPemDir: config?.sslPemDir || env.SSL_PEM_DIR,
      corsOrigin: config?.corsOrigin || env.CORS_ORIGIN,
      apiVersion: config?.apiVersion || env.API_VERSION,
      apiDocs: config?.apiDocs || env.API_DOCS,
    };

    this.setupMiddleware();
    this.setupRoutes();
    // Note: Error handling is set up after endpoints are added
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS middleware
    this.app.use(cors({
      origin: this.config.corsOrigin === '*' ? true : this.config.corsOrigin,
      credentials: true,
    }));

    // Logging middleware
    if (isDevelopment) {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      Logger.debug(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
      });
      next();
    });
  }

  /**
   * Setup basic routes
   */
  private setupRoutes(): void {
    // Health check endpoint (with API version prefix)
    this.app.get(`${this.config.apiVersion}/health`, (req: Request, res: Response) => {
      ResponseHelper.success(res, {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
      });
    });

    // API documentation (only in development)
    if (isDevelopment && this.config.apiDocs) {
      const docsPath = `${this.config.apiVersion}${this.config.apiDocs}`;
      this.app.use(docsPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Sodular API Documentation',
      }));
      
      Logger.info(`📚 API Documentation available at: http://${this.config.host}:${this.config.port}${docsPath}`);
    }

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      ResponseHelper.success(res, {
        name: 'Sodular API',
        version: '1.0.0',
        description: 'Headless CMS with database agnostic REST API',
        documentation: isDevelopment ? `${this.config.apiVersion}${this.config.apiDocs}` : undefined,
      });
    });
  }

  /**
   * Add API endpoints
   */
  public addEndpoints(endpoints: Endpoint[]): void {
    endpoints.forEach(endpoint => {
      const fullPath = `${this.config.apiVersion}${endpoint.path}`;

      // Debug router information
      Logger.debug(`🔍 Router debug for ${fullPath}:`, {
        routerType: typeof endpoint.router,
        isFunction: typeof endpoint.router === 'function',
        hasStack: endpoint.router && (endpoint.router as any).stack ? (endpoint.router as any).stack.length : 'no stack',
        stackRoutes: endpoint.router && (endpoint.router as any).stack ?
          (endpoint.router as any).stack.map((layer: any) => `${layer.route?.path || 'middleware'} (${layer.route?.methods ? Object.keys(layer.route.methods).join(',') : 'no methods'})`) :
          'no routes'
      });

      this.app.use(fullPath, endpoint.router);
      Logger.info(`🔗 Endpoint registered: ${fullPath}`);
    });
  }

  /**
   * Add a single endpoint
   */
  public addEndpoint(endpoint: Endpoint): void {
    this.addEndpoints([endpoint]);
  }

  /**
   * Add middleware
   */
  public use(middleware: any): void {
    this.app.use(middleware);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      ResponseHelper.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
    });

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      Logger.error('Unhandled error:', error);

      // Handle API errors
      if (error instanceof ApiError) {
        return ResponseHelper.error(res, error.message, error.statusCode);
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        return ResponseHelper.validationError(res, error.message);
      }

      // Handle JWT errors
      if (error.name === 'JsonWebTokenError') {
        return ResponseHelper.unauthorized(res, 'Invalid token');
      }

      if (error.name === 'TokenExpiredError') {
        return ResponseHelper.unauthorized(res, 'Token expired');
      }

      // Handle MongoDB errors
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        if (error.code === 11000) {
          return ResponseHelper.conflict(res, 'Duplicate entry');
        }
        return ResponseHelper.internalError(res, 'Database error');
      }

      // Default error
      return ResponseHelper.internalError(res, 'Internal server error');
    });
  }

  /**
   * Start the server
   */
  public start(): void {
    // Set up error handling after all endpoints are registered
    this.setupErrorHandling();

    const server = this.app.listen(this.config.port || 5001, this.config.host || '0.0.0.0', () => {
      Logger.info(`🚀 Sodular server started successfully!`);
      Logger.info(`📍 Server running at: http://${this.config.host}:${this.config.port}`);
      Logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      Logger.info(`📊 API Version: ${this.config.apiVersion}`);
      
      if (isDevelopment) {
        Logger.info(`📚 API Docs: http://${this.config.host}:${this.config.port}${this.config.apiVersion}${this.config.apiDocs}`);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      Logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        Logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      Logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        Logger.info('Server closed');
        process.exit(0);
      });
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }
}
