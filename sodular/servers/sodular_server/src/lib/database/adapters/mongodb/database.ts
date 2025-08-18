/**
 * MongoDB Database Adapter - Main database instance
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { BaseDatabase } from '../../base';
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
} from '../../types';
import { DatabaseSchema, CreateDatabaseRequest, UpdateDatabaseRequest } from '@/types/schema/database.schema';
import { MongoTablesAdapter } from './tables';
import { MongoRefAdapter } from './ref';
import { 
  generateUid, 
  getCurrentTimestamp, 
  convertFilter, 
  convertSort,
  buildDatabaseName,
  validateRequired
} from '../../utils';

export class MongoDatabaseAdapter implements BaseDatabase<DatabaseSchema, CreateDatabaseRequest, UpdateDatabaseRequest> {
  private client: MongoClient;
  private currentDb: Db;
  private primaryDbName: string;
  private maxQueryLimit: number;
  private _isReady: boolean = false;
  private _tables: MongoTablesAdapter;
  private _ref: MongoRefAdapter;
  private _currentDatabaseId?: string;
  
  private readonly DATABASE_COLLECTION = 'database_records';

  constructor(client: MongoClient, primaryDbName: string, maxQueryLimit: number = 50) {
    this.client = client;
    this.primaryDbName = primaryDbName;
    this.maxQueryLimit = maxQueryLimit;
    this.currentDb = client.db(primaryDbName);
    this._isReady = true;
    
    // Initialize sub-adapters
    this._tables = new MongoTablesAdapter(this.currentDb, maxQueryLimit);
    this._ref = new MongoRefAdapter(this.currentDb, maxQueryLimit);
  }

  /**
   * Check if ready
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Get tables instance
   */
  get tables(): MongoTablesAdapter {
    return this._tables;
  }

  /**
   * Get ref instance
   */
  get ref(): MongoRefAdapter {
    return this._ref;
  }

  /**
   * Check if a database exists
   */
  async exists(databaseId: string): Promise<boolean> {
    try {
      const dbName = buildDatabaseName(this.primaryDbName, databaseId);
      const adminDb = this.client.db('admin');
      const databases = await adminDb.admin().listDatabases();
      return databases.databases.some(db => db.name === dbName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Switch to a different database (permanently changes context)
   */
  async use(databaseId: string): Promise<void> {
    try {
      const dbName = buildDatabaseName(this.primaryDbName, databaseId);
      this.currentDb = this.client.db(dbName);
      this._isReady = true;

      // Update sub-adapters with new database
      this._tables = new MongoTablesAdapter(this.currentDb, this.maxQueryLimit);
      this._ref = new MongoRefAdapter(this.currentDb, this.maxQueryLimit);
    } catch (error) {
      this._isReady = false;
      throw new Error(`Failed to switch to database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a temporary database context without changing the current context
   */
  getTemporaryContext(databaseId?: string): MongoDatabaseAdapter {
    const dbName = databaseId ? buildDatabaseName(this.primaryDbName, databaseId) : this.primaryDbName;
    const tempDb = this.client.db(dbName);

    // Create a temporary adapter instance
    const tempAdapter = new MongoDatabaseAdapter(this.client, this.primaryDbName, this.maxQueryLimit);
    tempAdapter.currentDb = tempDb;
    tempAdapter._isReady = true;
    tempAdapter._tables = new MongoTablesAdapter(tempDb, this.maxQueryLimit);
    tempAdapter._ref = new MongoRefAdapter(tempDb, this.maxQueryLimit);

    return tempAdapter;
  }

  /**
   * Reset to primary database
   */
  resetToPrimary(): void {
    this.currentDb = this.client.db(this.primaryDbName);
    this._isReady = true;
    this._tables = new MongoTablesAdapter(this.currentDb, this.maxQueryLimit);
    this._ref = new MongoRefAdapter(this.currentDb, this.maxQueryLimit);
  }

  /**
   * Get the database records collection
   */
  private getDatabaseCollection(): Collection {
    return this.currentDb.collection(this.DATABASE_COLLECTION);
  }

  /**
   * Create a new database
   */
  async create(request: CreateDatabaseRequest): Promise<DatabaseResult<DatabaseSchema>> {
    try {
      // Validate required fields
      const validationError = validateRequired(request.data, ['name']);
      if (validationError) {
        return { error: validationError };
      }

      const collection = this.getDatabaseCollection();
      const timestamp = getCurrentTimestamp();
      
      // Check if database name already exists
      const existingDb = await collection.findOne({ 'data.name': request.data.name });
      if (existingDb) {
        return { error: `Database with name '${request.data.name}' already exists` };
      }

      const databaseRecord: DatabaseSchema = {
        uid: generateUid(request.uid),
        data: request.data,
        createdAt: timestamp,
        createdBy: request.createdBy || 'system',
        updatedAt: timestamp,
        updatedBy: request.createdBy || 'system'
      };

      // Add all root-level fields from request (except special/system ones) to databaseRecord
      for (const key of Object.keys(request)) {
        if (!['data', 'uid', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'].includes(key)) {
          (databaseRecord as any)[key] = (request as any)[key];
        }
      }

      // Insert database record
      await collection.insertOne(databaseRecord);

      // Create the actual database with default collections
      const newDbName = buildDatabaseName(this.primaryDbName, databaseRecord.uid);
      const newDb = this.client.db(newDbName);
      
      // Create default collections
      await newDb.createCollection('database_records');
      await newDb.createCollection('tables_records');
      
      return { value: databaseRecord };
    } catch (error) {
      return { error: `Failed to create database: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Get a single database
   */
  async get(options: GetOptions): Promise<DatabaseResult<DatabaseSchema>> {
    try {
      const collection = this.getDatabaseCollection();
      const filter = convertFilter(options.filter || {});
      
      const projection = options.select ? 
        options.select.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}) : 
        {};

      const database = await collection.findOne(filter, { projection });
      
      if (!database) {
        return { error: 'Database not found' };
      }

      return { value: database as unknown as DatabaseSchema };
    } catch (error) {
      return { error: `Failed to get database: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Query multiple databases
   */
  async query(options: QueryOptions): Promise<DatabaseResult<QueryResult<DatabaseSchema>>> {
    try {
      const collection = this.getDatabaseCollection();
      const filter = convertFilter(options.filter || {});
      const sort = convertSort(options.sort);
      const limit = Math.min(options.take || this.maxQueryLimit, this.maxQueryLimit);
      const skip = options.skip || 0;
      
      const projection = options.select ? 
        options.select.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}) : 
        {};

      const [databases, total] = await Promise.all([
        collection.find(filter, { projection })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        value: {
          list: databases as unknown as DatabaseSchema[],
          total
        }
      };
    } catch (error) {
      return { error: `Failed to query databases: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Count databases
   */
  async count(options: CountOptions): Promise<DatabaseResult<CountResult>> {
    try {
      const collection = this.getDatabaseCollection();
      const filter = convertFilter(options.filter || {});
      
      const total = await collection.countDocuments(filter);
      
      return { value: { total } };
    } catch (error) {
      return { error: `Failed to count databases: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Replace databases (PUT)
   */
  async put(filter: Filter, request: UpdateDatabaseRequest): Promise<DatabaseResult<BulkResult>> {
    try {
      const collection = this.getDatabaseCollection();
      const mongoFilter = convertFilter(filter);
      const timestamp = getCurrentTimestamp();

      const updateDoc: any = {
        updatedAt: timestamp,
        updatedBy: request.updatedBy || 'system'
      };

      // Add all root-level fields from request (except special/system ones) to updateDoc
      for (const key of Object.keys(request)) {
        if (!['data', 'isDeleted', 'isLocked', 'updatedAt', 'updatedBy'].includes(key)) {
          updateDoc[key] = (request as any)[key];
        }
      }

      const result = await collection.updateMany(mongoFilter, { $set: updateDoc });
      
      // Get the updated database IDs
      const updatedDatabases = await collection.find(mongoFilter, { projection: { uid: 1 } }).toArray();
      
      return {
        value: {
          list: updatedDatabases.map(db => ({ uid: db.uid })),
          total: result.modifiedCount
        }
      };
    } catch (error) {
      return { error: `Failed to update databases: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Patch databases (PATCH) - merge with existing data
   */
  async patch(filter: Filter, request: UpdateDatabaseRequest): Promise<DatabaseResult<BulkResult>> {
    try {
      const collection = this.getDatabaseCollection();
      const mongoFilter = convertFilter(filter);
      const timestamp = getCurrentTimestamp();

      const updateDoc: any = {
        updatedAt: timestamp,
        updatedBy: request.updatedBy || 'system'
      };

      // Add all root-level fields from request (except special/system ones) to updateDoc
      for (const key of Object.keys(request)) {
        if (!['data', 'isDeleted', 'isLocked', 'updatedAt', 'updatedBy'].includes(key)) {
          updateDoc[key] = (request as any)[key];
        }
      }

      // For PATCH, we merge with existing data
      if (request.data !== undefined) {
        // Deep merge the data field
        const existingDatabases = await collection.find(mongoFilter).toArray();
        for (const db of existingDatabases) {
          const mergedData = { ...db.data, ...request.data };
          await collection.updateOne(
            { _id: db._id },
            { $set: { ...updateDoc, data: mergedData } }
          );
        }
      } else {
        await collection.updateMany(mongoFilter, { $set: updateDoc });
      }

      if (request.isDeleted !== undefined) {
        updateDoc.isDeleted = request.isDeleted;
        if (request.isDeleted) {
          updateDoc.deletedAt = timestamp;
          updateDoc.deletedBy = request.deletedBy || 'system';
        }
      }

      if (request.isLocked !== undefined) {
        updateDoc.isLocked = request.isLocked;
        if (request.isLocked) {
          updateDoc.lockedAt = timestamp;
          updateDoc.lockedBy = request.lockedBy || 'system';
        }
      }

      // Get the updated database IDs
      const updatedDatabases = await collection.find(mongoFilter, { projection: { uid: 1 } }).toArray();
      
      return {
        value: {
          list: updatedDatabases.map(db => ({ uid: db.uid })),
          total: updatedDatabases.length
        }
      };
    } catch (error) {
      return { error: `Failed to patch databases: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Delete databases
   */
  async delete(filter: Filter, options?: DeleteOptions): Promise<DatabaseResult<BulkResult>> {
    try {
      const collection = this.getDatabaseCollection();
      const mongoFilter = convertFilter(filter);

      // Get database IDs before deletion
      const databasesToDelete = await collection.find(mongoFilter, { projection: { uid: 1 } }).toArray();
      
      if (options?.withSoftDelete) {
        // Soft delete - set isDeleted flag
        const timestamp = getCurrentTimestamp();
        const result = await collection.updateMany(mongoFilter, {
          $set: {
            isDeleted: true,
            deletedAt: timestamp,
            deletedBy: options.deletedBy || 'system',
            updatedAt: timestamp,
            updatedBy: options.deletedBy || 'system'
          }
        });

        return {
          value: {
            list: databasesToDelete.map(db => ({ uid: db.uid })),
            total: result.modifiedCount
          }
        };
      } else {
        // Hard delete - also drop the actual databases
        for (const db of databasesToDelete) {
          const dbName = buildDatabaseName(this.primaryDbName, db.uid);
          try {
            await this.client.db(dbName).dropDatabase();
          } catch (error) {
            // Database might not exist, continue
          }
        }

        const result = await collection.deleteMany(mongoFilter);
        
        return {
          value: {
            list: databasesToDelete.map(db => ({ uid: db.uid })),
            total: result.deletedCount
          }
        };
      }
    } catch (error) {
      return { error: `Failed to delete databases: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  get currentDatabaseId(): string | undefined {
    return this._currentDatabaseId;
  }
  set currentDatabaseId(id: string | undefined) {
    this._currentDatabaseId = id;
  }
}
