/**
 * Files Services
 * Business logic for files management operations
 */

import { CreateFileRequest, UpdateFileRequest, FileSchema } from '@/types/schema/files.schema';
import { QueryOptions, GetOptions, CountOptions, DeleteOptions, Filter, DatabaseResult } from '@/lib/database/types';
import { Logger } from '@/core/utils';
import { COLLECTIONS } from '@/configs/constant';
import { SodularStorageService } from '@/lib/storage';
import { addTask } from '@/lib/storage/utils/taskManager';
import * as fs from 'fs';
// import type { UploadOperation } from '@/lib/storage/types';

interface FileObj { 
  filename?: string; 
  file_path?: string; 
  description?: string;
  ext?: string;
  [key: string]: any; // Allow other properties
}

// Define proper interface for updateRequest.data
interface UpdateRequestData {
  filename?: string;
  file_path?: string;
  description?: string;
  [key: string]: any;
}

// Utility to deeply remove a key from an object
function deepRemoveKey(obj: any, keyToRemove: string) {
  if (Array.isArray(obj)) {
    obj.forEach(item => deepRemoveKey(item, keyToRemove));
  } else if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (key === keyToRemove) {
        delete obj[key];
      } else {
        deepRemoveKey(obj[key], keyToRemove);
      }
    });
  }
}

export class FilesService {
  private database: any;

  constructor(database: any) {
    this.database = database;
  }

