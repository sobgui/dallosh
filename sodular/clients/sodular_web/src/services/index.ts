import { SodularClient } from '../lib/sodular';
import type { SodularClientInstance } from '../lib/sodular';
import { apiUrl } from '../configs';

// Create the Sodular client instance factory
let sodularClientFactory: ReturnType<typeof SodularClient> | null = null;
let clientInstance: SodularClientInstance | null = null;

export { apiUrl };

function createSodularClientFactory() {
  
  return SodularClient({
    baseUrl: apiUrl,
    timeout: 30000
  });
}

function getFactory() {
  if (!sodularClientFactory) sodularClientFactory = createSodularClientFactory();
  return sodularClientFactory;
}

/**
 * Initialize the Sodular client connection
 * This should be called once at app startup or after login
 */
export async function initializeSodularClient(): Promise<{
  isReady: boolean;
  error?: string;
  client?: SodularClientInstance;
}> {
  try {
    const { isReady, error, client } = await getFactory().connect();
    if (isReady) {
      clientInstance = client;
      return { isReady: true, client };
    } else {
      return { isReady: false, error };
    }
  } catch (err: any) {
    return { isReady: false, error: err.message || 'Unknown error occurred' };
  }
}

/**
 * Get the initialized client instance (always loads tokens from storage)
 */
export function getSodularClient(): SodularClientInstance {
  
  if (!clientInstance) {
    throw new Error('Sodular client not initialized. Call initializeSodularClient() first.');
  }
  // Always reload tokens from storage before returning
  // @ts-ignore
  if (clientInstance.auth && clientInstance.auth.client && clientInstance.auth.client.loadTokensFromStorage) {
    // @ts-ignore
    clientInstance.auth.client.loadTokensFromStorage();
  }
  return clientInstance;
}

/**
 * Async getter that ensures initialization and returns the client
 */
export async function getClientAsync(): Promise<SodularClientInstance> {
  if (!clientInstance) {
    await initializeSodularClient();
  }
  return getSodularClient();
}

export function isClientReady(): boolean {
  return clientInstance !== null;
}

// Export individual API modules for convenience
export const auth = {
  get: () => getSodularClient().auth,
  logout: () => getSodularClient().auth.logout(),
};

export const database = {
  get: () => getSodularClient().database,
};

export const tables = {
  get: () => getSodularClient().tables,
};

export const ref = {
  get: () => getSodularClient().ref,
};

export const storage = {
  get: () => getSodularClient().storage,
};

export const buckets = {
  get: () => getSodularClient().buckets,
};

export const files = {
  get: () => getSodularClient().files,
};

// Export client control functions
export const client = {
  get: getSodularClient,
  use: (databaseId?: string) => getSodularClient().use(databaseId),
  setToken: (accessToken: string) => getSodularClient().setToken(accessToken),
  setTokens: (accessToken: string, refreshToken: string) => getSodularClient().setTokens(accessToken, refreshToken),
  clearTokens: () => getSodularClient().clearTokens(),
};

// Export types for convenience
export type { SodularClientInstance } from '../lib/sodular';
