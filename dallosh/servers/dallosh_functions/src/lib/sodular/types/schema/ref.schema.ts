// Ref Schema - Must match backend exactly
export interface Ref {
  uid: string;
  data: any; // JSON data - can be any object
  createdAt: number;
  createdBy: string | 'system';
  updatedAt: number;
  updatedBy: string | 'system';
  deletedAt?: number;
  isDeleted?: boolean;
  deletedBy?: string | 'system';
  lockedAt?: number;
  isLocked?: boolean;
  lockedBy?: string | 'system';
}

export interface CreateRefRequest {
  uid?: string;
  data: any;
  createdBy?: string;
}

export interface UpdateRefRequest {
  uid?: string;
  data?: any;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedBy?: string | 'system';
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: string | 'system';
}
