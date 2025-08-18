/**
 * Tables Services
 * Business logic for table management operations
 */

import { 
  CreateTableRequest,
  UpdateTableRequest,
  TableSchema
} from '@/types/schema/tables.schema';
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

export class TablesService {
  private database: MongoDatabaseAdapter;

  constructor(database: MongoDatabaseAdapter) {
    this.database = database;
  }

  /**
   * Check if a table exists
   */
  async exists(tableId: string): Promise<DatabaseResult<boolean>> {
    try {
      const exists = await this.database.tables.exists(tableId);
      return { value: exists };
    } catch (error) {
      Logger.error('Table exists error:', error);
      return { error: 'Failed to check table existence' };
    }
  }

  /**
   * Create a new table
   */
  async create(request: CreateTableRequest, options?: any): Promise<DatabaseResult<TableSchema>> {
    const user_uid = (options && options.user_uid) || 'system';
    if (request.data) request.createdBy = user_uid;
    try {
      Logger.debug('TablesService.create: Checking for existing table with filter', JSON.stringify({ 'data.name': request.data.name }));
      // Check if table with same name already exists
      const existingResult = await this.database.tables.get({
        filter: { 'data.name': request.data.name }
      });
      Logger.debug('TablesService.create: Existing table result', JSON.stringify(existingResult));
      if (existingResult.value) {
        return { error: 'Table with this name already exists' };
      }
      Logger.debug('TablesService.create: Creating table with request', JSON.stringify(request));
      request.isActive = true;
      const result = await this.database.tables.create(request);
      return result;
    } catch (error) {
      Logger.error('Table create error:', error);
      return { error: 'Failed to create table' };
    }
  }

  /**
   * Get a single table
   */
  async get(options: GetOptions): Promise<DatabaseResult<TableSchema | null>> {
    try {
      const result = await this.database.tables.get(options);
      return result;
    } catch (error) {
      Logger.error('Table get error:', error);
      return { error: 'Failed to get table' };
    }
  }

  /**
   * Query multiple tables
   */
  async query(options: QueryOptions): Promise<DatabaseResult<{ list: TableSchema[]; total: number }>> {
    try {
      const result = await this.database.tables.query(options);
      return result;
    } catch (error) {
      Logger.error('Table query error:', error);
      return { error: 'Failed to query tables' };
    }
  }

  /**
   * Count tables
   */
  async count(options: CountOptions): Promise<DatabaseResult<{ total: number }>> {
    try {
      const result = await this.database.tables.count(options);
      return result;
    } catch (error) {
      Logger.error('Table count error:', error);
      return { error: 'Failed to count tables' };
    }
  }

  /**
   * Update tables (PUT - replace)
   */
  async put(filter: Filter, request: UpdateTableRequest): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    try {
      // If updating name, check for duplicates
      if (request.data?.name) {
        const existingResult = await this.database.tables.get({
          filter: { 
            'data.name': request.data.name,
            uid: { $ne: request.uid }
          }
        });

        if (existingResult.value) {
          return { error: 'Table with this name already exists' };
        }
      }

      const result = await this.database.tables.put(filter, request);
      return result;
    } catch (error) {
      Logger.error('Table put error:', error);
      return { error: 'Failed to update tables' };
    }
  }

  /**
   * Update tables (PATCH - merge)
   */
  async patch(filter: Filter, request: UpdateTableRequest, options?: any): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && options.user_uid) || 'system';
    request.updatedBy = user_uid;
    try {
      // If updating name, check for duplicates
      if (request.data?.name) {
        const existingResult = await this.database.tables.get({
          filter: { 
            'data.name': request.data.name,
            uid: { $ne: request.uid }
          }
        });

        if (existingResult.value) {
          return { error: 'Table with this name already exists' };
        }
      }

      const result = await this.database.tables.patch(filter, request);
      return result;
    } catch (error) {
      Logger.error('Table patch error:', error);
      return { error: 'Failed to update tables' };
    }
  }

  /**
   * Delete tables
   */
  async delete(filter: Filter, options?: DeleteOptions & { user_uid?: string }): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && (options as any).user_uid) || 'system';
    if (options && (options as any).withSoftDelete) {
      (options as any).deletedBy = user_uid;
    }
    try {
      const result = await this.database.tables.delete(filter, options);
      return result;
    } catch (error) {
      Logger.error('Table delete error:', error);
      return { error: 'Failed to delete tables' };
    }
  }
}
