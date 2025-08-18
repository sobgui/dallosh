/**
 * Buckets Schema - Unified schema for bucket management
 * This schema is absolutely unified across database, backend and frontend
 */

export interface BucketData {
  name: string; // required and unique within storage
  description?: string;
  storage_id: string; // reference to storage uid
  [key: string]: any; // for additional metadata
}

export interface BucketSchema {
  uid: string; // unique
  data: BucketData;
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
export interface CreateBucketRequest {
  uid?: string;
  data: BucketData;
  createdBy?: 'system' | string;
}

export interface UpdateBucketRequest {
  uid?: string;
  data?: Partial<BucketData>;
  updatedBy?: 'system' | string;
  deletedBy?: 'system' | string;
  isDeleted?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string;
} 