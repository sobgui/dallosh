import { BaseClient } from '../base-client';
import {
  ApiResponse,
  QueryOptions,
  QueryResult,
  CountResult,
  UpdateResult,
  DeleteResult,
  DeleteOptions,
  Table,
  CreateTableRequest,
  UpdateTableRequest
} from '../../types/schema';

export class TablesAPI {
  constructor(private client: BaseClient) {}

  /**
   * Check if a table exists
   */
  async exists(tableId: string): Promise<ApiResponse<{ exists: boolean }>> {
    return this.client['request']<{ exists: boolean }>('GET', '/tables/exists', {
      params: { table_id: tableId }
    });
  }

  /**
   * Create a new table
   * Body: { uid?: string, data: { name, description }, createdBy?: string }
   */
  async create(data: CreateTableRequest): Promise<ApiResponse<Table>> {
    const body: any = { ...data };
    return this.client['request']<Table>('POST', '/tables', { data: body });
  }

  /**
   * Get a single table
   * Query: filter, select (as JSON strings)
   */
  async get(options: { filter: Record<string, any>; select?: string[] }): Promise<ApiResponse<Table>> {
    const params: any = {
      filter: JSON.stringify(options.filter || {})
    };
    if (options.select) params.select = JSON.stringify(options.select);
    return this.client['request']<Table>('GET', '/tables', { params });
  }

  /**
   * Query multiple tables
   * Query: filter, select, sort, take, skip (as JSON strings where needed)
   */
  async query(options: QueryOptions): Promise<ApiResponse<QueryResult<Table>>> {
    const params: any = {
      filter: JSON.stringify(options.filter || {})
    };
    if (options.select) params.select = JSON.stringify(options.select);
    if (options.sort) params.sort = JSON.stringify(options.sort);
    if (options.take !== undefined) params.take = options.take;
    if (options.skip !== undefined) params.skip = options.skip;
    return this.client['request']<QueryResult<Table>>('GET', '/tables/query', { params });
  }

  /**
   * Count tables
   * Query: filter (as JSON string)
   */
  async count(options: { filter?: Record<string, any> }): Promise<ApiResponse<CountResult>> {
    const params: any = {};
    if (options.filter) params.filter = JSON.stringify(options.filter);
    return this.client['request']<CountResult>('GET', '/tables/count', { params });
  }

  /**
   * Update tables (replace)
   * Query: filter (as JSON string)
   * Body: { uid, data, updatedBy, ... }
   */
  async put(filter: Record<string, any>, data: UpdateTableRequest): Promise<ApiResponse<UpdateResult>> {
    const params: any = { filter: JSON.stringify(filter) };
    return this.client['request']<UpdateResult>('PUT', '/tables', {
      params,
      data
    });
  }

  /**
   * Update tables (merge)
   * Query: filter (as JSON string)
   * Body: { uid, data, updatedBy, ... }
   */
  async patch(filter: Record<string, any>, data: UpdateTableRequest): Promise<ApiResponse<UpdateResult>> {
    const params: any = { filter: JSON.stringify(filter) };
    return this.client['request']<UpdateResult>('PATCH', '/tables', {
      params,
      data
    });
  }

  /**
   * Delete tables
   * Query: filter, options (as JSON strings)
   */
  async delete(filter: Record<string, any>, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    const params: any = { filter: JSON.stringify(filter) };
    if (options) params.options = JSON.stringify(options);
    return this.client['request']<DeleteResult>('DELETE', '/tables', {
      params
    });
  }
}
