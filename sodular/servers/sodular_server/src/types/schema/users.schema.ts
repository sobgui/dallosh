/**
 * Users Schema - Unified schema for user management
 * This schema is absolutely unified across database, backend and frontend
 */

export interface UserData {
  email: string; // required
  password: string; // required
  username?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface UserSchema {
  uid: string;
  data: UserData;
  createdAt: number; // timestamp
  createdBy: 'system' | string; // user_id
  updatedAt: number; // timestamp
  updatedBy: 'system' | string; // user_id
  deletedAt?: number; // timestamp
  isDeleted?: boolean;
  deletedBy?: 'system' | string; // user_id
  lockedAt?: number; // timestamp
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string; // user_id
}

// For API requests
export interface CreateUserRequest {
  uid?: string;
  data: UserData;
  isActive: boolean;
  createdBy?: 'system' | string;
}

export interface UpdateUserRequest {
  uid?: string;
  data?: Partial<UserData>;
  updatedBy?: 'system' | string;
  deletedBy?: 'system' | string;
  isDeleted?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: 'system' | string;
}

// For authentication responses
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserSchema;
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
