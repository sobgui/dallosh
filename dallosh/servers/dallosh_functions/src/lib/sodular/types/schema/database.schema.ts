// Database Schema - Must match backend exactly
export interface DatabaseData {
  name: string;
  description?: string;
}

export interface Database {
  uid: string;
  data: DatabaseData;
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

export interface CreateDatabaseRequest {
  uid?: string;
  data: DatabaseData;
  createdBy?: string;
}

export interface UpdateDatabaseRequest {
  uid?: string;
  data?: Partial<DatabaseData>;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedBy?: string | 'system';
  isLocked?: boolean;
  lockedBy?: string | 'system';
}
