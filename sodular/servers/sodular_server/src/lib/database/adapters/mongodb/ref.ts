/**
 * MongoDB Ref Adapter - Manages documents/rows in collections
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { BaseRef } from '../../base';
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
import { RefSchema, CreateRefRequest, UpdateRefRequest } from '@/types/schema/ref.schema';
import { 
  generateUid, 
  getCurrentTimestamp, 
  convertFilter, 
  convertSort,
  buildTableName,
  validateRequired
} from '../../utils';

export class MongoRefAdapter implements BaseRef<RefSchema, CreateRefRequest, UpdateRefRequest> {
  private db: Db;
  private currentTableId?: string;
  private maxQueryLimit: number;

  constructor(db: Db, maxQueryLimit: number = 50) {
    this.db = db;
    this.maxQueryLimit = maxQueryLimit;
  }

  /**
   * Set the table/collection to work with
   */
  from(tableId: string): BaseRef<RefSchema, CreateRefRequest, UpdateRefRequest> {
    const newInstance = new MongoRefAdapter(this.db, this.maxQueryLimit);
    newInstance.currentTableId = tableId;
    return newInstance;
  }

  /**
   * Get the current collection
   */
  private getCollection(): Collection {
    if (!this.currentTableId) {
      throw new Error('Table ID not set. Use from(tableId) first.');
    }
    const collectionName = buildTableName(this.currentTableId);
    console.log('Collection Debug - Table ID:', this.currentTableId);
    console.log('Collection Debug - Collection Name:', collectionName);
    return this.db.collection(collectionName);
  }

  /**
   * Create a new document
   */
  async create(request: CreateRefRequest): Promise<DatabaseResult<RefSchema>> {
    try {
      const collection = this.getCollection();
      const timestamp = getCurrentTimestamp();

      const document: RefSchema = {
        uid: generateUid(request.uid),
        data: request.data,
        createdAt: timestamp,
        createdBy: request.createdBy || 'system',
        updatedAt: timestamp,
        updatedBy: request.createdBy || 'system'
      };

      // Add all root-level fields from request (except special/system ones) to document
      for (const key of Object.keys(request)) {
        if (!['data', 'uid', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'].includes(key)) {
          (document as any)[key] = (request as any)[key];
        }
      }

      console.log('CREATE Debug - Document to insert:', { uid: document.uid, data: document.data });
      const result = await collection.insertOne(document);
      console.log('CREATE Debug - Insert result:', { insertedId: result.insertedId, acknowledged: result.acknowledged });

      // Verify the document was actually inserted
      const verifyDoc = await collection.findOne({ uid: document.uid });
      console.log('CREATE Debug - Verification find result:', verifyDoc ? { uid: verifyDoc.uid, data: verifyDoc.data } : 'NOT FOUND');

      return { value: document };
    } catch (error) {
      return { error: `Failed to create document: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Get a single document
   */
  async get(options: GetOptions): Promise<DatabaseResult<RefSchema>> {
    try {
      const collection = this.getCollection();
      const filter = convertFilter(options.filter || {});
      
      const projection = options.select ? 
        options.select.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}) : 
        {};

      const document = await collection.findOne(filter, { projection });
      
      if (!document) {
        return { error: 'Document not found' };
      }

      return { value: document as unknown as RefSchema };
    } catch (error) {
      return { error: `Failed to get document: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Query multiple documents
   */
  async query(options: QueryOptions): Promise<DatabaseResult<QueryResult<RefSchema>>> {
    try {
      const collection = this.getCollection();
      const filter = convertFilter(options.filter || {});
      const sort = convertSort(options.sort);
      const limit = Math.min(options.take || this.maxQueryLimit, this.maxQueryLimit);
      const skip = options.skip || 0;
      
      const projection = options.select ? 
        options.select.reduce((acc, field) => ({ ...acc, [field]: 1 }), {}) : 
        {};

      const [documents, total] = await Promise.all([
        collection.find(filter, { projection })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter)
      ]);

      return {
        value: {
          list: documents as unknown as RefSchema[],
          total
        }
      };
    } catch (error) {
      return { error: `Failed to query documents: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Count documents
   */
  async count(options: CountOptions): Promise<DatabaseResult<CountResult>> {
    try {
      const collection = this.getCollection();
      const filter = convertFilter(options.filter || {});
      
      const total = await collection.countDocuments(filter);
      
      return { value: { total } };
    } catch (error) {
      return { error: `Failed to count documents: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Replace documents (PUT)
   */
  async put(filter: Filter, request: UpdateRefRequest): Promise<DatabaseResult<BulkResult>> {
    try {
      const collection = this.getCollection();
      const mongoFilter = convertFilter(filter);
      const timestamp = getCurrentTimestamp();

      // Debug: Check if documents exist before update
      const existingDocs = await collection.find(mongoFilter).toArray();
      console.log('PUT Debug - Filter:', filter);
      console.log('PUT Debug - Mongo Filter:', mongoFilter);
      console.log('PUT Debug - Existing docs found:', existingDocs.length);
      if (existingDocs.length > 0) {
        console.log('PUT Debug - First doc UID:', existingDocs[0].uid);
        console.log('PUT Debug - First doc data:', existingDocs[0].data);
      }

      // For PUT, we replace the entire data field
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

      if (request.data !== undefined) {
        updateDoc.data = request.data; // Complete replacement
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

      console.log('PUT Debug - Update doc:', updateDoc);
      const result = await collection.updateMany(mongoFilter, { $set: updateDoc });
      console.log('PUT Debug - Update result:', { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });

      // Get the updated document IDs
      const updatedDocs = await collection.find(mongoFilter, { projection: { uid: 1 } }).toArray();
      console.log('PUT Debug - Updated docs after update:', updatedDocs.length);

      return {
        value: {
          list: updatedDocs.map(doc => ({ uid: doc.uid })),
          total: result.modifiedCount
        }
      };
    } catch (error) {
      return { error: `Failed to update documents: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Patch documents (PATCH) - merge with existing data
   */
  async patch(filter: Filter, request: UpdateRefRequest): Promise<DatabaseResult<BulkResult>> {
    try {
      const collection = this.getCollection();
      const mongoFilter = convertFilter(filter);
      const timestamp = getCurrentTimestamp();

      const updateDoc: any = {
        updatedAt: timestamp,
        updatedBy: request.updatedBy || 'system'
      };

      // Add all root-level fields from request (except special ones) to updateDoc
      for (const key of Object.keys(request)) {
        if (!['data', 'isDeleted', 'isLocked', 'updatedAt', 'updatedBy'].includes(key)) {
          updateDoc[key] = (request as any)[key];
        }
      }

      // For PATCH, we merge with existing data
      if (request.data !== undefined) {
        // Deep merge the data field
        const existingDocs = await collection.find(mongoFilter).toArray();
        for (const doc of existingDocs) {
          const mergedData = { ...doc.data, ...request.data };
          await collection.updateOne(
            { _id: doc._id },
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

      // Get the updated document IDs
      const updatedDocs = await collection.find(mongoFilter, { projection: { uid: 1 } }).toArray();
      
      return {
        value: {
          list: updatedDocs.map(doc => ({ uid: doc.uid })),
          total: updatedDocs.length
        }
      };
    } catch (error) {
      return { error: `Failed to patch documents: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Delete documents
   */
  async delete(filter: Filter, options?: DeleteOptions): Promise<DatabaseResult<BulkResult>> {
    try {
      const collection = this.getCollection();
      const mongoFilter = convertFilter(filter);

      // Get document IDs before deletion
      const docsToDelete = await collection.find(mongoFilter, { projection: { uid: 1 } }).toArray();
      
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
            list: docsToDelete.map(doc => ({ uid: doc.uid })),
            total: result.modifiedCount
          }
        };
      } else {
        // Hard delete
        const result = await collection.deleteMany(mongoFilter);
        
        return {
          value: {
            list: docsToDelete.map(doc => ({ uid: doc.uid })),
            total: result.deletedCount
          }
        };
      }
    } catch (error) {
      return { error: `Failed to delete documents: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}
