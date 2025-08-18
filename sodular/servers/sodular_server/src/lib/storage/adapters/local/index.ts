import { StorageAdapter } from '../../base';
import { UploadParams, DownloadParams, DeleteParams, ReadStreamParams, FileRecord, UploadProgressCallback, DownloadProgressCallback, DataCallback, FinishCallback, ErrorCallback } from '../../types';
import { LocalUploadHandler } from './upload';
import { LocalDownloadHandler } from './download';
import { LocalDeleteHandler } from './delete';
import * as fs from 'fs';
import { joinPath } from '@/lib/storage/utils';
import { Logger } from '@/core/utils';

export class LocalStorageAdapter extends StorageAdapter {
  private uploadHandler: LocalUploadHandler;
  private downloadHandler: LocalDownloadHandler;
  private deleteHandler: LocalDeleteHandler;
  private config: any;

  constructor(config: any) {
    super();
    // Deep clone and sanitize config
    this.config = JSON.parse(JSON.stringify(config || {}));
    if (this.config && typeof this.config.prefix !== 'string') {
      this.config.prefix = String(this.config.prefix || '');
    }
    Logger.debug('[LocalStorageAdapter] constructor config:', {
      prefix: this.config.prefix,
      localStoragePath: this.config.localStoragePath
    });
    this.uploadHandler = new LocalUploadHandler(this.config);
    this.downloadHandler = new LocalDownloadHandler(this.config);
    this.deleteHandler = new LocalDeleteHandler(this.config);
  }

  async upload(params: UploadParams): Promise<{
    onUpload: (cb: UploadProgressCallback) => void;
    onFinish: (cb: FinishCallback<FileRecord>) => void;
    onError: (cb: ErrorCallback) => void;
  }> {
    return this.uploadHandler.upload(params);
  }

  async download(params: DownloadParams, fileRecord: FileRecord) {
    if (!params || !params.storage_id || !params.bucket_id || !params.file_id) {
      throw new Error('Missing required params for download');
    }
    if (!fileRecord) {
      throw new Error('FileRecord is required for download');
    }
    return this.downloadHandler.download(params, fileRecord);
  }

  async delete(params: DeleteParams) {
    if (!params || !params.parts) {
      throw new Error('Parts must be provided for deletion');
    }
    const result = await this.deleteHandler.delete(params);
    if (result.error) {
      const errorMsg = Array.isArray(result.error) ? result.error.join('; ') : String(result.error);
      Logger.error('LocalStorageAdapter.delete error', errorMsg);
      throw new Error(errorMsg);
    }
    return { value: undefined, error: result.error };
  }

  readStream(params: ReadStreamParams) {
    if (!params || !params.storage_id || !params.bucket_id || !params.parts || params.parts.length === 0) {
      throw new Error('Missing required params for readStream');
    }
    const parts = params.parts;
    let onDataCb: DataCallback | undefined;
    let onFinishCb: FinishCallback<void> | undefined;
    let onErrorCb: ErrorCallback | undefined;
    (async () => {
      try {
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const readStream = fs.createReadStream(part.path);
          readStream.on('data', (chunk: Buffer | string) => {
            if (onDataCb) onDataCb(chunk as Buffer);
          });
          await new Promise<void>((resolve, reject) => {
            readStream.on('end', () => resolve());
            readStream.on('error', reject);
          });
        }
        if (onFinishCb) onFinishCb();
      } catch (err: any) {
        if (onErrorCb) onErrorCb(err);
      }
    })();
    return {
      onData: (cb: DataCallback) => { onDataCb = cb; },
      onFinish: (cb: FinishCallback<void>) => { onFinishCb = cb; },
      onError: (cb: ErrorCallback) => { onErrorCb = cb; },
    };
  }
} 