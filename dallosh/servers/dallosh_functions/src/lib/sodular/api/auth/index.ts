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

  async register(request: { data: RegisterRequest }): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.request<AuthResponse>('POST', '/auth/register', { data: request });
    if (response.data?.tokens) {
      this.client.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    return response;
  }

  async login(request: { data: LoginRequest }): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.request<AuthResponse>('POST', '/auth/login', {
      data: request
    });
    if (response.data?.tokens) {
      this.client.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    return response;
  }

  async refreshToken(data: RefreshTokenRequest): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    const response = await this.client.request<{ tokens: AuthTokens }>('POST', '/auth/refresh-token', {
      params: { refreshToken: data.refreshToken }
    });
    if (response.data?.tokens) {
      this.client.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    return response;
  }

  async create(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return this.client.request<User>('POST', '/auth', { data });
  }

  async get(options: { filter: Record<string, any>; select?: string[] }): Promise<ApiResponse<User>> {
    return this.client.request<User>('GET', '/auth', { params: options });
  }

  async query(options: QueryOptions): Promise<ApiResponse<QueryResult<User>>> {
    return this.client.request<QueryResult<User>>('GET', '/auth/query', { params: options });
  }

  async count(options: { filter?: Record<string, any> }): Promise<ApiResponse<CountResult>> {
    return this.client.request<CountResult>('GET', '/auth/count', { params: options });
  }

  async put(filter: Record<string, any>, data: UpdateUserRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request<UpdateResult>('PUT', '/auth', { params: { filter }, data });
  }

  async patch(filter: Record<string, any>, data: UpdateUserRequest): Promise<ApiResponse<UpdateResult>> {
    return this.client.request<UpdateResult>('PATCH', '/auth', { params: { filter }, data });
  }

  async delete(filter: Record<string, any>, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    return this.client.request<DeleteResult>('DELETE', '/auth', { params: { filter, options } });
  }

  logout(): void {
    this.client.clearTokens();
  }
}
