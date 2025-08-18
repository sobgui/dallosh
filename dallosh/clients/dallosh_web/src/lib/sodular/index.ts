import { BaseClient } from './api/base-client';
import { AuthAPI } from './api/auth';
import { DatabaseAPI } from './api/database';
import { TablesAPI } from './api/tables';
import { RefAPI } from './api/ref';
import { StorageAPI } from './api/storage';
import { BucketsAPI } from './api/buckets';
import { FilesAPI } from './api/files';
import { AIAPI } from './api/ai';
import type { AxiosInstance } from 'axios';
import { GenerateChatParams, StreamCallbacks } from './api/ai';

export interface SodularClientConfig {
  baseUrl: string;
  timeout?: number;
  ai?: {
    baseUrl: string;
  };
}

export interface SodularClientInstance {
  auth: AuthAPI;
  database: DatabaseAPI;
  tables: TablesAPI;
  ref: RefAPI;
  storage: StorageAPI;
  buckets: BucketsAPI;
  files: FilesAPI;
  axiosInstance: AxiosInstance;
  use: (databaseId?: string) => void;
  setToken: (accessToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
  accessToken?: string;
  // Socket methods
  joinChannel: (databaseId: string | undefined, tableId: string) => void;
  leaveChannel: (databaseId: string | undefined, tableId: string) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  ai?: {
    generateChat: (params: GenerateChatParams) => Promise<any>;
    generateStreamChat: (params: GenerateChatParams, callbacks: StreamCallbacks) => Promise<void>;
    getModels: (params: { baseUrl: string; apiKey: string }) => Promise<any>;
    _instance: AIAPI;
  };
}

export interface SodularClientConnectResult {
  isReady: boolean;
  error?: string;
  client: SodularClientInstance;
}

function createClientInstance(baseClient: BaseClient, aiConfig?: { baseUrl: string }): SodularClientInstance {
  const aiApi = aiConfig && aiConfig.baseUrl ? new AIAPI(baseClient, aiConfig.baseUrl) : undefined;
  const client: SodularClientInstance = {
    auth: new AuthAPI(baseClient),
    database: new DatabaseAPI(baseClient),
    tables: new TablesAPI(baseClient),
    ref: new RefAPI(baseClient),
    storage: new StorageAPI(baseClient),
    buckets: new BucketsAPI(baseClient),
    files: new FilesAPI(baseClient),
    axiosInstance: baseClient.axiosInstance,
    use: (databaseId?: string) => baseClient.use(databaseId),
    setToken: (accessToken: string) => baseClient.setToken(accessToken),
    setTokens: (accessToken: string, refreshToken: string) => baseClient.setTokens(accessToken, refreshToken),
    clearTokens: () => baseClient.clearTokens(),
    get accessToken() { return (baseClient as any).accessToken; },
    // Socket methods
    joinChannel: (databaseId: string | undefined, tableId: string) => baseClient.joinChannel(databaseId, tableId),
    leaveChannel: (databaseId: string | undefined, tableId: string) => baseClient.leaveChannel(databaseId, tableId),
    on: (event: string, callback: (data: any) => void) => baseClient.on(event, callback),
    off: (event: string, callback?: (data: any) => void) => baseClient.off(event, callback),
    ai: aiApi
      ? {
          generateChat: aiApi.generateChat.bind(aiApi),
          generateStreamChat: aiApi.generateStreamChat.bind(aiApi),
          getModels: aiApi.getModels.bind(aiApi),
          _instance: aiApi,
        }
      : undefined,
  };
  return client;
}

export function SodularClient(config: SodularClientConfig): {
  connect: () => Promise<SodularClientConnectResult>;
} {
  return {
    async connect(): Promise<SodularClientConnectResult> {
      const baseClient = new BaseClient(config);
      const { isReady, error } = await baseClient.connect();
      const client = createClientInstance(baseClient, config.ai);
      
      return { isReady, error, client };
    }
  };
}

export * from './types/schema';
export * from './utils';

export default SodularClient;
