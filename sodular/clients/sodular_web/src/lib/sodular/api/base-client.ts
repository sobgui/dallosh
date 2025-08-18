import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '../types/schema';
import { buildQueryParams, buildApiUrl, storage, TOKEN_KEYS } from '../utils';
import { jwtDecode } from 'jwt-decode';

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
  private refreshPromise?: Promise<boolean>;

  constructor(config: SodularClientConfig) {
    this.baseUrl = config.baseUrl;
    
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load tokens from localStorage
    this.loadTokensFromStorage();
    
    // Setup request interceptor to add auth headers
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Setup response interceptor to handle token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.axiosInstance(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Connect to the backend and check health
   */
  async connect(): Promise<{ isReady: boolean; error?: string; client: BaseClient }> {
    try {
      await this.axiosInstance.get('/health');
      return { isReady: true, client: this };
    } catch (error: any) {
      return { 
        isReady: false, 
        error: error.message || 'Failed to connect to Sodular backend',
        client: this 
      };
    }
  }

  /**
   * Set the database context for subsequent requests
   */
  use(databaseId?: string): void {
    this.currentDatabaseId = databaseId;
  }

  /**
   * Set access token manually
   */
  setToken(accessToken: string): void {
    this.accessToken = accessToken;
    storage.set(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
  }

  isTokenExpired = () => {
    let token = storage.get(TOKEN_KEYS.ACCESS_TOKEN);

    if (!token) return true;
    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (typeof decodedToken !== 'object' || decodedToken === null || typeof (decodedToken as any).exp !== 'number') {
        return true;
      }
      return (decodedToken as any).exp < currentTime;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }

  /**
   * Set both access and refresh tokens
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    storage.set(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    storage.set(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    storage.remove(TOKEN_KEYS.ACCESS_TOKEN);
    storage.remove(TOKEN_KEYS.REFRESH_TOKEN);
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokensFromStorage(): void {
    this.accessToken = storage.get(TOKEN_KEYS.ACCESS_TOKEN) || undefined;
    this.refreshToken = storage.get(TOKEN_KEYS.REFRESH_TOKEN) || undefined;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      return false;
    }

    this.refreshPromise = this.performTokenRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = undefined;
    
    return result;
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      const queryParams = buildQueryParams({
        database_id: this.currentDatabaseId,
        refreshToken: this.refreshToken
      });
      
      const url = buildApiUrl(this.baseUrl, '/auth/refresh-token', queryParams);
      
      const response = await axios.post(url);
      const { data } = response.data as ApiResponse<{ tokens: { accessToken: string; refreshToken: string } }>;
      
      if (data?.tokens) {
        this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
        return true;
      }
      
      return false;
    } catch (error) {
      this.clearTokens();
      return false;
    }
  }

  /**
   * Make HTTP request with automatic query parameter handling
   */
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
      
      // Add database_id to params if set
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
