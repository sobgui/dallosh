/**
 * Database Schema - Unified schema for database management
 * This schema is absolutely unified across database, backend and frontend
 */

export interface DatabaseData {
  name: string; // required
  description?: string;
}

export interface DatabaseSchema {
  uid: string;
  data: DatabaseData;
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
export interface CreateDatabaseRequest {
  uid?: string;
  data: DatabaseData;
  createdBy?: 'system' | string;
  isActive?: boolean;
}

export interface UpdateDatabaseRequest {
  uid?: string;
  data?: Partial<DatabaseData>;
  updatedBy?: 'system' | string;
  deletedBy?: 'system' | string;
  isDeleted?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string;
}
