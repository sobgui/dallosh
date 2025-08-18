/**
 * Storage Controllers
 * Handle HTTP requests and responses for storage management endpoints
 */

import { Request, Response } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { Logger } from '@/core/utils';
import { StorageService } from '../services';

export class StorageController {
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
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      req.body.createdBy = userId;
      const storageService = new StorageService(contextDatabase);
      const result = await storageService.create(req.body, { user_uid: userId });
      ResponseHelper.handleDatabaseResult(res, result, 201);
    } catch (error) {
      Logger.error('Storage create controller error:', error);
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
      const storageService = new StorageService(contextDatabase);
      const result = await storageService.get(req.query);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Storage get controller error:', error);
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
      const storageService = new StorageService(contextDatabase);
      const result = await storageService.query(req.query);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Storage query controller error:', error);
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
      const storageService = new StorageService(contextDatabase);
      const result = await storageService.count(req.query);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Storage count controller error:', error);
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
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      req.body.updatedBy = userId;
      const storageService = new StorageService(contextDatabase);
      const filter = (req.query.filter ?? {}) as any;
      const result = await storageService.put(filter, req.body);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Storage put controller error:', error);
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
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      req.body.updatedBy = userId;
      const storageService = new StorageService(contextDatabase);
      const filter = (req.query.filter ?? {}) as any;
      const result = await storageService.patch(filter, req.body);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Storage patch controller error:', error);
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
      const storageService = new StorageService(contextDatabase);
      const filter = (req.query.filter ?? {}) as any;
      const options = (req.query.options ?? {}) as any;
      if (options.withSoftDelete) {
        const userId = req.user && req.user.uid ? req.user.uid : 'system';
        options.deletedBy = userId;
      }
      if (req.user && req.user.uid) {
        options.__user_uid = req.user.uid;
      }
      if (typeof req.query.database_id === 'string' && req.query.database_id) {
        options.__database_id = req.query.database_id;
      }
      const result = await storageService.delete(filter, options);
      if (!result.error) {
        res.status(200).json({ success: true, ...result });
      } else {
        ResponseHelper.handleDatabaseResult(res, result);
      }
    } catch (error) {
      Logger.error('Storage delete controller error:', error);
      ResponseHelper.internalError(res);
    }
  }
} 