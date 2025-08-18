import { BaseClient } from '../base-client';
import {
  StorageSchema,
  CreateStorageRequest,
  UpdateStorageRequest,
} from '../../types/schema/storage.schema';
import { ApiResponse } from '../../types/schema';

export class StorageApiClient {
  private client: BaseClient;
  constructor(client: BaseClient) {
    this.client = client;
  }

  async create(req: CreateStorageRequest): Promise<ApiResponse<StorageSchema>> {
    return this.client.request('POST', '/storage', { data: req });
  }

  async get({ filter, select }: { filter: any; select?: any }): Promise<ApiResponse<StorageSchema>> {
    return this.client.request('GET', '/storage', {
      params: {
        filter: JSON.stringify(filter),
        ...(select ? { select: JSON.stringify(select) } : {}),
      },
    });
  }

  async query({ filter, select, sort, take, skip }: { filter?: any; select?: any; sort?: any; take?: number; skip?: number }): Promise<ApiResponse<{ list: StorageSchema[]; total: number }>> {
    return this.client.request('GET', '/storage/query', {
      params: {
        ...(filter ? { filter: JSON.stringify(filter) } : {}),
        ...(select ? { select: JSON.stringify(select) } : {}),
        ...(sort ? { sort: JSON.stringify(sort) } : {}),
        ...(take ? { take } : {}),
        ...(skip ? { skip } : {}),
      },
    });
  }

  async patch(filter: any, data: UpdateStorageRequest): Promise<ApiResponse<{ list: StorageSchema[]; total: number }>> {
    return this.client.request('PATCH', '/storage', {
      params: { filter: JSON.stringify(filter) },
      data,
    });
  }

  async put(filter: any, data: UpdateStorageRequest): Promise<ApiResponse<{ list: StorageSchema[]; total: number }>> {
    return this.client.request('PUT', '/storage', {
      params: { filter: JSON.stringify(filter) },
      data,
    });
  }

  async delete(filter: any, options?: any): Promise<ApiResponse<{ list: StorageSchema[]; total: number }>> {
    return this.client.request('DELETE', '/storage', {
      params: {
        filter: JSON.stringify(filter),
        ...(options ? { options: JSON.stringify(options) } : {}),
      },
    });
  }
}

export function createStorageApiClient(client: BaseClient) {
  return new StorageApiClient(client);
} 