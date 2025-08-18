// Unified Files Schema for SodularClient SDK

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
  bucket_id: string;
  filename: string;
  part: FilePart[];
  path: string;
  file_path: string;
  size: number;
  ext: string;
  type: string;
  downloadUrl: string;
  [key: string]: any;
}

export interface FileSchema {
  uid: string;
  data: FileData;
  isActive?: boolean;
  isLocked?: boolean;
  createdAt: number;
  createdBy: 'system' | string;
  updatedAt: number;
  updatedBy: 'system' | string;
  deletedAt?: number;
  isDeleted?: boolean;
  deletedBy?: 'system' | string;
  lockedAt?: number;
  lockedBy?: 'system' | string;
}

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