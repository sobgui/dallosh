/**
 * Base Database Adapter Interface
 * All database adapters must implement these interfaces
 */

import { 
  DatabaseResult, 
  QueryResult, 
  CountResult, 
  BulkResult,
  QueryOptions,
  GetOptions,
  CountOptions,
  DeleteOptions,
  Filter
} from '../types';

// Base CRUD operations interface
export interface BaseCRUD<TSchema = any, TCreateRequest = any, TUpdateRequest = any> {
  create(request: TCreateRequest): Promise<DatabaseResult<TSchema>>;
  get(options: GetOptions): Promise<DatabaseResult<TSchema>>;
  query(options: QueryOptions): Promise<DatabaseResult<QueryResult<TSchema>>>;
  count(options: CountOptions): Promise<DatabaseResult<CountResult>>;
  put(filter: Filter, request: TUpdateRequest): Promise<DatabaseResult<BulkResult>>;
  patch(filter: Filter, request: TUpdateRequest): Promise<DatabaseResult<BulkResult>>;
  delete(filter: Filter, options?: DeleteOptions): Promise<DatabaseResult<BulkResult>>;
}

// Ref interface with table selection
export interface BaseRef<TSchema = any, TCreateRequest = any, TUpdateRequest = any> 
  extends BaseCRUD<TSchema, TCreateRequest, TUpdateRequest> {
  from(tableId: string): BaseRef<TSchema, TCreateRequest, TUpdateRequest>;
}

// Tables interface with exists check
export interface BaseTables<TSchema = any, TCreateRequest = any, TUpdateRequest = any> 
  extends BaseCRUD<TSchema, TCreateRequest, TUpdateRequest> {
  exists(tableId: string): Promise<boolean>;
}

// Database interface with database management
export interface BaseDatabase<TSchema = any, TCreateRequest = any, TUpdateRequest = any> 
  extends BaseCRUD<TSchema, TCreateRequest, TUpdateRequest> {
  // Database management
  exists(databaseId: string): Promise<boolean>;
  use(databaseId: string): Promise<void>;
  isReady: boolean;
  
  // Sub-instances
  tables: BaseTables<any, any, any>;
  ref: BaseRef<any, any, any>;
}

// Main database adapter interface
export interface DatabaseAdapter {
  connect(): Promise<{
    isReady: boolean;
    error?: string;
    database?: BaseDatabase<any, any, any>;
  }>;
}
