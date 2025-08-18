/**
 * Ref Services
 * Business logic for ref (document/row) management operations
 */

import { 
  CreateRefRequest,
  UpdateRefRequest,
  RefSchema
} from '@/types/schema/ref.schema';
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

export class RefService {
  private database: MongoDatabaseAdapter;

  constructor(database: MongoDatabaseAdapter) {
    this.database = database;
  }

  /**
   * Create a new ref (document/row)
   */
  async create(tableId: string, request: CreateRefRequest, options?: any): Promise<DatabaseResult<RefSchema>> {
    const user_uid = (options && options.user_uid) || 'system';
    request.createdBy = user_uid;
    request.isActive = true;
    try {
      const result = await this.database.ref.from(tableId).create(request);
      return result;
    } catch (error) {
      Logger.error('Ref create error:', error);
      return { error: 'Failed to create ref' };
    }
  }

  /**
   * Get a single ref
   */
  async get(tableId: string, options: GetOptions): Promise<DatabaseResult<RefSchema | null>> {
    try {
      const result = await this.database.ref.from(tableId).get(options);
      if(result.value?.data?.password) result.value.data.password =  "";
      return result;
    } catch (error) {
      Logger.error('Ref get error:', error);
      return { error: 'Failed to get ref' };
    }
  }

  /**
   * Query multiple refs
   */
  async query(tableId: string, options: QueryOptions): Promise<DatabaseResult<{ list: RefSchema[]; total: number }>> {
    try {
      const result = await this.database.ref.from(tableId).query(options);

      if (result.value) {
        // Remove passwords from response
        const users = result.value.list.map(user => {
          const userResponse = { ...user };
          delete userResponse.data.password;
          return userResponse;
        });

        return {
          value: {
            list: users,
            total: result.value.total,
          },
        };
      }
      return result;
    } catch (error) {
      Logger.error('Ref query error:', error);
      return { error: 'Failed to query refs' };
    }
  }

  /**
   * Count refs
   */
  async count(tableId: string, options: CountOptions): Promise<DatabaseResult<{ total: number }>> {
    try {
      const result = await this.database.ref.from(tableId).count(options);
      return result;
    } catch (error) {
      Logger.error('Ref count error:', error);
      return { error: 'Failed to count refs' };
    }
  }

  /**
   * Update refs (PUT - replace)
   */
  async put(tableId: string, filter: Filter, request: UpdateRefRequest): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    try {
      const result = await this.database.ref.from(tableId).put(filter, request);
      return result;
    } catch (error) {
      Logger.error('Ref put error:', error);
      return { error: 'Failed to update refs' };
    }
  }

  /**
   * Update refs (PATCH - merge)
   */
  async patch(tableId: string, filter: Filter, request: UpdateRefRequest, options?: any): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && options.user_uid) || 'system';
    request.updatedBy = user_uid;
    try {
      const result = await this.database.ref.from(tableId).patch(filter, request);
      return result;
    } catch (error) {
      Logger.error('Ref patch error:', error);
      return { error: 'Failed to update refs' };
    }
  }

  /**
   * Delete refs
   */
  async delete(tableId: string, filter: Filter, options?: DeleteOptions & { user_uid?: string }): Promise<DatabaseResult<{ list: { uid: string }[]; total: number }>> {
    const user_uid = (options && (options as any).user_uid) || 'system';
    if (options && (options as any).withSoftDelete) {
      (options as any).deletedBy = user_uid;
    }
    try {
      const result = await this.database.ref.from(tableId).delete(filter, options);
      return result;
    } catch (error) {
      Logger.error('Ref delete error:', error);
      return { error: 'Failed to delete refs' };
    }
  }
}
