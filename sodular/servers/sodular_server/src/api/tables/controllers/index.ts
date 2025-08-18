/**
 * Tables Controllers
 * Handle HTTP requests and responses for table management endpoints
 */

import { Request, Response } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { Logger } from '@/core/utils';
import { TablesService } from '../services';
import { 
  CreateTableRequest,
  UpdateTableRequest
} from '@/types/schema/tables.schema';
import { 
  QueryOptions,
  GetOptions,
  CountOptions,
  DeleteOptions,
  Filter
} from '@/lib/database/types';

export class TablesController {
  /**
   * Check if table exists
   * GET /tables/exists?database_id=uuid&table_id=uuid
   */
  static async exists(req: Request, res: Response): Promise<void> {
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

      const tablesService = new TablesService(contextDatabase);
      const tableId = req.query.table_id as string;

      const result = await tablesService.exists(tableId);
      
      if (result.error) {
        ResponseHelper.badRequest(res, result.error);
        return;
      }

      ResponseHelper.success(res, { exists: result.value });
    } catch (error) {
      Logger.error('Table exists controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Create a new table
   * POST /tables
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

      const tablesService = new TablesService(contextDatabase);
      const createRequest: CreateTableRequest = req.body;
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      createRequest.createdBy = userId;

      const result = await tablesService.create(createRequest);
      
      ResponseHelper.handleDatabaseResult(res, result, 201);
    } catch (error) {
      Logger.error('Table create controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Get single table
   * GET /tables
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

      const tablesService = new TablesService(contextDatabase);
      
      const options: GetOptions = {
        filter: req.query.filter as Filter,
        select: req.query.select as string[],
      };

      const result = await tablesService.get(options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Table get controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Query multiple tables
   * GET /tables/query
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

      const tablesService = new TablesService(contextDatabase);
      
      const options: QueryOptions = {
        filter: req.query.filter as Filter,
        select: req.query.select as string[],
        sort: req.query.sort as Record<string, 'asc' | 'desc' | 1 | -1>,
        take: (req.query as any).take as number,
        skip: (req.query as any).skip as number,
      };

      const result = await tablesService.query(options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Table query controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Count tables
   * GET /tables/count
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

      const tablesService = new TablesService(contextDatabase);
      
      const options: CountOptions = {
        filter: req.query.filter as Filter,
      };

      const result = await tablesService.count(options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Table count controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Update tables (PUT)
   * PUT /tables
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

      const tablesService = new TablesService(contextDatabase);
      const filter = req.query.filter as Filter;
      const updateRequest: UpdateTableRequest = req.body;

      const result = await tablesService.put(filter, updateRequest);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Table put controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Update tables (PATCH)
   * PATCH /tables
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

      const tablesService = new TablesService(contextDatabase);
      const filter = req.query.filter as Filter;
      const updateRequest: UpdateTableRequest = req.body;
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      updateRequest.updatedBy = userId;

      const result = await tablesService.patch(filter, updateRequest);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Table patch controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Delete tables
   * DELETE /tables
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

      const tablesService = new TablesService(contextDatabase);
      const filter = req.query.filter as Filter;
      
      // Parse options from query
      let options: DeleteOptions | undefined;
      if (req.query.options) {
        options = req.query.options as DeleteOptions;
      }

      const result = await tablesService.delete(filter, options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Table delete controller error:', error);
      ResponseHelper.internalError(res);
    }
  }
}
