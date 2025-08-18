/**
 * MongoDB Tables Adapter - Manages tables/collections
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { BaseTables } from '../../base';
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
import { TableSchema, CreateTableRequest, UpdateTableRequest } from '@/types/schema/tables.schema';
import { 
  generateUid, 
  getCurrentTimestamp, 
  convertFilter, 
  convertSort,
  buildTableName,
  validateRequired
} from '../../utils';

export class MongoTablesAdapter implements BaseTables<TableSchema, CreateTableRequest, UpdateTableRequest> {
  private db: Db;
  private maxQueryLimit: number;
  private readonly TABLES_COLLECTION = 'tables_records';

  constructor(db: Db, maxQueryLimit: number = 50) {
    this.db = db;
    this.maxQueryLimit = maxQueryLimit;
  }

  /**
   * Check if a table exists
   */
  async exists(tableId: string): Promise<boolean> {
    try {
      const tableName = buildTableName(tableId);
      const collections = await this.db.listCollections({ name: tableName }).toArray();
      return collections.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the tables records collection
   */
  private getTablesCollection(): Collection {
    return this.db.collection(this.TABLES_COLLECTION);
  }

  /**
   * Create a new table
   */
  async create(request: CreateTableRequest): Promise<DatabaseResult<TableSchema>> {
    try {
      // Validate required fields
      const validationError = validateRequired(request.data, ['name']);
      if (validationError) {
        return { error: validationError };
      }

      const collection = this.getTablesCollection();
      const timestamp = getCurrentTimestamp();
      
      // Check if table name already exists
      const existingTable = await collection.findOne({ 'data.name': request.data.name });
      if (existingTable) {
        return { error: `Table with name '${request.data.name}' already exists` };
      }

      const tableRecord: TableSchema = {
        uid: generateUid(request.uid),
        data: request.data,
        createdAt: timestamp,
        createdBy: request.createdBy || 'system',
        updatedAt: timestamp,
        updatedBy: request.createdBy || 'system'
      };

      // Add all root-level fields from request (except special/system ones) to tableRecord
      for (const key of Object.keys(request)) {
        if (!['data', 'uid', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'].includes(key)) {
          (tableRecord as any)[key] = (request as any)[key];
        }
      }

      // Insert table record
      await collection.insertOne(tableRecord);

      // Create the actual collection/table
      const tableName = buildTableName(tableRecord.uid);
      await this.db.createCollection(tableName);
      
      return { value: tableRecord };
    } catch (error) {
      return { error: `Failed to create table: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Get a single table
   */
  async get(options: GetOptions): Promise<DatabaseResult<TableSchema>> {
    try {
      const collection = this.getTablesCollection();
      const filter = convertFilter(options.filter || {});
      
      const projection = options.select ? 
        options.select.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}) : 
        {};

      const table = await collection.findOne(filter, { projection });
      
      if (!table) {
        return { error: 'Table not found' };
      }

      return { value: table as unknown as TableSchema };
    } catch (error) {
      return { error: `Failed to get table: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Query multiple tables
   */
  async query(options: QueryOptions): Promise<DatabaseResult<QueryResult<TableSchema>>> {
    try {
      const collection = this.getTablesCollection();
      const filter = convertFilter(options.filter || {});
      const sort = convertSort(options.sort);
      const limit = Math.min(options.take || this.maxQueryLimit, this.maxQueryLimit);
      const skip = options.skip || 0;
      
      const projection = options.select ? 
        options.select.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}) : 
        {};

      const [tables, total] = await Promise.all([
        collection.find(filter, { projection })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        value: {
          list: tables as unknown as TableSchema[],
          total
        }
      };
    } catch (error) {
      return { error: `Failed to query tables: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Count tables
   */
  async count(options: CountOptions): Promise<DatabaseResult<CountResult>> {
    try {
      const collection = this.getTablesCollection();
      const filter = convertFilter(options.filter || {});
      
      const total = await collection.countDocuments(filter);
      
      return { value: { total } };
    } catch (error) {
      return { error: `Failed to count tables: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Replace tables (PUT)
   */
  async put(filter: Filter, request: UpdateTableRequest): Promise<DatabaseResult<BulkResult>> {
    try {
      const collection = this.getTablesCollection();
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
      
      // Get the updated table IDs
      const updatedTables = await collection.find(mongoFilter, { projection: { uid: 1 } }).toArray();
      
      return {
        value: {
          list: updatedTables.map(table => ({ uid: table.uid })),
          total: result.modifiedCount
        }
      };
    } catch (error) {
      return { error: `Failed to update tables: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Patch tables (PATCH) - merge with existing data
   */
  async patch(filter: Filter, request: UpdateTableRequest): Promise<DatabaseResult<BulkResult>> {
    try {
      const collection = this.getTablesCollection();
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
        const existingTables = await collection.find(mongoFilter).toArray();
        for (const table of existingTables) {
          const mergedData = { ...table.data, ...request.data };
          await collection.updateOne(
            { _id: table._id },
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

      // Get the updated table IDs
      const updatedTables = await collection.find(mongoFilter, { projection: { uid: 1 } }).toArray();
      
      return {
        value: {
          list: updatedTables.map(table => ({ uid: table.uid })),
          total: updatedTables.length
        }
      };
    } catch (error) {
      return { error: `Failed to patch tables: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Delete tables
   */
  async delete(filter: Filter, options?: DeleteOptions): Promise<DatabaseResult<BulkResult>> {
    try {
      const collection = this.getTablesCollection();
      const mongoFilter = convertFilter(filter);

      // Get table IDs before deletion
      const tablesToDelete = await collection.find(mongoFilter, { projection: { uid: 1 } }).toArray();
      
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
            list: tablesToDelete.map(table => ({ uid: table.uid })),
            total: result.modifiedCount
          }
        };
      } else {
        // Hard delete - also drop the actual collections
        for (const table of tablesToDelete) {
          const tableName = buildTableName(table.uid);
          try {
            await this.db.collection(tableName).drop();
          } catch (error) {
            // Collection might not exist, continue
          }
        }

        const result = await collection.deleteMany(mongoFilter);
        
        return {
          value: {
            list: tablesToDelete.map(table => ({ uid: table.uid })),
            total: result.deletedCount
          }
        };
      }
    } catch (error) {
      return { error: `Failed to delete tables: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}
