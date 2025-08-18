import { UploadParams, DownloadParams, DeleteParams, ReadStreamParams, FileRecord, UploadProgressCallback, DownloadProgressCallback, DataCallback, FinishCallback, ErrorCallback } from '../types';

export abstract class StorageAdapter {
  abstract upload(params: UploadParams): Promise<{
    onUpload: (cb: UploadProgressCallback) => void;
    onFinish: (cb: FinishCallback<FileRecord>) => void;
    onError: (cb: ErrorCallback) => void;
  }>;

  abstract download(params: DownloadParams, fileRecord: FileRecord): Promise<{
    onDownload: (cb: DownloadProgressCallback) => void;
    onFinish: (cb: FinishCallback<void>) => void;
    onError: (cb: ErrorCallback) => void;
  }>;

  abstract delete(params: DeleteParams): Promise<{ value?: FileRecord; error?: string }>;

  abstract readStream(params: ReadStreamParams): {
    onData: (cb: DataCallback) => void;
    onFinish: (cb: FinishCallback<void>) => void;
    onError: (cb: ErrorCallback) => void;
  };

  // Optionally, add connect/disconnect if needed for remote providers
  async connect?(): Promise<void> {}
  async disconnect?(): Promise<void> {}
} 