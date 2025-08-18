/**
 * Database Library Types - Core types for database agnostic operations
 */

// Database operation result type
export interface DatabaseResult<T = any> {
  value?: T;
  error?: string;
}

// Query result types
export interface QueryResult<T = any> {
  list: T[];
  total: number;
}

export interface CountResult {
  total: number;
}

export interface BulkResult {
  list: Array<{ uid: string }>;
  total: number;
}

// Filter types for MongoDB-like queries
export interface FilterCondition {
  $like?: string;
  $reg?: string;
  $flags?: string;
  $gt?: any;
  $gte?: any;
  $lt?: any;
  $lte?: any;
  $eq?: any;
  $ne?: any;
  $in?: any[];
  $nin?: any[];
}

export interface Filter {
  [key: string]: any | FilterCondition | {
    $or?: Filter[];
    $and?: Filter[];
  };
}

// Query options
export interface QueryOptions {
  filter?: Filter;
  select?: string[];
  sort?: Record<string, 'asc' | 'desc' | 1 | -1>;
  take?: number;
  skip?: number;
}

export interface GetOptions {
  filter?: Filter;
  select?: string[];
}

export interface CountOptions {
  filter?: Filter;
}

// Delete options
export interface DeleteOptions {
  withSoftDelete?: boolean;
  deletedBy?: 'system' | string;
}

// Database configuration
export interface DatabaseConfig {
  type: 'mongodb' | 'mysql' | 'postgresql' | 'sqlite';
  database: {
    host: string;
    port: number;
    dbName: string;
  };
  auth?: {
    user: string;
    password: string;
  };
  maxQueryLimit: number;
  mode: 'development' | 'production' | 'test';
}

// Connection result
export interface ConnectionResult {
  isReady: boolean;
  error?: string;
  database?: any;
}
