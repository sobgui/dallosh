/**
 * Database Services
 * Business logic for database management operations
 */

import { 
  CreateDatabaseRequest,
  UpdateDatabaseRequest,
  DatabaseSchema
} from '@/types/schema/database.schema';
import { 
  QueryOptions,
  GetOptions,
  CountOptions,
  DeleteOptions,
  Filter,
  DatabaseResult
} from '@/lib/database/types';
import { MongoDatabaseAdapter } from '@/lib/database/adapters/mongodb';
import { Logger } from '@/core/utils';
import { CONSTANTS } from '@/configs/constant';

export class DatabaseService {
  private database: MongoDatabaseAdapter;

  constructor(database: MongoDatabaseAdapter) {
    this.database = database;
  }

  /**
   * Check if a database exists
   */
  async exists(databaseId: string): Promise<DatabaseResult<boolean>> {
    try {
      const exists = await this.database.exists(databaseId);
      return { value: exists };
    } catch (error) {
      Logger.error('Database exists error:', error);
      return { error: 'Failed to check database existence' };
    }
  }

  /**
   * Create a new database
   */
  async create(request: CreateDatabaseRequest, options?: any): Promise<DatabaseResult<DatabaseSchema>> {
    const user_uid = (options && options.user_uid) || 'system';
    if (request.data) request.createdBy = user_uid;
    try {
      // Check if database with same name already exists
      const existingResult = await this.database.get({
        filter: { 'data.name': request.data.name }
      });

      if (existingResult.value) {
        return { error: 'Database with this name already exists' };
      }
      request.isActive = true;
      const result = await this.database.create(request);
      return result;
    } catch (error) {
      Logger.error('Database create error:', error);
      return { error: 'Failed to create database' };
    }
  }

  /**
   * Get a single database
   */
  async get(options: GetOptions): Promise<DatabaseResult<DatabaseSchema | null>> {
    try {
      const result = await this.database.get(options);
      return result;
    } catch (error) {
      Logger.error('Database get error:', error);
      return { error: 'Failed to get database' };
    }
  }

  /**
   * Query multiple databases
   */
  async query(options: QueryOptions): Promise<DatabaseResult<{ list: DatabaseSchema[]; total: number }>> {
    try {
      const result = await this.database.query(options);
      return result;
    } catch (error) {
      Logger.error('Database query error:', error);
      return { error: 'Failed to query databases' };
    }
  }

  /**
   * Count databases
   */
  async count(options: CountOptions): Promise<DatabaseResult<{ total: number }>> {
    try {
      const result = await this.database.count(options);
      return result;
    } catch (error) {
      Logger.error('Database count error:', error);
      return { error: 'Failed to count databases' };
    }
  }

  /**
   * Update databases (PUT - replace)
   */
  async put(filter: Filter, request: UpdateDatabaseRequest): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    try {
      // If updating name, check for duplicates
      if (request.data?.name) {
        // Extract the UID from the filter to exclude current database from duplicate check
        const currentUid = filter.uid || (filter as any).uid;

        const existingResult = await this.database.get({
          filter: {
            'data.name': request.data.name,
            uid: { $ne: currentUid }
          }
        });

        if (existingResult.value) {
          return { error: 'Database with this name already exists' };
        }
      }

      const result = await this.database.put(filter, request);
      return result;
    } catch (error) {
      Logger.error('Database put error:', error);
      return { error: 'Failed to update databases' };
    }
  }

  /**
   * Update databases (PATCH - merge)
   */
  async patch(filter: Filter, request: UpdateDatabaseRequest, options?: any): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && options.user_uid) || 'system';
    request.updatedBy = user_uid;
    try {
      // If updating name, check for duplicates
      if (request.data?.name) {
        // Extract the UID from the filter to exclude current database from duplicate check
        const currentUid = filter.uid || (filter as any).uid;

        const existingResult = await this.database.get({
          filter: {
            'data.name': request.data.name,
            uid: { $ne: currentUid }
          }
        });

        if (existingResult.value) {
          return { error: 'Database with this name already exists' };
        }
      }

      const result = await this.database.patch(filter, request);
      return result;
    } catch (error) {
      Logger.error('Database patch error:', error);
      return { error: 'Failed to update databases' };
    }
  }

  /**
   * Delete databases
   */
  async delete(filter: Filter, options?: DeleteOptions & { user_uid?: string }): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && (options as any).user_uid) || 'system';
    if (options && (options as any).withSoftDelete) {
      (options as any).deletedBy = user_uid;
    }
    try {
      const result = await this.database.delete(filter, options);
      return result;
    } catch (error) {
      Logger.error('Database delete error:', error);
      return { error: 'Failed to delete databases' };
    }
  }
}
