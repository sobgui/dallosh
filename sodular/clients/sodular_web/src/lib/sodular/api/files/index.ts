import { BaseClient } from '../base-client';
import {
  FileSchema,
  CreateFileRequest,
  UpdateFileRequest,
} from '../../types/schema/files.schema';
import { ApiResponse } from '../../types/schema';

export class FilesApiClient {
  private client: BaseClient;
  constructor(client: BaseClient) {
    this.client = client;
  }

  async create(req: CreateFileRequest): Promise<ApiResponse<FileSchema>> {
    return this.client.request('POST', '/files', { data: req });
  }

  async get({ filter, select }: { filter: any; select?: any }): Promise<ApiResponse<FileSchema>> {
    return this.client.request('GET', '/files', {
      params: {
        filter: JSON.stringify(filter),
        ...(select ? { select: JSON.stringify(select) } : {}),
      },
    });
  }

  async query({ filter, select, sort, take, skip }: { filter?: any; select?: any; sort?: any; take?: number; skip?: number }): Promise<ApiResponse<{ list: FileSchema[]; total: number }>> {
    return this.client.request('GET', '/files/query', {
      params: {
        ...(filter ? { filter: JSON.stringify(filter) } : {}),
        ...(select ? { select: JSON.stringify(select) } : {}),
        ...(sort ? { sort: JSON.stringify(sort) } : {}),
        ...(take ? { take } : {}),
        ...(skip ? { skip } : {}),
      },
    });
  }

  async patch(filter: any, data: UpdateFileRequest): Promise<ApiResponse<{ list: FileSchema[]; total: number }>> {
    return this.client.request('PATCH', '/files', {
      params: { filter: JSON.stringify(filter) },
      data,
    });
  }

  async put(filter: any, data: UpdateFileRequest): Promise<ApiResponse<{ list: FileSchema[]; total: number }>> {
    return this.client.request('PUT', '/files', {
      params: { filter: JSON.stringify(filter) },
      data,
    });
  }

  async delete(filter: any, options?: any): Promise<ApiResponse<{ list: FileSchema[]; total: number }>> {
    return this.client.request('DELETE', '/files', {
      params: {
        filter: JSON.stringify(filter),
        ...(options ? { options: JSON.stringify(options) } : {}),
      },
    });
  }

  // File upload with progress
  async upload({ storage_id, bucket_id, file_path, file, filename }: { storage_id: string; bucket_id: string; file_path?: string; file: File | Blob; filename?: string; }, onProgress?: (progress: { loaded: number; total?: number; percentage: number }) => void): Promise<ApiResponse<FileSchema>> {
    const formData = new FormData();
    formData.append('file', file, filename);
    const params: any = {
      storage_id,
      bucket_id,
    };
    if (file_path) params.file_path = file_path;
    const url = `/files/upload`;
    try {
      const response = await this.client.axiosInstance.post(url + '?' + new URLSearchParams(params).toString(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          if (onProgress && progressEvent && typeof progressEvent.loaded === 'number' && typeof progressEvent.total === 'number') {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress({ loaded: progressEvent.loaded, total: progressEvent.total, percentage });
          }
        },
      });
      return response.data;
    } catch (error: any) {
      return { error: error.response?.data?.error || error.message || 'Upload failed' };
    }
  }
}

export function createFilesApiClient(client: BaseClient) {
  return new FilesApiClient(client);
} 