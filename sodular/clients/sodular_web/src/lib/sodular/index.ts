import { BaseClient, AuthAPI, DatabaseAPI, TablesAPI, RefAPI, StorageApiClient, BucketsApiClient, FilesApiClient } from './api';
import type { SodularClientConfig } from './api/base-client';

export interface SodularClientInstance {
  auth: AuthAPI;
  database: DatabaseAPI;
  tables: TablesAPI;
  ref: RefAPI;
  storage: StorageApiClient;
  buckets: BucketsApiClient;
  files: FilesApiClient;
  use: (databaseId?: string) => void;
  setToken: (accessToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
}

export interface SodularClientConnectResult {
  isReady: boolean;
  error?: string;
  client: SodularClientInstance;
}

/**
 * Main SodularClient factory function
 * Creates and configures a new Sodular API client instance
 */
export function SodularClient(config: SodularClientConfig): {
  connect: () => Promise<SodularClientConnectResult>;
} {
  return {
    async connect(): Promise<SodularClientConnectResult> {
      // Create base client
      const baseClient = new BaseClient(config);
      
      // Test connection
      const connectionResult = await baseClient.connect();
      
      if (!connectionResult.isReady) {
        return {
          isReady: false,
          error: connectionResult.error,
          client: createClientInstance(baseClient)
        };
      }
      
      // Create API instances
      const clientInstance = createClientInstance(baseClient);
      
      return {
        isReady: true,
        client: clientInstance
      };
    }
  };
}

/**
 * Create the client instance with all API modules
 */
function createClientInstance(baseClient: BaseClient): SodularClientInstance {
  const auth = new AuthAPI(baseClient);
  const database = new DatabaseAPI(baseClient);
  const tables = new TablesAPI(baseClient);
  const ref = new RefAPI(baseClient);
  const storage = new StorageApiClient(baseClient);
  const buckets = new BucketsApiClient(baseClient);
  const files = new FilesApiClient(baseClient);
  
  return {
    auth,
    database,
    tables,
    ref,
    storage,
    buckets,
    files,
    use: (databaseId?: string) => baseClient.use(databaseId),
    setToken: (accessToken: string) => baseClient.setToken(accessToken),
    setTokens: (accessToken: string, refreshToken: string) => baseClient.setTokens(accessToken, refreshToken),
    clearTokens: () => baseClient.clearTokens()
  };
}

// Export types and schemas
export * from './types/schema';
export * from './utils';

// Default export
export default SodularClient;
