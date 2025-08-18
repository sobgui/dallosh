/**
 * Files Controllers
 * Handle HTTP requests and responses for files management endpoints
 */

import { Request, Response } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { Logger } from '@/core/utils';
import { FilesService } from '../services';

export class FilesController {
  static async upload(req: Request, res: Response): Promise<void> {
    console.log('FilesController.upload called. req.body:', req.body, 'req.query:', req.query, 'req.fields:', (req as any).fields);
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
      const filesService = new FilesService(contextDatabase);
      // Propagate user_uid and database_id for downstream use
      const options: any = {};
      if ((req as any).user && (req as any).user.uid) {
        options.__user_uid = (req as any).user.uid;
      }
      if (typeof req.query.database_id === 'string' && req.query.database_id) {
        options.__database_id = req.query.database_id;
      }
      // Extract file stream and fields from busboyResult if present
      let uploadInput: any = req;
      if ((req as any).busboyResult) {
        const { files, fields } = (req as any).busboyResult;
        if (files && files.length > 0) {
          uploadInput = {
            file: files[0].stream,
            originalname: files[0].filename,
            mimetype: files[0].mimeType,
            ...fields
          };
        } else {
          uploadInput = { ...fields };
        }
      }
      const result = await filesService.upload(uploadInput, options);
      ResponseHelper.handleDatabaseResult(res, result, 201);
    } catch (error) {
      Logger.error('Files upload controller error:', error);
      ResponseHelper.internalError(res);
    }
  }

  static async download(req: Request, res: Response): Promise<void> {
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
      const filesService = new FilesService(contextDatabase);
      // Propagate user_uid and database_id for downstream use
      const options: any = {};
      if (req.user && req.user.uid) {
        options.__user_uid = req.user.uid;
      }
      if (typeof req.query.database_id === 'string' && req.query.database_id) {
        options.__database_id = req.query.database_id;
      }
      const result = await filesService.download(req, options, res);
      // download may handle response streaming directly, so skip ResponseHelper if handled
      if (result && result.handled !== true) {
        ResponseHelper.handleDatabaseResult(res, result);
      }
    } catch (error) {
      Logger.error('Files download controller error:', error);
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
      const filesService = new FilesService(contextDatabase);
      const result = await filesService.get(req.query);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Files get controller error:', error);
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
      const filesService = new FilesService(contextDatabase);
      const result = await filesService.query(req.query);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Files query controller error:', error);
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
      const filesService = new FilesService(contextDatabase);
      const result = await filesService.count(req.query);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Files count controller error:', error);
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
      const filesService = new FilesService(contextDatabase);
      let filter: any = req.query.filter ?? {};
      let options: any = req.query.options ?? {};
      if (typeof filter === 'string') {
        try { filter = JSON.parse(filter); } catch {}
      }
      if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch {}
      }
      if (req.user && req.user.uid) {
        options.__user_uid = req.user.uid;
      }
      if (typeof req.query.database_id === 'string' && req.query.database_id) {
        options.__database_id = req.query.database_id;
      }
      if (options.withSoftDelete) {
        options.deletedBy = req.user && req.user.uid ? req.user.uid : 'system';
      }
      const result = await filesService.delete(filter, options);
      if (!result.error) {
        res.status(200).json({ success: true, ...result });
      } else {
        ResponseHelper.handleDatabaseResult(res, result);
      }
    } catch (error) {
      if (error instanceof Error) {
        Logger.error('Files delete controller error:', error.message + '\n' + error.stack);
      } else {
        Logger.error('Files delete controller error:', JSON.stringify(error));
      }
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
      const filesService = new FilesService(contextDatabase);
      const filter = (req.query.filter ?? {}) as any;
      const userId = req.user && req.user.uid ? req.user.uid : 'system';
      req.body.updatedBy = userId;
      const result = await filesService.patch(filter, req.body);
      ResponseHelper.handleDatabaseResult(res, result);
    } catch (error) {
      Logger.error('Files patch controller error:', error);
      ResponseHelper.internalError(res);
    }
  }
} 