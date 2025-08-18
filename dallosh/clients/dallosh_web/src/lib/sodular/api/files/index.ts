import { BaseClient } from '../base-client';
import {
  FileSchema,
  UpdateFileRequest,
  DownloadFileRequest,
  DownloadOptions,
  DownloadEvents
} from '../../types/schema/files.schema';
import { ApiResponse, QueryOptions, UpdateResult, DeleteResult, DeleteOptions } from '../../types/schema';
import { buildApiUrl, buildQueryParams } from '../../utils';

export class FilesAPI {
  constructor(private client: BaseClient) {}

  async upload({
    storage_id,
    bucket_id,
    file_path,
    file,
    filename,
  }: {
    storage_id: string;
    bucket_id: string;
    file_path?: string;
    file: File | Blob;
    filename?: string;
  }, onProgress?: (progress: { loaded: number; total?: number; percentage: number }) => void): Promise<ApiResponse<FileSchema>> {
    const formData = new FormData();
    formData.append('file', file, filename || (file instanceof File ? file.name : 'upload'));

    const params: any = { storage_id, bucket_id };
    if (file_path) params.file_path = file_path;
    const sodularClient = this.client as any;
    if (sodularClient.currentDatabaseId) {
      params.database_id = sodularClient.currentDatabaseId;
    }

    try {
      const response = await sodularClient.axiosInstance.post('/files/upload', formData, {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          if (onProgress && progressEvent.total) {
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

  async download(
    params: DownloadFileRequest,
    options: DownloadOptions = { type: 'blob' }
  ): Promise<DownloadEvents> {
    let onDataCallback = (progress: any) => {};
    let onFinishCallback = () => {};
    let onErrorCallback = (error: Error) => {};

    (async () => {
        const sodularClient = this.client as any;
        const queryParams = { ...params };

        if (!queryParams.database_id && sodularClient.currentDatabaseId) {
            queryParams.database_id = sodularClient.currentDatabaseId;
        }
        
        const url = buildApiUrl(sodularClient.baseUrl, '/files/download', buildQueryParams(queryParams));
        
        try {
            const headers: HeadersInit = {};
            if (sodularClient.accessToken) {
                headers['Authorization'] = `Bearer ${sodularClient.accessToken}`;
            }

            const response = await fetch(url, { headers });

            if (!response.ok) {
                let errorJson;
                try {
                    errorJson = await response.json();
                } catch (e) {
                    // Not a JSON error
                }
                throw new Error(errorJson?.error || `Request failed with status ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const contentLength = +(response.headers.get('Content-Length') || 0);
            let receivedLength = 0;
            let index = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                receivedLength += value.length;
                const percentage = contentLength > 0 ? Math.round((receivedLength / contentLength) * 100) : 0;
                const chunkData = options.type === 'arraybuffer' ? value.buffer : new Blob([value]);

                onDataCallback({
                    data: chunkData,
                    chunkSize: value.length,
                    index: index++,
                    total: contentLength,
                    percentage,
                });
            }

            onFinishCallback();
        } catch (error: any) {
            onErrorCallback(error);
        }
    })();

    return {
      onData: (cb) => { onDataCallback = cb; },
      onFinish: (cb) => { onFinishCallback = cb; },
      onError: (cb) => { onErrorCallback = cb; },
    };
  }


  async get(options: { filter: any; select?: any }): Promise<ApiResponse<FileSchema>> {
    return this.client.request('GET', '/files', { params: options });
  }

  async query(options: QueryOptions): Promise<ApiResponse<{ list: FileSchema[]; total: number }>> {
    return this.client.request('GET', '/files/query', { params: options });
  }

  async patch(filter: any, data: UpdateFileRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request('PATCH', '/files', { params: { filter }, data });
  }

  async delete(filter: any, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    return this.client.request('DELETE', '/files', { params: { filter, options } });
  }
}