  async upload(input: any, options?: any): Promise<DatabaseResult<FileSchema>> {
    // Accepts either a raw req (legacy) or a parsed input from busboyResult
    try {
      const _options = options || {};
      const user_uid = _options.__user_uid || 'system';
      const database_id = _options.__database_id;
      // Get bucket_id, storage_id from input
      const bucket_id = input.bucket_id || input.body?.bucket_id || input.query?.bucket_id || input.fields?.bucket_id;
      const storage_id = input.storage_id || input.body?.storage_id || input.query?.storage_id || input.fields?.storage_id;
      if (!bucket_id || !storage_id) return { error: 'Missing bucket_id or storage_id' };
      // Get storage config (fetch the actual storage document by storage_id)
      const storageTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
      if (!storageTableResult.value) return { error: 'Storage table not found' };
      const storageTableUid = storageTableResult.value.uid;
      const storageDocResult = await this.database.ref.from(storageTableUid).get({ filter: { uid: storage_id } });
      if (!storageDocResult.value) return { error: 'Storage config not found' };
      const storageDoc = storageDocResult.value;
      const storageType = storageDoc.data.type;
      let storageConfigs = JSON.parse(JSON.stringify(storageDoc.data.configs || {}));
      if (!storageConfigs.prefix) {
        storageConfigs.prefix = '/database/' + this.database.currentDatabaseId + '/users/' + user_uid;
      }
      if (typeof storageConfigs.prefix !== 'string') {
        storageConfigs.prefix = String(storageConfigs.prefix || '');
      }
      Logger.debug('FilesService.upload FINAL storageConfigs:', JSON.stringify(storageConfigs));
      Logger.debug('FilesService.upload storageType:', storageType);
      // Prepare file input for storage service
      let fileInput: any = input.file || input;
      if (input.originalname) fileInput.originalname = input.originalname;
      if (input.mimetype) fileInput.mimetype = input.mimetype;
      // If not local, upload to temp local storage first
      if (storageType !== 'local') {
        const tempStorage = new SodularStorageService({ type: 'local', configs: { localStoragePath: 'temp_storage', prefix: storageConfigs.prefix }, database: this.database });
        const tempConnect = await tempStorage.connect();
        if (!tempConnect.isReady) return { error: 'Temp storage failed to connect' };
        return await new Promise((resolve) => {
          tempStorage.upload({
            storage_id,
            bucket_id,
            file: fileInput
          }).then((uploadOp: any) => {
            uploadOp.onFinish(async (fileInfo: any) => {
              fileInfo.data.status = 'pending';
              const allowedFields = ['bucket_id', 'filename', 'parts', 'path', 'size', 'ext', 'type', 'downloadUrl', 'file_path', 'storage_id'];
              let dataObj: Record<string, any> = {};
              if (fileInfo.data && typeof fileInfo.data === 'object') {
                dataObj = fileInfo.data as Record<string, any>;
              }
              let filename = '';
              let ext = '';
              
              // Fix: Safely extract filename with proper type checking
              if ('filename' in dataObj && typeof (dataObj as FileObj).filename === 'string') {
                filename = (dataObj as FileObj).filename || '';
              }
              if ('ext' in dataObj && typeof (dataObj as any).ext === 'string') {
                ext = (dataObj as any).ext;
              }
              if (filename && ext && filename.endsWith('.' + ext)) {
                filename = filename.slice(0, -(ext.length + 1));
              }
              (dataObj as any).filename = filename;
              (dataObj as any).ext = ext;
              if (!('file_path' in dataObj) || typeof (dataObj as any).file_path !== 'string' || !(dataObj as any).file_path) {
                (dataObj as any).file_path = (input.file_path) ? input.file_path : '/';
              }
              dataObj.storage_id = storage_id;
              fileInfo.data = Object.fromEntries(
                Object.entries(dataObj).filter(([key]) => allowedFields.includes(key))
              );
              fileInfo.createdBy = user_uid;
              fileInfo.isActive = true;
              Logger.debug('FilesService.upload fileInfo to save:', JSON.stringify(fileInfo));
              // Debug: print the actual database and collection being used
              if (this.database && this.database.currentDb) {
                Logger.debug('FilesService.upload: Using database:', this.database.currentDb.databaseName);
              }
              const filesTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
              if (filesTableResult.value) {
                Logger.debug('FilesService.upload: Using collection:', filesTableResult.value.uid);
              }
              // Set downloadUrl before saving
              const baseDownloadUrl = 
              `/files/download?storage_id=${storage_id}&bucket_id=${bucket_id}&file_id=${fileInfo.uid}${database_id !== process.env.DB_NAME ? '&database_id='+database_id : ''}`.trim();
              fileInfo.data.downloadUrl = baseDownloadUrl;
              const dbResult = await this.database.ref.from(filesTableResult.value.uid).create(fileInfo);
              resolve(dbResult);
              // 2. In background, upload to S3
              addTask(async () => {
                try {
                  const s3Storage = new SodularStorageService({ type: storageType, configs: storageConfigs, database: this.database });
                  await s3Storage.connect();
                  const { parts } = fileInfo.data;
                  const s3Upload = await s3Storage.upload({ storage_id, bucket_id, file: parts });
                  s3Upload.onFinish(async () => {
                    // Update DB status to done
                    await this.database.ref.from(filesTableResult.value.uid).patch({ uid: fileInfo.uid }, { data: { status: 'done' } });
                    // Delete temp file
                    for (const part of parts) {
                      try { await fs.promises.unlink(part.path); } catch {}
                    }
                  });
                  s3Upload.onError(async (err: any) => {
                    await this.database.ref.from(filesTableResult.value.uid).patch({ uid: fileInfo.uid }, { data: { status: 'fail' } });
                  });
                } catch (err) {
                  await this.database.ref.from(filesTableResult.value.uid).patch({ uid: fileInfo.uid }, { data: { status: 'fail' } });
                }
              });
            });
            uploadOp.onError((err: any) => {
              resolve({ error: err.message || 'Upload failed' });
            });
          }).catch((err: any) => {
            resolve({ error: err.message || 'Upload failed' });
          });
        });
      }
      // Local upload logic (if storageType === 'local')
      const localStorage = new SodularStorageService({ type: 'local', configs: storageConfigs, database: this.database });
      const localConnect = await localStorage.connect();
      if (!localConnect.isReady) return { error: 'Local storage failed to connect' };
      return await new Promise((resolve) => {
        localStorage.upload({
          storage_id,
          bucket_id,
          file: fileInput
        }).then((uploadOp: any) => {
          uploadOp.onFinish(async (fileInfo: any) => {
            fileInfo.data.status = 'done';
            const allowedFields = ['bucket_id', 'filename', 'parts', 'path', 'size', 'ext', 'type', 'downloadUrl', 'file_path', 'storage_id'];
            let dataObj: Record<string, any> = {};
            if (fileInfo.data && typeof fileInfo.data === 'object') {
              dataObj = fileInfo.data as Record<string, any>;
            }
            let filename = '';
            let ext = '';
            
            // Fix: Safely extract filename with proper type checking and default value
            if ('filename' in dataObj && typeof (dataObj as FileObj).filename === 'string') {
              filename = (dataObj as FileObj).filename || '';
            }
            if ('ext' in dataObj && typeof (dataObj as any).ext === 'string') {
              ext = (dataObj as any).ext;
            }
            if (filename && ext && filename.endsWith('.' + ext)) {
              filename = filename.slice(0, -(ext.length + 1));
            }
            (dataObj as any).filename = filename;
            (dataObj as any).ext = ext;
            if (!('file_path' in dataObj) || typeof (dataObj as any).file_path !== 'string' || !(dataObj as any).file_path) {
              (dataObj as any).file_path = (input.file_path) ? input.file_path : '/';
            }
            dataObj.storage_id = storage_id;
            fileInfo.data = dataObj;
            fileInfo.createdBy = user_uid;
            fileInfo.isActive = true;
            Logger.debug('FilesService.upload fileInfo to save:', JSON.stringify(fileInfo));
            // Debug: print the actual database and collection being used
            if (this.database && this.database.currentDb) {
              Logger.debug('FilesService.upload: Using database:', this.database.currentDb.databaseName);
            }
            const filesTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
            if (filesTableResult.value) {
              Logger.debug('FilesService.upload: Using collection:', filesTableResult.value.uid);
            }
            // Set downloadUrl before saving
            const baseDownloadUrl = 
              `/files/download?storage_id=${storage_id}&bucket_id=${bucket_id}&file_id=${fileInfo.uid}${database_id !== process.env.DB_NAME ? '&database_id='+database_id : ''}`.trim();
            fileInfo.data.downloadUrl = baseDownloadUrl;
            if(database_id) this.database = this.database.getTemporaryContext(database_id)
            console.log('get the database Instance: ', this.database)
            const dbResult = await this.database.ref.from(filesTableResult.value.uid).create(fileInfo);
            resolve(dbResult);
          });
          uploadOp.onError((err: any) => {
            resolve({ error: err.message || 'Upload failed' });
          });
        }).catch((err: any) => {
          resolve({ error: err.message || 'Upload failed' });
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Files upload error:', error.message);
      } else {
        Logger.error('Files upload error:', JSON.stringify(error));
      }
      return { error: 'Failed to upload file' };
    }
  }

  async download(req: any, options?: any, res?: any): Promise<any> {
    console.log('FilesService.download called. req.body:', req.body, 'req.query:', req.query);
    try {
      // Extract context
      const _options = options || {};
      const user_uid = _options.__user_uid || 'anonymous';
      const database_uid = _options.__database_id || 'sodular';
      // Get file_id, bucket_id, storage_id from req.query or req.body
      const file_id = req.query?.file_id || req.body?.file_id;
      const bucket_id = req.query?.bucket_id || req.body?.bucket_id;
      const storage_id = req.query?.storage_id || req.body?.storage_id;
      let parts = req.query?.parts || req.body?.parts;
      if (typeof parts === 'string') {
        try {
          parts = JSON.parse(parts);
        } catch {
          parts = [parts];
        }
      }
      if (!Array.isArray(parts) || parts.length === 0) {
        parts = undefined;
      }
      if (!file_id || !bucket_id || !storage_id) return { error: 'Missing file_id, bucket_id, or storage_id' };
      // Get file record
      const filesTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
      if (!filesTableResult.value) return { error: 'Files table not found' };
      const fileResult = await this.database.ref.from(filesTableResult.value.uid).get({ filter: { uid: file_id } });
      if (!fileResult.value) return { error: 'File not found' };
      const fileRecord = fileResult.value;
      // Get storage config (fetch the actual storage document by storage_id)
      const storageTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
      if (!storageTableResult.value) return { error: 'Storage table not found' };
      const storageTableUid = storageTableResult.value.uid;
      const storageDocResult = await this.database.ref.from(storageTableUid).get({ filter: { uid: storage_id } });
      if (!storageDocResult.value) return { error: 'Storage config not found' };
      const storageDoc = storageDocResult.value;
      const storageType = storageDoc.data.type;
      let storageConfigs = { ...(storageDoc.data.configs || {}), prefix: '/database/'+this.database.currentDatabaseId+'/users/'+user_uid };
      if (storageType === 'local') {
        storageConfigs = {
          ...storageConfigs,
          localStoragePath: require('@/configs/env').env.LOCAL_STORAGE_PATH,
          prefix: '/database/'+this.database.currentDatabaseId+'/users/'+user_uid
        };
      }
      // Use the correct storage adapter
      const storageService = new SodularStorageService({ type: storageType, configs: storageConfigs, database: this.database });
      const connectResult = await storageService.connect();
      if (!connectResult.isReady) return { error: 'Storage service failed to connect: ' + (connectResult.error || 'Unknown error') };
      return await new Promise((resolve) => {
        storageService.download({
          storage_id,
          bucket_id,
          file_id,
          parts,
          location: res,
          ...(req.headers && req.headers.range ? { range: req.headers.range } : {})
        }).then(downloadOp => {
          let handled = false;
          downloadOp.onDownload((progress: any) => {});
          downloadOp.onFinish(() => {
            handled = true;
            resolve({ value: 'Download finished', handled: true });
          });
          downloadOp.onError((err: any) => {
            handled = true;
            resolve({ error: err.message || 'Download failed', handled: true });
          });
        }).catch((err: any) => {
          resolve({ error: err.message || 'Download failed' });
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Files download error:', error.message);
      } else {
        Logger.error('Files download error:', JSON.stringify(error));
      }
      return { error: 'Failed to download file' };
    }
  }

  async get(options: GetOptions): Promise<DatabaseResult<FileSchema | null>> {
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
      if (!tableResult.value) return { error: 'Files table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).get(options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Files get error:', error.message);
      } else {
        Logger.error('Files get error:', JSON.stringify(error));
      }
      return { error: 'Failed to get file' };
    }
  }

  async query(options: QueryOptions): Promise<DatabaseResult<{ list: FileSchema[]; total: number }>> {
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
      if (!tableResult.value) return { error: 'Files table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).query(options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Files query error:', error.message);
      } else {
        Logger.error('Files query error:', JSON.stringify(error));
      }
      return { error: 'Failed to query files' };
    }
  }

  async count(options: CountOptions): Promise<DatabaseResult<{ total: number }>> {
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
      if (!tableResult.value) return { error: 'Files table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).count(options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Files count error:', error.message);
      } else {
        Logger.error('Files count error:', JSON.stringify(error));
      }
      return { error: 'Failed to count files' };
    }
  }

