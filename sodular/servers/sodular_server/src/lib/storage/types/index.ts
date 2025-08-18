// Core types for Sodular Storage

export interface FilePart {
  uid: string;
  ext: string;
  order: number;
  size: number;
  path: string;
  length: number;
}

export interface FileRecord {
  uid: string;
  data: {
    bucket_id: string;
    filename: string;
    length: number;
    parts: FilePart[];
    path: string;
    size: number;
    ext: string;
    type: string;
    downloadUrl: string;
    [key: string]: any;
  };
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
  isLocked?: boolean;
}

export interface UploadParams {
  storage_id: string;
  bucket_id: string;
  file: string | any; // string | ExpressRequest | ReadStream | Buffer
  metadata?: string[];
}

export interface DownloadParams {
  storage_id: string;
  bucket_id: string;
  file_id: string;
  parts?: FilePart[];
  location?: string | any; // string | ExpressResponse
  range?: { start: number; end: number };
}

export interface DeleteParams {
  storage_id: string;
  bucket_id: string;
  parts?: FilePart[];
}

export interface ReadStreamParams {
  storage_id: string;
  bucket_id: string;
  parts?: FilePart[];
}

export type UploadProgressCallback = (data: any, index: number, total: number, size: number, percentage: number) => void;
export type DownloadProgressCallback = (progress: { fileInfo: FileRecord; index: number; total: number; size: number; percentage: number }) => void;
export type DataCallback = (data: Buffer) => void;
export type FinishCallback<T = void> = (result?: T) => void;
export type ErrorCallback = (error: Error) => void; 