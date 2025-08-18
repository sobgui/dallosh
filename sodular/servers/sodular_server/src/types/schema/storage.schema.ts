/**
 * Storage Schema - Unified schema for storage management
 * This schema is absolutely unified across database, backend and frontend
 */

export interface StorageData {
  name: string; // required and unique
  description?: string;
  type: 'local' | 'aws' | 'azure' | 'gcp' | 'ftp';
  [key: string]: any; // for configs like localStoragePath, prefix, etc.
}

export interface StorageSchema {
  uid: string; // unique
  data: StorageData;
  createdAt: number; // timestamp
  createdBy: 'system' | string; // user_id
  updatedAt: number; // timestamp
  updatedBy: 'system' | string; // user_id
  deletedAt?: number; // timestamp
  isDeleted?: boolean;
  deletedBy?: 'system' | string; // user_id
  lockedAt?: number; // timestamp
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string; // user_id
}

// For API requests
export interface CreateStorageRequest {
  uid?: string;
  data: StorageData;
  createdBy?: 'system' | string;
}

export interface UpdateStorageRequest {
  uid?: string;
  data?: Partial<StorageData>;
  updatedBy?: 'system' | string;
  deletedBy?: 'system' | string;
  isDeleted?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string;
} 