  async delete(filter: Filter, options?: DeleteOptions & { user_uid?: string }): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && (options as any).user_uid) || 'system';
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
      if (!tableResult.value) return { error: 'Files table not found' };
      if (options && (options as any).withSoftDelete) {
        (options as any).deletedBy = user_uid;
        // Soft delete: do not delete physical file
        return await this.database.ref.from(tableResult.value.uid).delete(filter, options);
      }
      // 1. Find the file info
      const fileResult = await this.database.ref.from(tableResult.value.uid).get({ filter });
      if (fileResult.value) {
        // Fetch storage config using file's storage_id
        const storage_id = fileResult.value.data.storage_id;
        const storageConfig = await this.getStorageConfig(storage_id, user_uid);
        if (!storageConfig) {
          Logger.warn('FilesService.delete: Storage config not found for storage_id', storage_id);
          // Skip physical deletion, but proceed to DB deletion
        } else {
          // Use the correct storage adapter
          const storageService = new SodularStorageService({ type: storageConfig.type, configs: storageConfig.configs, database: this.database });
          await storageService.delete({
            storage_id: fileResult.value.data.storage_id,
            bucket_id: fileResult.value.data.bucket_id,
            parts: fileResult.value.data.parts
          });
        }
      }
      // 2. Delete the file from DB
      const result = await this.database.ref.from(tableResult.value.uid).delete(filter, options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Files delete error:', error.message);
      } else {
        Logger.error('Files delete error:', JSON.stringify(error));
      }
      return { error: 'Failed to delete file' };
    }
  }

  async patch(filter: Filter, request: UpdateFileRequest, options?: any): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && options.user_uid) || 'system';
    const updateRequest: { data: UpdateRequestData; updatedBy: string } = {
      data: {},
      updatedBy: user_uid 
    };
    
    if(request.data && typeof request.data === 'object') {
      const dataObj = request.data as Record<string, any>;
      if(dataObj && typeof dataObj === 'object') {
        // Fix: Properly type the updateRequest.data object
        if('filename' in dataObj) updateRequest.data.filename = ((dataObj as any).filename || '') as string;
        if('file_path' in dataObj) updateRequest.data.file_path = ((dataObj as any).file_path || '') as string;
        if('description' in dataObj) updateRequest.data.description = ((dataObj as any).description || '') as string;
      }
    }
    
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
      if (!tableResult.value) return { error: 'Files table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).patch(filter, updateRequest);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Files patch error:', error.message);
      } else {
        Logger.error('Files patch error:', JSON.stringify(error));
      }
      return { error: 'Failed to patch file' };
    }
  }

  async uploadWithAudit(req: any, options: any, user_uid: string): Promise<DatabaseResult<FileSchema>> {
    return await new Promise((resolve) => {
      this.upload(req, options).then(result => {
        // If result is a fileInfo object, merge createdBy
        if (result && 'data' in result && result.data && typeof result.data === 'object') {
          (result.data as any).createdBy = user_uid;
        }
        resolve(result);
      }).catch(err => {
        resolve({ error: err.message || 'Upload failed' });
      });
    });
  }

  // Add this private method to FilesService
  private async getStorageConfig(storage_id: string, user_uid: string): Promise<{ type: string, configs: any } | null> {
    const storageTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
    if (!storageTableResult.value) return null;
    const storageTableUid = storageTableResult.value.uid;
    const storageDocResult = await this.database.ref.from(storageTableUid).get({ filter: { uid: storage_id } });
    if (!storageDocResult.value) return null;
    const storageDoc = storageDocResult.value;
    let configs = { ...(storageDoc.data.configs || {}) };
    if (!configs.prefix) {
      configs.prefix = '/database/' + this.database.currentDatabaseId + '/users/' + user_uid;
    }
    return { type: storageDoc.data.type, configs };
  }
}