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

  async exists(databaseId: string): Promise<ApiResponse<{ exists: boolean }>> {
    return this.client.request<{ exists: boolean }>('GET', '/database/exists', {
      params: { database_id: databaseId }
    });
  }

  async create(data: CreateDatabaseRequest): Promise<ApiResponse<Database>> {
    return this.client.request<Database>('POST', '/database', { data });
  }

  async get(options: { filter: Record<string, any>; select?: string[] }): Promise<ApiResponse<Database>> {
    return this.client.request<Database>('GET', '/database', { params: options });
  }

  async query(options: QueryOptions): Promise<ApiResponse<QueryResult<Database>>> {
    return this.client.request<QueryResult<Database>>('GET', '/database/query', { params: options });
  }

  async count(options: { filter?: Record<string, any> }): Promise<ApiResponse<CountResult>> {
    return this.client.request<CountResult>('GET', '/database/count', { params: options });
  }

  async put(filter: Record<string, any>, data: UpdateDatabaseRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request<UpdateResult>('PUT', '/database', { params: { filter }, data });
  }

  async patch(filter: Record<string, any>, data: UpdateDatabaseRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request<UpdateResult>('PATCH', '/database', { params: { filter }, data });
  }

  async delete(filter: Record<string, any>, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    return this.client.request<DeleteResult>('DELETE', '/database', { params: { filter, options } });
  }
}
