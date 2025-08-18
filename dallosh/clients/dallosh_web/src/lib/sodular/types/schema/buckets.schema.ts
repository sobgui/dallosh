export interface BucketData {
  name: string;
  description?: string;
  storage_id: string;
  [key: string]: any;
}

export interface BucketSchema {
  uid: string;
  data: BucketData;
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
