/**
 * Database Controllers
 * Handle HTTP requests and responses for database management endpoints
 */

import { Request, Response } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { Logger } from '@/core/utils';
import { DatabaseService } from '../services';
import { 
  CreateDatabaseRequest,
  UpdateDatabaseRequest
} from '@/types/schema/database.schema';
import { 
  QueryOptions,
  GetOptions,
  CountOptions,
  DeleteOptions,
  Filter
} from '@/lib/database/types';

export class DatabaseController {
  /**
   * Check if database exists
   * GET /database/exists?database_id=uuid
   */
  static async exists(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      const databaseService = new DatabaseService(database);
      const databaseId = req.query.database_id as string;

      const result = await databaseService.exists(databaseId);
      
      if (result.error) {
        ResponseHelper.badRequest(res, result.error);
        return;
      }

      ResponseHelper.success(res, { exists: result.value });
    } catch (error) {
      Logger.error('Database exists controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Create a new database
   * POST /database
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

      const databaseService = new DatabaseService(contextDatabase);
      const createRequest: CreateDatabaseRequest = req.body;
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      createRequest.createdBy = userId;

      const result = await databaseService.create(createRequest);
      
      ResponseHelper.handleDatabaseResult(res, result, 201);
    } catch (error) {
      Logger.error('Database create controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Get single database
   * GET /database
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

      const databaseService = new DatabaseService(contextDatabase);
      
      const options: GetOptions = {
        filter: req.query.filter as Filter,
        select: req.query.select as string[],
      };

      const result = await databaseService.get(options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Database get controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Query multiple databases
   * GET /database/query
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

      const databaseService = new DatabaseService(contextDatabase);
      
      const options: QueryOptions = {
        filter: req.query.filter as Filter,
        select: req.query.select as string[],
        sort: req.query.sort as Record<string, 'asc' | 'desc' | 1 | -1>,
        take: (req.query as any).take as number,
        skip: (req.query as any).skip as number,
      };

      const result = await databaseService.query(options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Database query controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Count databases
   * GET /database/count
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

      const databaseService = new DatabaseService(contextDatabase);
      
      const options: CountOptions = {
        filter: req.query.filter as Filter,
      };

      const result = await databaseService.count(options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Database count controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Update databases (PUT)
   * PUT /database
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

      const databaseService = new DatabaseService(contextDatabase);
      const filter = req.query.filter as Filter;
      const updateRequest: UpdateDatabaseRequest = req.body;

      const result = await databaseService.put(filter, updateRequest);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Database put controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Update databases (PATCH)
   * PATCH /database
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

      const databaseService = new DatabaseService(contextDatabase);
      const filter = req.query.filter as Filter;
      const updateRequest: UpdateDatabaseRequest = req.body;
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      updateRequest.updatedBy = userId;

      const result = await databaseService.patch(filter, updateRequest);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Database patch controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Delete databases
   * DELETE /database
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

      const databaseService = new DatabaseService(contextDatabase);
      const filter = (req.query.filter ?? {}) as any;
      let options = (req.query.options ?? {}) as any;
      if (options.withSoftDelete) {
        options.deletedBy = req.user && req.user.uid ? req.user.uid : 'system';
      }
      const result = await databaseService.delete(filter, options);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Database delete controller error:', error);
      ResponseHelper.internalError(res);
    }
  }
}
