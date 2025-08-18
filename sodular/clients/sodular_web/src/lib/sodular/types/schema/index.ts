// Export all schemas
export * from './users.schema';
export * from './database.schema';
export * from './tables.schema';
export * from './ref.schema';
export * from './schemas.schema';
export * from './storage.schema';
export * from './buckets.schema';
export * from './files.schema';

// Common types used across all schemas
export interface ApiResponse<T = any> {
  error?: string;
  data?: T;
}

export interface QueryOptions {
  filter?: Record<string, any>;
  select?: string[];
  sort?: Record<string, 'asc' | 'desc' | 1 | -1>;
  take?: number;
  skip?: number;
}

export interface QueryResult<T = any> {
  list: T[];
  total: number;
}

export interface CountResult {
  total: number;
}

export interface UpdateResult {
  list: Array<{ uid: string }>;
  total: number;
}

export interface DeleteOptions {
  withSoftDelete?: boolean;
  deletedBy?: string;
}

export interface DeleteResult {
  list: Array<{ uid: string }>;
  total: number;
}
