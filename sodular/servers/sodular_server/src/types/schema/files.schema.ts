/**
 * Files Schema - Unified schema for file management
 * This schema is absolutely unified across database, backend and frontend
 */

export interface FilePart {
  order: number;
  file_id: string;
  ext: string;
  size: number;
  file_path: string;
}

export interface FileData {
  name: string;
  description?: string;
  bucket_id: string; // reference to bucket uid
  filename: string;
  part: FilePart[];
  path: string; // physical path
  file_path: string; // logical path for user
  size: number;
  ext: string;
  type: string;
  downloadUrl: string;
  [key: string]: any; // for additional metadata
}

export interface FileSchema {
  uid: string; // unique
  data: FileData;
  isActive?: boolean;
  isLocked?: boolean;
  createdAt: number; // timestamp
  createdBy: 'system' | string; // user_id
  updatedAt: number; // timestamp
  updatedBy: 'system' | string; // user_id
  deletedAt?: number; // timestamp
  isDeleted?: boolean;
  deletedBy?: 'system' | string; // user_id
  lockedAt?: number; // timestamp
  lockedBy?: 'system' | string; // user_id
}

// For API requests
export interface CreateFileRequest {
  uid?: string;
  data: FileData;
  createdBy?: 'system' | string;
}

export interface UpdateFileRequest {
  uid?: string;
  data?: Partial<FileData>;
  updatedBy?: 'system' | string;
  deletedBy?: 'system' | string;
  isDeleted?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string;
} 