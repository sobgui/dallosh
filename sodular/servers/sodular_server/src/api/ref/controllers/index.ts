/**
 * Ref Controllers
 * Handle HTTP requests and responses for ref (document/row) management endpoints
 */

import { Request, Response } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { Logger } from '@/core/utils';
import { RefService } from '../services';
import { 
  CreateRefRequest,
  UpdateRefRequest
} from '@/types/schema/ref.schema';
import { 
  QueryOptions,
  GetOptions,
  CountOptions,
  DeleteOptions,
  Filter
} from '@/lib/database/types';

export class RefController {
  /**
   * Create a new ref (document/row)
   * POST /ref?database_id=uuid&table_id=uuid
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

      const refService = new RefService(contextDatabase);
      const tableId = req.query.table_id as string;
      const createRequest: CreateRefRequest = req.body;

      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      createRequest.createdBy = userId;

      const result = await refService.create(tableId, createRequest);
      
      // Emit socket event if creation was successful
      if (result && !result.error && (req as any).socket) {
        (req as any).socket.emitRefEvent(
          targetDatabaseId,
          tableId,
          'created',
          result.value
        );
      }
      
      ResponseHelper.handleDatabaseResult(res, result, 201);
    } catch (error) {
      Logger.error('Ref create controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Get single ref
   * GET /ref?database_id=uuid&table_id=uuid
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

      const refService = new RefService(contextDatabase);
      const tableId = req.query.table_id as string;
      
      const options: GetOptions = {
        filter: req.query.filter as Filter,
        select: req.query.select as string[],
      };

      const result = await refService.get(tableId, options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Ref get controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Query multiple refs
   * GET /ref/query?database_id=uuid&table_id=uuid
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

      const refService = new RefService(contextDatabase);
      const tableId = req.query.table_id as string;
      
      const options: QueryOptions = {
        filter: req.query.filter as Filter,
        select: req.query.select as string[],
        sort: req.query.sort as Record<string, 'asc' | 'desc' | 1 | -1>,
        take: (req.query as any).take as number,
        skip: (req.query as any).skip as number,
      };

      const result = await refService.query(tableId, options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Ref query controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Count refs
   * GET /ref/count?database_id=uuid&table_id=uuid
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

      const refService = new RefService(contextDatabase);
      const tableId = req.query.table_id as string;
      
      const options: CountOptions = {
        filter: req.query.filter as Filter,
      };

      const result = await refService.count(tableId, options);
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Ref count controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Update refs (PUT)
   * PUT /ref?database_id=uuid&table_id=uuid
   */
  static async put(req: Request, res: Response): Promise<void> {
    try {
      const database = (req as any).databaseService?.database;
      if (!database || !(req as any).databaseService?.isReady) {
        ResponseHelper.serviceUnavailable(res, 'Database service not available');
        return;
      }

      // Use temporary database context if specified
      const targetDatabaseId = req.query.database_id as string;
      const workingDatabase = targetDatabaseId ? database.getTemporaryContext(targetDatabaseId) : database;

      if (!workingDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }

      const refService = new RefService(workingDatabase);
      const tableId = req.query.table_id as string;
      const filter = req.query.filter as Filter;
      const updateRequest: UpdateRefRequest = req.body;

      const result = await refService.put(tableId, filter, updateRequest);

      // Emit socket event if update was successful
      if (result && !result.error && (req as any).socket) {
        (req as any).socket.emitRefEvent(
          targetDatabaseId,
          tableId,
          'replaced',
          result.value
        );
      }

      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Ref put controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Update refs (PATCH)
   * PATCH /ref?database_id=uuid&table_id=uuid
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

      const refService = new RefService(contextDatabase);
      const tableId = req.query.table_id as string;
      const filter = req.query.filter as Filter;
      const updateRequest: UpdateRefRequest = req.body;

      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      updateRequest.updatedBy = userId;

      const result = await refService.patch(tableId, filter, updateRequest);
      
      // Emit socket event if update was successful
      if (result && !result.error && (req as any).socket) {
        (req as any).socket.emitRefEvent(
          targetDatabaseId,
          tableId,
          'patched',
          result.value
        );
      }
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Ref patch controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  /**
   * Delete refs
   * DELETE /ref?database_id=uuid&table_id=uuid
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

      const refService = new RefService(contextDatabase);
      const tableId = req.query.table_id as string;
      const filter = req.query.filter as Filter;
      
      // Parse options from query
      let options: DeleteOptions | undefined;
      if (req.query.options) {
        options = req.query.options as DeleteOptions;
      }

      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      if (options && options.withSoftDelete) {
        options.deletedBy = userId;
      }

      const result = await refService.delete(tableId, filter, options);
      
      // Emit socket event if deletion was successful
      if (result && !result.error && (req as any).socket) {
        (req as any).socket.emitRefEvent(
          targetDatabaseId,
          tableId,
          'deleted',
          result.value
        );
      }
      
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Ref delete controller error:', error);
      ResponseHelper.internalError(res);
    }
  }
}
