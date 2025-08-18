import { BaseClient } from '../base-client';
import {
  ApiResponse,
  QueryOptions,
  QueryResult,
  CountResult,
  UpdateResult,
  DeleteResult,
  DeleteOptions,
  Database,
  CreateDatabaseRequest,
  UpdateDatabaseRequest
} from '../../types/schema';

export class DatabaseAPI {
  constructor(private client: BaseClient) {}

  /**
   * Check if a database exists
   */
  async exists(databaseId: string): Promise<ApiResponse<{ exists: boolean }>> {
    return this.client['request']<{ exists: boolean }>('GET', '/database/exists', {
      params: { database_id: databaseId }
    });
  }

  /**
   * Create a new database
   * Body: { uid?: string, data: { name, description }, createdBy?: string }
   */
  async create(data: CreateDatabaseRequest): Promise<ApiResponse<Database>> {
    // Ensure only allowed fields are sent
    const body: any = { ...data };
    return this.client['request']<Database>('POST', '/database', { data: body });
  }

  /**
   * Get a single database
   * Query: filter, select (as JSON strings)
   */
  async get(options: { filter: Record<string, any>; select?: string[] }): Promise<ApiResponse<Database>> {
    const params: any = {
      filter: JSON.stringify(options.filter || {})
    };
    if (options.select) params.select = JSON.stringify(options.select);
    return this.client['request']<Database>('GET', '/database', { params });
  }

  /**
   * Query multiple databases
   * Query: filter, select, sort, take, skip (as JSON strings where needed)
   */
  async query(options: QueryOptions): Promise<ApiResponse<QueryResult<Database>>> {
    const params: any = {
      filter: JSON.stringify(options.filter || {})
    };
    if (options.select) params.select = JSON.stringify(options.select);
    if (options.sort) params.sort = JSON.stringify(options.sort);
    if (options.take !== undefined) params.take = options.take;
    if (options.skip !== undefined) params.skip = options.skip;
    return this.client['request']<QueryResult<Database>>('GET', '/database/query', { params });
  }

  /**
   * Count databases
   * Query: filter (as JSON string)
   */
  async count(options: { filter?: Record<string, any> }): Promise<ApiResponse<CountResult>> {
    const params: any = {};
    if (options.filter) params.filter = JSON.stringify(options.filter);
    return this.client['request']<CountResult>('GET', '/database/count', { params });
  }

  /**
   * Update databases (replace)
   * Query: filter (as JSON string)
   * Body: { uid, data, updatedBy, ... }
   */
  async put(filter: Record<string, any>, data: UpdateDatabaseRequest): Promise<ApiResponse<UpdateResult>> {
    const params: any = { filter: JSON.stringify(filter) };
    return this.client['request']<UpdateResult>('PUT', '/database', {
      params,
      data
    });
  }

  /**
   * Update databases (merge)
   * Query: filter (as JSON string)
   * Body: { uid, data, updatedBy, ... }
   */
  async patch(filter: Record<string, any>, data: UpdateDatabaseRequest): Promise<ApiResponse<UpdateResult>> {
    const params: any = { filter: JSON.stringify(filter) };
    return this.client['request']<UpdateResult>('PATCH', '/database', {
      params,
      data
    });
  }

  /**
   * Delete databases
   * Query: filter, options (as JSON strings)
   */
  async delete(filter: Record<string, any>, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    const params: any = { filter: JSON.stringify(filter) };
    if (options) params.options = JSON.stringify(options);
    return this.client['request']<DeleteResult>('DELETE', '/database', {
      params
    });
  }
}
