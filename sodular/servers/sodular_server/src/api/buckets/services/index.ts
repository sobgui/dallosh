/**
 * Buckets Services
 * Business logic for buckets management operations
 */

import { CreateBucketRequest, UpdateBucketRequest, BucketSchema } from '@/types/schema/buckets.schema';
import { QueryOptions, GetOptions, CountOptions, DeleteOptions, Filter, DatabaseResult } from '@/lib/database/types';
import { Logger } from '@/core/utils';
import { COLLECTIONS } from '@/configs/constant';
import { SodularStorageService } from '@/lib/storage';

export class BucketsService {
  private database: any;

  constructor(database: any) {
    this.database = database;
  }

  async create(request: CreateBucketRequest, options?: any): Promise<DatabaseResult<BucketSchema>> {
    const user_uid = (options && options.user_uid) || 'system';
    if (request.data) request.createdBy = user_uid;
    try {
      Logger.debug('BucketsService.create: Looking up buckets table with filter', JSON.stringify({ filter: { 'data.name': COLLECTIONS.BUCKETS } }));
      if (request.data) request.data.isActive = true;
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.BUCKETS } });
      Logger.debug('BucketsService.create: Table lookup result', JSON.stringify(tableResult));
      if (!tableResult.value) return { error: 'Buckets table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).create(request);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Buckets create error:', error.message);
      } else {
        Logger.error('Buckets create error:', JSON.stringify(error));
      }
      return { error: 'Failed to create bucket' };
    }
  }

  async get(options: GetOptions): Promise<DatabaseResult<BucketSchema | null>> {
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.BUCKETS } });
      if (!tableResult.value) return { error: 'Buckets table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).get(options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Buckets get error:', error.message);
      } else {
        Logger.error('Buckets get error:', JSON.stringify(error));
      }
      return { error: 'Failed to get bucket' };
    }
  }

  async query(options: QueryOptions): Promise<DatabaseResult<{ list: BucketSchema[]; total: number }>> {
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.BUCKETS } });
      if (!tableResult.value) return { error: 'Buckets table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).query(options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Buckets query error:', error.message);
      } else {
        Logger.error('Buckets query error:', JSON.stringify(error));
      }
      return { error: 'Failed to query buckets' };
    }
  }

  async count(options: CountOptions): Promise<DatabaseResult<{ total: number }>> {
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.BUCKETS } });
      if (!tableResult.value) return { error: 'Buckets table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).count(options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Buckets count error:', error.message);
      } else {
        Logger.error('Buckets count error:', JSON.stringify(error));
      }
      return { error: 'Failed to count buckets' };
    }
  }

  async put(filter: Filter, request: UpdateBucketRequest, options?: any): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && options.user_uid) || 'system';
    request.updatedBy = user_uid;
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.BUCKETS } });
      if (!tableResult.value) return { error: 'Buckets table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).put(filter, request);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Buckets put error:', error.message);
      } else {
        Logger.error('Buckets put error:', JSON.stringify(error));
      }
      return { error: 'Failed to update bucket' };
    }
  }

  async patch(filter: Filter, request: UpdateBucketRequest, options?: any): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && options.user_uid) || 'system';
    request.updatedBy = user_uid;
    try {
      const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.BUCKETS } });
      if (!tableResult.value) return { error: 'Buckets table not found' };
      const result = await this.database.ref.from(tableResult.value.uid).patch(filter, request);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Buckets patch error:', error.message);
      } else {
        Logger.error('Buckets patch error:', JSON.stringify(error));
      }
      return { error: 'Failed to update bucket' };
    }
  }

  async delete(filter: Filter, options?: DeleteOptions & { user_uid?: string }): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && (options as any).user_uid) || 'system';
    const tableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.BUCKETS } });
    if (!tableResult.value) return { error: 'Buckets table not found' };
    if (options && (options as any).withSoftDelete) {
      (options as any).deletedBy = user_uid;
      // Soft delete: do not cascade
      return await this.database.ref.from(tableResult.value.uid).delete(filter, options);
    }
    try {
      // 1. Find all files for this bucket
      const filesTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
      if (!filesTableResult.value) return { error: 'Files table not found' };
      const filesResult = await this.database.ref.from(filesTableResult.value.uid).query({ filter: { 'data.bucket_id': (filter as any).uid } });
      if (filesResult.value && filesResult.value.list) {
        for (const file of filesResult.value.list) {
          // Fetch the FileRecord for this file
          const fileTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.FILES } });
          if (!fileTableResult.value) continue;
          const fileTableUid = fileTableResult.value.uid;
          const fileRecordResult = await this.database.ref.from(fileTableUid).get({ filter: { uid: file.uid } });
          if (!fileRecordResult.value) continue;
          const fileRecord = fileRecordResult.value;
          // Fetch the storage document for this file
          const storageTableResult = await this.database.tables.get({ filter: { 'data.name': COLLECTIONS.STORAGE } });
          if (!storageTableResult.value) continue;
          const storageTableUid = storageTableResult.value.uid;
          const storageDocResult = await this.database.ref.from(storageTableUid).get({ filter: { uid: fileRecord.data.storage_id } });
          if (!storageDocResult.value) continue;
          const storageDoc = storageDocResult.value;
          const storageType = storageDoc.data.type;
          const storageConfigs = storageDoc.data.configs || {};
          // Pass only the params to storageService.delete (no fileRecord)
          const storageService = new SodularStorageService({ type: storageType, configs: storageConfigs, database: this.database });
          await storageService.delete({
            storage_id: fileRecord.data.storage_id,
            bucket_id: fileRecord.data.bucket_id,
            parts: fileRecord.data.parts
          });
          // Delete the file record from the database
          await this.database.ref.from(fileTableUid).delete({ uid: file.uid });
        }
      }
      // 2. Delete the bucket itself
      const result = await this.database.ref.from(tableResult.value.uid).delete(filter, options);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message) {
        Logger.error('Buckets delete error:', error.message);
      } else {
        Logger.error('Buckets delete error:', JSON.stringify(error));
      }
      return { error: 'Failed to delete bucket' };
    }
  }
} 