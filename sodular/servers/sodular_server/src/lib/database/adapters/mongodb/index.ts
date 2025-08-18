/**
 * MongoDB Adapter - Main entry point
 */

import { MongoClient } from 'mongodb';
import { DatabaseAdapter } from '../../base';
import { DatabaseConfig, ConnectionResult } from '../../types';
import { MongoDatabaseAdapter } from './database';

export class MongoDBAdapter implements DatabaseAdapter {
  private config: DatabaseConfig;
  private client?: MongoClient;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Connect to MongoDB and return database instance
   */
  async connect(): Promise<ConnectionResult> {
    try {
      // Build connection URL
      let connectionUrl = `mongodb://`;
      
      if (this.config.auth) {
        connectionUrl += `${this.config.auth.user}:${this.config.auth.password}@`;
      }
      
      connectionUrl += `${this.config.database.host}:${this.config.database.port}`;

      // Create MongoDB client
      this.client = new MongoClient(connectionUrl, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      // Connect to MongoDB
      await this.client.connect();

      // Test the connection
      await this.client.db(this.config.database.dbName).admin().ping();

      // Create database adapter instance
      const database = new MongoDatabaseAdapter(
        this.client,
        this.config.database.dbName,
        this.config.maxQueryLimit
      );

      return {
        isReady: true,
        database
      };
    } catch (error) {
      return {
        isReady: false,
        error: `MongoDB connection failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}

// Export all MongoDB components
export { MongoDatabaseAdapter } from './database';
export { MongoTablesAdapter } from './tables';
export { MongoRefAdapter } from './ref';
