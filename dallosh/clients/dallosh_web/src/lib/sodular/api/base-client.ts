import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { io, Socket } from 'socket.io-client';
import { ApiResponse, AuthTokens } from '../types/schema';
import { buildQueryParams, buildApiUrl, storage, TOKEN_KEYS } from '../utils';


export interface SodularClientConfig {
  baseUrl: string;
  timeout?: number;
}

export class BaseClient {
  public axiosInstance: AxiosInstance;
  private baseUrl: string;
  private currentDatabaseId?: string;
  private accessToken?: string;
  private refreshToken?: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private socket: Socket | null = null;

  constructor(config: SodularClientConfig) {
    this.baseUrl = config.baseUrl;
    
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.loadTokensFromStorage();
    
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          if (!this.isRefreshing) {
            this.refreshPromise = this.performTokenRefresh();
          }

          const refreshed = await this.refreshPromise;
          
          if (refreshed) {
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.axiosInstance(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async connect(): Promise<{ isReady: boolean; error?: string }> {
    try {
      await this.axiosInstance.get('/health');
      
      // Connect to socket server
      this.connectSocket();
      
      return { isReady: true };
    } catch (error: any) {
      return { 
        isReady: false, 
        error: error.message || 'Failed to connect to Sodular backend',
      };
    }
  }

  /**
   * Extract host URL from API base URL
   * e.g., 'http://sodular_backend:5001/api/v1' -> 'http://sodular_backend:5001'
   */
  private getSocketUrl(): string {
    try {
      const url = new URL(this.baseUrl);
      return `${url.protocol}//${url.host}`;
    } catch (error) {
      console.error('Failed to parse base URL for socket connection:', error);
      // Fallback: try to remove common API paths
      return this.baseUrl
        .replace(/\/api\/v\d+\/?$/, '')
        .replace(/\/api\/?$/, '')
        .replace(/\/$/, '');
    }
  }

  /**
   * Connect to socket server
   */
  private connectSocket(): void {
    try {
      const socketUrl = this.getSocketUrl();
      console.log('Connecting to socket at:', socketUrl);
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        auth: {
          token: this.accessToken
        }
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    } catch (error) {
      console.error('Failed to connect to socket server:', error);
    }
  }

  use(databaseId?: string): void {
    this.currentDatabaseId = databaseId;
  }

  setToken(accessToken: string): void {
    this.accessToken = accessToken;
    storage.set(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    storage.set(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    storage.set(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
  }

  clearTokens(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    storage.remove(TOKEN_KEYS.ACCESS_TOKEN);
    storage.remove(TOKEN_KEYS.REFRESH_TOKEN);
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Join a channel for listening to events
   */
  joinChannel(databaseId: string | undefined, tableId: string): void {
    if (this.socket) {
      this.socket.emit('join', { database_id: databaseId, table_id: tableId });
    }
  }

  /**
   * Leave a channel
   */
  leaveChannel(databaseId: string | undefined, tableId: string): void {
    if (this.socket) {
      this.socket.emit('leave', { database_id: databaseId, table_id: tableId });
    }
  }

  /**
   * Listen to events on a channel
   */
  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  private loadTokensFromStorage(): void {
    this.accessToken = storage.get(TOKEN_KEYS.ACCESS_TOKEN) || undefined;
    this.refreshToken = storage.get(TOKEN_KEYS.REFRESH_TOKEN) || undefined;
  }

  private async performTokenRefresh(): Promise<boolean> {
    this.isRefreshing = true;
    if (!this.refreshToken) {
      this.isRefreshing = false;
      return false;
    }

    try {
      let query = `refreshToken=${this.refreshToken}`;
      if (this.currentDatabaseId) {
        query += `&database_id=${this.currentDatabaseId}`;
      }
      const url = buildApiUrl(this.baseUrl, '/auth/refresh-token', query);
      const response = await axios.post(url);
      const { data } = response.data as ApiResponse<{ tokens: AuthTokens }>;
      
      if (data?.tokens) {
        this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        this.isRefreshing = false;
        return true;
      }
      
      this.clearTokens();
      this.isRefreshing = false;
      return false;
    } catch (error) {
      this.clearTokens();
      this.isRefreshing = false;
      return false;
    }
  }

  public async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: {
      data?: any;
      params?: Record<string, any>;
      config?: AxiosRequestConfig;
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { data, params = {}, config = {} } = options;
      
      if (this.currentDatabaseId) {
        params.database_id = this.currentDatabaseId;
      }
      
      const queryParams = buildQueryParams(params);
      const url = buildApiUrl('', path, queryParams);
      
      const response: AxiosResponse<ApiResponse<T>> = await this.axiosInstance.request({
        method,
        url,
        data,
        ...config,
      });
      
      return response.data;
    } catch (error: any) {
      return {
        error: error.response?.data?.error || error.message || 'Request failed'
      };
    }
  }
}
