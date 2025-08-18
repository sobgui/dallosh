import { BaseClient } from '../base-client';
import {
  ApiResponse,
  QueryOptions,
  QueryResult,
  CountResult,
  UpdateResult,
  DeleteResult,
  DeleteOptions,
  Ref,
  CreateRefRequest,
  UpdateRefRequest
} from '../../types/schema';

export class RefAPI {
  private currentTableId?: string;

  constructor(private client: BaseClient) {}

  /**
   * Set the table context for subsequent ref operations
   */
  from(tableId: string): RefAPI {
    this.currentTableId = tableId;
    return this;
  }

  /**
   * Create a new ref document
   * Body: { uid?: string, data: Object, createdBy?: string }
   */
  async create(data: CreateRefRequest): Promise<ApiResponse<Ref>> {
    if (!this.currentTableId) {
      return { error: 'Table ID is required. Use from(tableId) first.' };
    }
    const body: any = { ...data };
    return this.client['request']<Ref>('POST', '/ref', {
      params: { table_id: this.currentTableId },
      data: body
    });
  }

  /**
   * Get a single ref document
   * Query: filter, select (as JSON strings)
   */
  async get(options: { filter: Record<string, any>; select?: string[] }): Promise<ApiResponse<Ref>> {
    if (!this.currentTableId) {
      return { error: 'Table ID is required. Use from(tableId) first.' };
    }
    const params: any = {
      table_id: this.currentTableId,
      filter: JSON.stringify(options.filter || {})
    };
    if (options.select) params.select = JSON.stringify(options.select);
    return this.client['request']<Ref>('GET', '/ref', { params });
  }

  /**
   * Query multiple ref documents
   * Query: filter, select, sort, take, skip (as JSON strings where needed)
   */
  async query(options: QueryOptions): Promise<ApiResponse<QueryResult<Ref>>> {
    if (!this.currentTableId) {
      return { error: 'Table ID is required. Use from(tableId) first.' };
    }
    const params: any = {
      table_id: this.currentTableId,
      filter: JSON.stringify(options.filter || {})
    };
    if (options.select) params.select = JSON.stringify(options.select);
    if (options.sort) params.sort = JSON.stringify(options.sort);
    if (options.take !== undefined) params.take = options.take;
    if (options.skip !== undefined) params.skip = options.skip;
    return this.client['request']<QueryResult<Ref>>('GET', '/ref/query', { params });
  }

  /**
   * Count ref documents
   * Query: filter (as JSON string)
   */
  async count(options: { filter?: Record<string, any> }): Promise<ApiResponse<CountResult>> {
    if (!this.currentTableId) {
      return { error: 'Table ID is required. Use from(tableId) first.' };
    }
    const params: any = { table_id: this.currentTableId };
    if (options.filter) params.filter = JSON.stringify(options.filter);
    return this.client['request']<CountResult>('GET', '/ref/count', { params });
  }

  /**
   * Update ref documents (replace)
   * Query: filter (as JSON string)
   * Body: { uid, data, updatedBy, ... }
   */
  async put(filter: Record<string, any>, data: UpdateRefRequest): Promise<ApiResponse<UpdateResult>> {
    if (!this.currentTableId) {
      return { error: 'Table ID is required. Use from(tableId) first.' };
    }
    const params: any = { table_id: this.currentTableId, filter: JSON.stringify(filter) };
    return this.client['request']<UpdateResult>('PUT', '/ref', {
      params,
      data
    });
  }

  /**
   * Update ref documents (merge)
   * Query: filter (as JSON string)
   * Body: { uid, data, updatedBy, ... }
   */
  async patch(filter: Record<string, any>, data: UpdateRefRequest): Promise<ApiResponse<UpdateResult>> {
    if (!this.currentTableId) {
      return { error: 'Table ID is required. Use from(tableId) first.' };
    }
    const params: any = { table_id: this.currentTableId, filter: JSON.stringify(filter) };
    return this.client['request']<UpdateResult>('PATCH', '/ref', {
      params,
      data
    });
  }

  /**
   * Delete ref documents
   * Query: filter, options (as JSON strings)
   */
  async delete(filter: Record<string, any>, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    if (!this.currentTableId) {
      return { error: 'Table ID is required. Use from(tableId) first.' };
    }
    const params: any = { table_id: this.currentTableId, filter: JSON.stringify(filter) };
    if (options) params.options = JSON.stringify(options);
    return this.client['request']<DeleteResult>('DELETE', '/ref', {
      params
    });
  }
}
