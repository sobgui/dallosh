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

  async exists(tableId: string): Promise<ApiResponse<{ exists: boolean }>> {
    return this.client.request<{ exists: boolean }>('GET', '/tables/exists', {
      params: { table_id: tableId }
    });
  }

  async create(data: CreateTableRequest): Promise<ApiResponse<Table>> {
    return this.client.request<Table>('POST', '/tables', { data });
  }

  async get(options: { filter: Record<string, any>; select?: string[] }): Promise<ApiResponse<Table>> {
    return this.client.request<Table>('GET', '/tables', { params: options });
  }

  async query(options: QueryOptions): Promise<ApiResponse<QueryResult<Table>>> {
    return this.client.request<QueryResult<Table>>('GET', '/tables/query', { params: options });
  }

  async count(options: { filter?: Record<string, any> }): Promise<ApiResponse<CountResult>> {
    return this.client.request<CountResult>('GET', '/tables/count', { params: options });
  }

  async put(filter: Record<string, any>, data: UpdateTableRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request<UpdateResult>('PUT', '/tables', { params: { filter }, data });
  }

  async patch(filter: Record<string, any>, data: UpdateTableRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request<UpdateResult>('PATCH', '/tables', { params: { filter }, data });
  }

  async delete(filter: Record<string, any>, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    return this.client.request<DeleteResult>('DELETE', '/tables', { params: { filter, options } });
  }
}
