import { BaseClient } from '../base-client';
import {
  BucketSchema,
  CreateBucketRequest,
  UpdateBucketRequest,
} from '../../types/schema/buckets.schema';
import { ApiResponse, QueryOptions, UpdateResult, DeleteResult, DeleteOptions } from '../../types/schema';

export class BucketsAPI {
  constructor(private client: BaseClient) {}

  async create(data: CreateBucketRequest): Promise<ApiResponse<BucketSchema>> {
    return this.client.request('POST', '/buckets', { data });
  }

  async get(options: { filter: any; select?: any }): Promise<ApiResponse<BucketSchema>> {
    return this.client.request('GET', '/buckets', { params: options });
  }

  async query(options: QueryOptions): Promise<ApiResponse<{ list: BucketSchema[]; total: number }>> {
    return this.client.request('GET', '/buckets/query', { params: options });
  }

  async patch(filter: any, data: UpdateBucketRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request('PATCH', '/buckets', { params: { filter }, data });
  }

  async put(filter: any, data: UpdateBucketRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request('PUT', '/buckets', { params: { filter }, data });
  }

  async delete(filter: any, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    return this.client.request('DELETE', '/buckets', { params: { filter, options } });
  }
}
