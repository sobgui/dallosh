/**
 * Buckets Controllers
 * Handle HTTP requests and responses for buckets management endpoints
 */

import { Request, Response } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { Logger } from '@/core/utils';
import { BucketsService } from '../services';

export class BucketsController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const databaseService = (req as any).databaseService;
      let database = databaseService?.database;
      const targetDatabaseId = req.query.database_id as string;
      let contextDatabase = targetDatabaseId ? database.getTemporaryContext(targetDatabaseId) : database;
      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }
      contextDatabase.currentDatabaseId = targetDatabaseId ? targetDatabaseId : process.env.DB_NAME;
      if (!req.body.data) req.body.data = {};
      if (!req.body.data.storage_id && req.query.storage_id) {
        req.body.data.storage_id = req.query.storage_id;
      }
      // Debug: print req.body before validation
      Logger.debug('BucketsController.create req.body:', JSON.stringify(req.body));
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      req.body.createdBy = userId;
      const bucketsService = new BucketsService(contextDatabase);
      const result = await bucketsService.create(req.body);
      ResponseHelper.handleDatabaseResult(res, result, 201);
    } catch (error) {
      Logger.error('Buckets create controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  static async get(req: Request, res: Response): Promise<void> {
    try {
      const databaseService = (req as any).databaseService;
      let database = databaseService?.database;
      const targetDatabaseId = req.query.database_id as string;
      let contextDatabase = targetDatabaseId ? database.getTemporaryContext(targetDatabaseId) : database;
      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }
      contextDatabase.currentDatabaseId = targetDatabaseId ? targetDatabaseId : process.env.DB_NAME;
      const bucketsService = new BucketsService(contextDatabase);
      const result = await bucketsService.get(req.query);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Buckets get controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  static async query(req: Request, res: Response): Promise<void> {
    try {
      const databaseService = (req as any).databaseService;
      let database = databaseService?.database;
      const targetDatabaseId = req.query.database_id as string;
      let contextDatabase = targetDatabaseId ? database.getTemporaryContext(targetDatabaseId) : database;
      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }
      contextDatabase.currentDatabaseId = targetDatabaseId ? targetDatabaseId : process.env.DB_NAME;
      const bucketsService = new BucketsService(contextDatabase);
      const result = await bucketsService.query(req.query);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Buckets query controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  static async count(req: Request, res: Response): Promise<void> {
    try {
      const databaseService = (req as any).databaseService;
      let database = databaseService?.database;
      const targetDatabaseId = req.query.database_id as string;
      let contextDatabase = targetDatabaseId ? database.getTemporaryContext(targetDatabaseId) : database;
      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }
      contextDatabase.currentDatabaseId = targetDatabaseId ? targetDatabaseId : process.env.DB_NAME;
      const bucketsService = new BucketsService(contextDatabase);
      const result = await bucketsService.count(req.query);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Buckets count controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  static async put(req: Request, res: Response): Promise<void> {
    try {
      const databaseService = (req as any).databaseService;
      let database = databaseService?.database;
      const targetDatabaseId = req.query.database_id as string;
      let contextDatabase = targetDatabaseId ? database.getTemporaryContext(targetDatabaseId) : database;
      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }
      contextDatabase.currentDatabaseId = targetDatabaseId ? targetDatabaseId : process.env.DB_NAME;
      const bucketsService = new BucketsService(contextDatabase);
      const filter = (req.query.filter ?? {}) as any;
      const result = await bucketsService.put(filter, req.body);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Buckets put controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  static async patch(req: Request, res: Response): Promise<void> {
    try {
      const databaseService = (req as any).databaseService;
      let database = databaseService?.database;
      const targetDatabaseId = req.query.database_id as string;
      let contextDatabase = targetDatabaseId ? database.getTemporaryContext(targetDatabaseId) : database;
      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }
      contextDatabase.currentDatabaseId = targetDatabaseId ? targetDatabaseId : process.env.DB_NAME;
      const bucketsService = new BucketsService(contextDatabase);
      const filter = (req.query.filter ?? {}) as any;
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      req.body.updatedBy = userId;
      const result = await bucketsService.patch(filter, req.body);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Buckets patch controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const databaseService = (req as any).databaseService;
      let database = databaseService?.database;
      const targetDatabaseId = req.query.database_id as string;
      let contextDatabase = targetDatabaseId ? database.getTemporaryContext(targetDatabaseId) : database;
      if (!contextDatabase.isReady) {
        ResponseHelper.badRequest(res, 'Target database not accessible');
        return;
      }
      contextDatabase.currentDatabaseId = targetDatabaseId ? targetDatabaseId : process.env.DB_NAME;
      const bucketsService = new BucketsService(contextDatabase);
      const filter = (req.query.filter ?? {}) as any;
      const options = (req.query.options ?? {}) as any;
      if (options.withSoftDelete) {
        options.deletedBy = req.user && req.user.uid ? req.user.uid : 'system';
      }
      const result = await bucketsService.delete(filter, options);
      if (!result.error) {
        res.status(200).json({ success: true, ...result });
      } else {
        ResponseHelper.handleDatabaseResult(res, result);
      }
    } catch (error) {
      Logger.error('Buckets delete controller error:', error);
      ResponseHelper.internalError(res);
    }
  }
} 