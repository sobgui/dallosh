import { BaseClient } from '../base-client';
import {
  StorageSchema,
  CreateStorageRequest,
  UpdateStorageRequest,
} from '../../types/schema/storage.schema';
import { ApiResponse, QueryOptions, CountResult, UpdateResult, DeleteResult, DeleteOptions } from '../../types/schema';

export class StorageAPI {
  constructor(private client: BaseClient) {}

  async create(data: CreateStorageRequest): Promise<ApiResponse<StorageSchema>> {
    return this.client.request('POST', '/storage', { data });
  }

  async get(options: { filter: Record<string, any>; select?: string[] }): Promise<ApiResponse<StorageSchema>> {
    return this.client.request('GET', '/storage', { params: options });
  }

  async query(options: QueryOptions): Promise<ApiResponse<{ list: StorageSchema[]; total: number }>> {
    return this.client.request('GET', '/storage/query', { params: options });
  }

  async patch(filter: any, data: UpdateStorageRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request('PATCH', '/storage', { params: { filter }, data });
  }

  async put(filter: any, data: UpdateStorageRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request('PUT', '/storage', { params: { filter }, data });
  }

  async delete(filter: any, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    console.log('StorageAPI.delete called with filter:', filter, 'options:', options, new Error().stack);
    return this.client.request('DELETE', '/storage', { params: { filter, options } });
  }
}
