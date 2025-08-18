import { BaseClient } from '../base-client';
import {
  BucketSchema,
  CreateBucketRequest,
  UpdateBucketRequest,
} from '../../types/schema/buckets.schema';
import { ApiResponse } from '../../types/schema';

export class BucketsApiClient {
  private client: BaseClient;
  constructor(client: BaseClient) {
    this.client = client;
  }

  async create(req: CreateBucketRequest): Promise<ApiResponse<BucketSchema>> {
    return this.client.request('POST', '/buckets', { data: req });
  }

  async get({ filter, select }: { filter: any; select?: any }): Promise<ApiResponse<BucketSchema>> {
    return this.client.request('GET', '/buckets', {
      params: {
        filter: JSON.stringify(filter),
        ...(select ? { select: JSON.stringify(select) } : {}),
      },
    });
  }

  async query({ filter, select, sort, take, skip }: { filter?: any; select?: any; sort?: any; take?: number; skip?: number }): Promise<ApiResponse<{ list: BucketSchema[]; total: number }>> {
    return this.client.request('GET', '/buckets/query', {
      params: {
        ...(filter ? { filter: JSON.stringify(filter) } : {}),
        ...(select ? { select: JSON.stringify(select) } : {}),
        ...(sort ? { sort: JSON.stringify(sort) } : {}),
        ...(take ? { take } : {}),
        ...(skip ? { skip } : {}),
      },
    });
  }

  async patch(filter: any, data: UpdateBucketRequest): Promise<ApiResponse<{ list: BucketSchema[]; total: number }>> {
    return this.client.request('PATCH', '/buckets', {
      params: { filter: JSON.stringify(filter) },
      data,
    });
  }

  async put(filter: any, data: UpdateBucketRequest): Promise<ApiResponse<{ list: BucketSchema[]; total: number }>> {
    return this.client.request('PUT', '/buckets', {
      params: { filter: JSON.stringify(filter) },
      data,
    });
  }

  async delete(filter: any, options?: any): Promise<ApiResponse<{ list: BucketSchema[]; total: number }>> {
    return this.client.request('DELETE', '/buckets', {
      params: {
        filter: JSON.stringify(filter),
        ...(options ? { options: JSON.stringify(options) } : {}),
      },
    });
  }
}

export function createBucketsApiClient(client: BaseClient) {
  return new BucketsApiClient(client);
} 