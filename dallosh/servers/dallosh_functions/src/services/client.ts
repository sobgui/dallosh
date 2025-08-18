import dotenv from 'dotenv';
import { SodularClient, SodularClientInstance, Ref, Table, User } from '../lib/sodular';

// Load environment variables first
dotenv.config();

// Debug: Log what we're reading from environment
console.log('🔧 Environment variables loaded:');
console.log('  SODULAR_BASE_URL:', process.env.SODULAR_BASE_URL);
console.log('  SODULAR_AI_BASE_URL:', process.env.SODULAR_AI_BASE_URL);
console.log('  SODULAR_DATABASE_ID:', process.env.SODULAR_DATABASE_ID);
console.log('  SODULAR_API_KEY:', process.env.SODULAR_API_KEY ? '***' : 'undefined');

export const apiUrl =  process.env.SODULAR_BASE_URL || 'http://sodular_backend:5001/api/v1';    
export const aiUrl = process.env.SODULAR_AI_BASE_URL || 'http://sodular_backend:4200/api/v1';
export const databaseID = process.env.SODULAR_DATABASE_ID || '43fba321-e958-466c-a450-1638d32af19b';
export const apiKey = process.env.SODULAR_API_KEY || '1234567890';

let clientPromise: Promise<SodularClientInstance | null> | null = null;


export function getSodularClient(): Promise<SodularClientInstance | null> {
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const sodularClientFactory = SodularClient({ baseUrl: apiUrl, ai: { baseUrl: aiUrl } });
        const { client, isReady, error } = await sodularClientFactory.connect();
        if (error || !isReady) {
          console.error("Failed to connect to Sodular backend:", error);
          return null;
        }

        if (databaseID) client.use(databaseID);
        if (apiKey) client.setToken(apiKey);

        return client;
      } catch (e) {
        console.error("Critical error during client initialization:", e);
        return null;
      }
    })();
  }
  return clientPromise;
}

// Re-export types for convenience
export type { SodularClientInstance, Ref, Table, User };
