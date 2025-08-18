/**
 * Storage Services
 * Business logic for storage management operations
 */

import { CreateStorageRequest, UpdateStorageRequest, StorageSchema } from '@/types/schema/storage.schema';
import { QueryOptions, GetOptions, CountOptions, DeleteOptions, Filter, DatabaseResult } from '@/lib/database/types';
import { Logger } from '@/core/utils';
import { COLLECTIONS } from '@/configs/constant';
import { SodularStorageService } from '@/lib/storage';
import { env } from '@/configs/env';

export class StorageService {
  private database: any;

  constructor(database: any) {
    this.database = database;
  }

  async create(request: CreateStorageRequest, options?: any): Promise<DatabaseResult<StorageSchema>> {
    try {
      const user_uid = (options && options.user_uid) || 'system';
      if (request.data && request.data.type === 'local') {
        if (!request.data.configs) request.data.configs = {};
        request.data.configs.localStoragePath = env.LOCAL_STORAGE_PATH;
      }
      if (request.data) {
        request.data.isActive = true;
        request.createdBy = user_uid;
        request.data.configs.prefix = '/database/'+this.database.currentDatabaseId+'/users/'+user_uid;
      }
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
      if (!tableResult.value) return { error: 'Storage table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).create(request);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Storage create error:', error.message);
      } else {
        Logger.error('Storage create error:', JSON.stringify(error));
      }
      return { error: 'Failed to create storage' };
    }
  }

  async get(options: GetOptions): Promise<DatabaseResult<StorageSchema | null>> {
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
      if (!tableResult.value) return { error: 'Storage table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).get(options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Storage get error:', error.message);
      } else {
        Logger.error('Storage get error:', JSON.stringify(error));
      }
      return { error: 'Failed to get storage' };
    }
  }

  async query(options: QueryOptions): Promise<DatabaseResult<{ list: StorageSchema[]; total: number }>> {
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
      if (!tableResult.value) return { error: 'Storage table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).query(options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Storage query error:', error.message);
      } else {
        Logger.error('Storage query error:', JSON.stringify(error));
      }
      return { error: 'Failed to query storage' };
    }
  }

  async count(options: CountOptions): Promise<DatabaseResult<{ total: number }>> {
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
      if (!tableResult.value) return { error: 'Storage table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).count(options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Storage count error:', error.message);
      } else {
        Logger.error('Storage count error:', JSON.stringify(error));
      }
      return { error: 'Failed to count storage' };
    }
  }

  async put(filter: Filter, request: UpdateStorageRequest, options?: any): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    try {
      const user_uid = (options && options.user_uid) || 'system';
      if (request.data && request.data.type === 'local' && request.data.configs) {
        delete request.data.configs.prefix;
        delete request.data.configs.localStoragePath;
      }
      request.updatedBy = user_uid;
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
      if (!tableResult.value) return { error: 'Storage table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).put(filter, request);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Storage put error:', error.message);
      } else {
        Logger.error('Storage put error:', JSON.stringify(error));
      }
      return { error: 'Failed to update storage' };
    }
  }

  async patch(filter: Filter, request: UpdateStorageRequest, options?: any): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    try {
      const user_uid = (options && options.user_uid) || 'system';
      if (request.data && request.data.type === 'local' && request.data.configs) {
        delete request.data.configs.prefix;
        delete request.data.configs.localStoragePath;
      }
      request.updatedBy = user_uid;
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
      if (!tableResult.value) return { error: 'Storage table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).patch(filter, request);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Storage patch error:', error.message);
      } else {
        Logger.error('Storage patch error:', JSON.stringify(error));
      }
      return { error: 'Failed to update storage' };
    }
  }

  async delete(filter: Filter, options?: DeleteOptions & { user_uid?: string }): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    try {
      const user_uid = (options && (options as any).user_uid) || 'system';
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
      if (!tableResult.value) return { error: 'Storage table not found' };
      // Fetch the actual storage document by UID
      const storageTableUid = tableResult.value.uid;
      const storageDocResult = await this.database.ref.from(storageTableUid).get({ filter });
      if (!storageDocResult.value) return { error: 'Storage document not found' };
      const storageDoc = storageDocResult.value;
      const storageType = storageDoc.data.type;
      let storageConfigs = storageDoc.data.configs || {};
      // Patch in prefix for local storage
      const _options = options as any;
      if (_options && _options.__user_uid) {
        storageConfigs.prefix = _options.__user_uid;
      }
      if (storageType === 'local') {
        storageConfigs = {
          ...storageConfigs,
          localStoragePath: env.LOCAL_STORAGE_PATH,
          prefix: storageConfigs.prefix || '/database/'+this.database.currentDatabaseId+'/users/'+user_uid,
        };
        Logger.debug('StorageService.delete: storageType', storageType);
        Logger.debug('StorageService.delete: storageConfigs', JSON.stringify(storageConfigs));
        if (options && (options as any).withSoftDelete) {
          // Soft delete: do not cascade, set deletedBy
          if (!options) options = {};
          (options as any).deletedBy = user_uid;
          return await this.database.ref.from(storageTableUid).delete(filter, options);
        }
        // 1. Find all buckets for this storage
        const bucketsTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.BUCKETS } });
        if (!bucketsTableResult.value) return { error: 'Buckets table not found' };
        const bucketsResult = await this.database.ref.from(bucketsTableResult.value.uid).query({ filter: { 'data.storage_id': (filter as any).uid } });
        if (bucketsResult.value && bucketsResult.value.list) {
          for (const bucket of bucketsResult.value.list) {
            // 2. For each bucket, delete all files (DB + physical)
            const filesTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
            if (!filesTableResult.value) continue;
            const filesResult = await this.database.ref.from(filesTableResult.value.uid).query({ filter: { 'data.bucket_id': bucket.uid } });
            if (filesResult.value && filesResult.value.list) {
              for (const file of filesResult.value.list) {
                // Use the config built above for all file deletes
                let database_uid = (_options && _options.__database_id) ? _options.__database_id : 'sodular';
                const sodularStorage = new SodularStorageService({ type: storageType, configs: storageConfigs, database: this.database });
                const connectResult = await sodularStorage.connect();
                Logger.debug('StorageService.delete: connectResult', { isReady: connectResult.isReady, error: connectResult.error });
                if (!connectResult || connectResult.isReady !== true) {
                  throw new Error('SodularStorageService failed to connect: ' + JSON.stringify(connectResult));
                }
                // Fetch the full file record from the DB
                const fileRecordResult = await this.database.ref.from(filesTableResult.value.uid).get({ filter: { uid: file.uid } });
                if (!fileRecordResult.value) continue;
                const fileRecord = fileRecordResult.value;
                await sodularStorage.delete({
                  storage_id: storageDoc.uid,
                  bucket_id: bucket.uid,
                  parts: fileRecord.data.parts
                });
                // Delete from DB
                await this.database.ref.from(filesTableResult.value.uid).delete({ uid: file.uid });
              }
            }
            // 3. Delete the bucket itself
            await this.database.ref.from(bucketsTableResult.value.uid).delete({ uid: bucket.uid });
          }
        }
        // 4. Delete the storage itself
        const result = await this.database.ref.from(storageTableUid).delete(filter, options);
        return result;
      }
    } 
    catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Storage delete error:', error.message);
      } else {
        Logger.error('Storage delete error:', JSON.stringify(error));
      }
      return { error: 'Failed to delete storage' };
    }
    return { error: 'Failed to delete file' };
  }
} 

