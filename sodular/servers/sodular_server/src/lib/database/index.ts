/**
 * Sodular Database Service - Main database service entry point
 * This service is agnostic to external database providers
 */

import { DatabaseConfig, ConnectionResult } from './types';
import { DatabaseAdapter } from './base';
import { MongoDBAdapter } from './adapters/mongodb';

export class SodularDatabaseService {
  private config: DatabaseConfig;
  private adapter: DatabaseAdapter;

  constructor(config: DatabaseConfig) {
    this.config = config;
    
    // Initialize the appropriate adapter based on database type
    switch (config.type) {
      case 'mongodb':
        this.adapter = new MongoDBAdapter(config);
        break;
      case 'mysql':
      case 'postgresql':
      case 'sqlite':
        throw new Error(`Database type '${config.type}' is not yet implemented`);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<ConnectionResult> {
    return await this.adapter.connect();
  }
}

// Export all types and interfaces
export * from './types';
export * from './base';
export * from './utils';
export * from './adapters/mongodb';
