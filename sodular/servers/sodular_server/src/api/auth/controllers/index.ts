/**
 * Auth Controllers
 * Handle HTTP requests and responses for authentication endpoints
 */

import { Request, Response } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { Logger } from '@/core/utils';
import { AuthService } from '../services';
import { 
  LoginRequest, 
  RegisterRequest, 
  CreateUserRequest, 
  UpdateUserRequest 
} from '@/types/schema/users.schema';
import { 
  QueryOptions,
  GetOptions,
  CountOptions,
  DeleteOptions,
  Filter
} from '@/lib/database/types';

export class AuthController {
  /**
   * Register a new user
   * POST /auth/register?database_id=uuid
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      // Extract data from unified request format: { uid?, data: { email, password, username? } }
      const registerRequest: RegisterRequest = req.body.data;

      const result = await authService.register(registerRequest);
      
      if (result.error) {
        ResponseHelper.badRequest(res, result.error);
        return;
      }

      ResponseHelper.created(res, result.value);
    } catch (error) {
      Logger.error('Register controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Login user
   * POST /auth/login?database_id=uuid
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      // Extract data from unified request format: { uid?, data: { email, password } }
      const loginRequest: LoginRequest = req.body.data;

      const result = await authService.login(loginRequest);
      
      if (result.error) {
        ResponseHelper.unauthorized(res, result.error);
        return;
      }

      ResponseHelper.authSuccess(res, result.value);
    } catch (error) {
      Logger.error('Login controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Refresh access token
   * POST /auth/refresh-token?refreshToken=token&database_id=uuid
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      const refreshToken = req.query.refreshToken as string;

      const result = await authService.refreshToken(refreshToken);
      
      if (result.error) {
        ResponseHelper.unauthorized(res, result.error);
        return;
      }

      ResponseHelper.success(res, result.value);
    } catch (error) {
      Logger.error('Refresh token controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Create user (without tokens)
   * POST /auth?database_id=uuid
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      const createRequest: CreateUserRequest = req.body;
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      createRequest.createdBy = userId;

      const result = await authService.create(createRequest);
      
      ResponseHelper.handleDatabaseResult(res, result, 201);
    } catch (error) {
      Logger.error('Create user controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Get single user
   * GET /auth?database_id=uuid
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      
      const options: GetOptions = {
        filter: req.query.filter as Filter,
        select: req.query.select as string[],
      };

      const result = await authService.get(options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Get user controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Query multiple users
   * GET /auth/query?database_id=uuid
   */
  static async query(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      
      const options: QueryOptions = {
        filter: req.query.filter as Filter,
        select: req.query.select as string[],
        sort: req.query.sort as Record<string, 'asc' | 'desc' | 1 | -1>,
        take: (req.query as any).take as number,
        skip: (req.query as any).skip as number,
      };

      const result = await authService.query(options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Query users controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Count users
   * GET /auth/count?database_id=uuid
   */
  static async count(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      
      const options: CountOptions = {
        filter: req.query.filter as Filter,
      };

      const result = await authService.count(options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Count users controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Update users (PUT)
   * PUT /auth?database_id=uuid
   */
  static async put(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      const filter = req.query.filter as Filter;
      const updateRequest: UpdateUserRequest = req.body;

      const result = await authService.put(filter, updateRequest);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Put users controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Update users (PATCH)
   * PATCH /auth?database_id=uuid
   */
  static async patch(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      const filter = req.query.filter as Filter;
      const updateRequest: UpdateUserRequest = req.body;
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      updateRequest.updatedBy = userId;

      const result = await authService.patch(filter, updateRequest);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Patch users controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Delete users
   * DELETE /auth?database_id=uuid
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Get temporary database context if specified (doesn't affect global context)
      const targetDatabaseId = req.query.database_id as string;
      const contextDatabase = targetDatabaseId ?
        database.getTemporaryContext(targetDatabaseId) :
        database;

      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const authService = new AuthService(contextDatabase);
      const filter = req.query.filter as Filter;
      
      // Parse options from query
      let options: DeleteOptions | undefined;
      if (req.query.options) {
        try {
          options = JSON.parse(req.query.options as string);
        } catch (error) {
          ResponseHelper.badRequest(res, 'Invalid options JSON format');
          return;
        }
      }

      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      if (options && options.withSoftDelete) {
        options.deletedBy = userId;
      }

      const result = await authService.delete(filter, options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Delete users controller error:', error);
      ResponseHelper.internalError(res);
    }
  }
}
