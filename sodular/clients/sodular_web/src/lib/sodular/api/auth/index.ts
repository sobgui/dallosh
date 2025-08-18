import { BaseClient } from '../base-client';
import {
  ApiResponse,
  QueryOptions,
  QueryResult,
  CountResult,
  UpdateResult,
  DeleteResult,
  DeleteOptions,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  AuthTokens
} from '../../types/schema';

export class AuthAPI {
  constructor(private client: BaseClient) {}

  /**
   * Register a new user
   * Body: { email, password }
   */
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client['request']<AuthResponse>('POST', '/auth/register', { data });
    
    // Auto-save tokens if registration successful
    if (response.data?.tokens && typeof window !== 'undefined') {
      this.client.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    
    return response;
  }

  /**
   * Login user
   * Body: { email, password }
   */
  async login(loginData: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client['request']<AuthResponse>('POST', '/auth/login', {
      data: { data: { ...loginData } }
    });

    // Auto-save tokens if login successful
    if (response.data?.tokens && typeof window !== 'undefined') {
      this.client.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }

    return response;
  }

  /**
   * Refresh access token
   * Query: refreshToken as query param
   */
  async refreshToken(data: RefreshTokenRequest): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    const response = await this.client['request']<{ tokens: AuthTokens }>('POST', '/auth/refresh-token', {
      params: { refreshToken: data.refreshToken }
    });
    
    // Auto-save tokens if refresh successful
    if (response.data?.tokens && typeof window !== 'undefined') {
      this.client.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    
    return response;
  }

  /**
   * Create a new user (without returning tokens)
   * Body: { uid, data, createdBy }
   */
  async create(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.client['request']<User>('POST', '/auth', { data });
  }

  /**
   * Get a single user
   * Query: filter, select (as JSON strings)
   */
  async get(options: { filter: Record<string, any>; select?: string[] }): Promise<ApiResponse<User>> {
    const params: any = {
      filter: JSON.stringify(options.filter || {})
    };
    if (options.select) params.select = JSON.stringify(options.select);
    return this.client['request']<User>('GET', '/auth', { params });
  }

  /**
   * Query multiple users
   * Query: filter, select, sort, take, skip (as JSON strings where needed)
   */
  async query(options: QueryOptions): Promise<ApiResponse<QueryResult<User>>> {
    const params: any = {
      filter: JSON.stringify(options.filter || {})
    };
    if (options.select) params.select = JSON.stringify(options.select);
    if (options.sort) params.sort = JSON.stringify(options.sort);
    if (options.take !== undefined) params.take = options.take;
    if (options.skip !== undefined) params.skip = options.skip;
    return this.client['request']<QueryResult<User>>('GET', '/auth/query', { params });
  }

  /**
   * Count users
   * Query: filter (as JSON string)
   */
  async count(options: { filter?: Record<string, any> }): Promise<ApiResponse<CountResult>> {
    const params: any = {};
    if (options.filter) params.filter = JSON.stringify(options.filter);
    return this.client['request']<CountResult>('GET', '/auth/count', { params });
  }

  /**
   * Update users (replace)
   * Query: filter (as JSON string)
   * Body: { uid, data, updatedBy, ... }
   */
  async put(filter: Record<string, any>, data: UpdateUserRequest): Promise<ApiResponse<UpdateResult>> {
    const params: any = { filter: JSON.stringify(filter) };
    return this.client['request']<UpdateResult>('PUT', '/auth', {
      params,
      data
    });
  }

  /**
   * Update users (merge)
   * Query: filter (as JSON string)
   * Body: { uid, data, updatedBy, ... }
   */
  async patch(filter: Record<string, any>, data: UpdateUserRequest): Promise<ApiResponse<UpdateResult>> {
    const params: any = { filter: JSON.stringify(filter) };
    return this.client['request']<UpdateResult>('PATCH', '/auth', {
      params,
      data
    });
  }

  /**
   * Delete users
   * Query: filter, options (as JSON strings)
   */
  async delete(filter: Record<string, any>, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    const params: any = { filter: JSON.stringify(filter) };
    if (options) params.options = JSON.stringify(options);
    return this.client['request']<DeleteResult>('DELETE', '/auth', {
      params
    });
  }

  /**
   * Logout user (client-side only)
   * Clears tokens from client and localStorage
   */
  logout(): void {
    this.client.clearTokens();
  }
}
