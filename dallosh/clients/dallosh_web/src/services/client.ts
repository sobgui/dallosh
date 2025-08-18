import { SodularClient, SodularClientInstance, Ref, Table, User } from '@/lib/sodular';
import { useAuthStore } from '@/stores/auth';
import { apiUrl, aiUrl, databaseID, dalloshAIBaseUrl } from '@/configs';

export { apiUrl, aiUrl, databaseID, dalloshAIBaseUrl };


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

        // Initialize with tokens from storage after connection
        const { tokens } = useAuthStore.getState();
        if (tokens) {
          client.setTokens(tokens.accessToken, tokens.refreshToken);
        }

        // Subscribe to auth store changes to keep tokens in sync
        useAuthStore.subscribe((state) => {
          if (state.tokens) {
            client.setTokens(state.tokens.accessToken, state.tokens.refreshToken);
          } else {
            client.clearTokens();
          }
        });

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
