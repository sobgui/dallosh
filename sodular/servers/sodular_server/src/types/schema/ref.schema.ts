/**
 * Ref Schema - Unified schema for document/row management
 * This schema is absolutely unified across database, backend and frontend
 */

export interface RefSchema {
  uid: string;
  data: any; // JSON - can be any object
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
export interface CreateRefRequest {
  uid?: string;
  data: any; // JSON object
  createdBy?: 'system' | string;
  isActive?: boolean;
}

export interface UpdateRefRequest {
  uid?: string;
  data?: any; // JSON object
  updatedBy?: 'system' | string;
  deletedBy?: 'system' | string;
  isDeleted?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string;
}
