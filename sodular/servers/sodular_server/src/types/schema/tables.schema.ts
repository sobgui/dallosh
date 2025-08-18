/**
 * Tables Schema - Unified schema for table/collection management
 * This schema is absolutely unified across database, backend and frontend
 */

export interface TableData {
  name: string; // required and unique
  description?: string;
  [key: string]: any;
}

export interface TableSchema {
  uid: string; // unique
  data: TableData;
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
export interface CreateTableRequest {
  uid?: string;
  data: TableData;
  createdBy?: 'system' | string;
  isActive?: boolean;
}

export interface UpdateTableRequest {
  uid?: string;
  data?: Partial<TableData>;
  updatedBy?: 'system' | string;
  deletedBy?: 'system' | string;
  isDeleted?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string;
}
