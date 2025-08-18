export interface StorageData {
  name: string;
  description?: string;
  type: 'local' | 'aws' | 'azure' | 'gcp' | 'ftp';
  [key: string]: any;
}

export interface StorageSchema {
  uid: string;
  data: StorageData;
  createdAt: number;
  createdBy: 'system' | string;
  updatedAt: number;
  updatedBy: 'system' | string;
  deletedAt?: number;
  isDeleted?: boolean;
  deletedBy?: 'system' | string;
  lockedAt?: number;
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string;
}

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
