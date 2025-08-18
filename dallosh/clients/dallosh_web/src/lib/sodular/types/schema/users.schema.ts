
// Users Schema - Must match backend exactly
export interface UserData {
  email: string;
  password?: string; // Optional on return
  username?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  imageUrl?: string;
  avatarUrl?: string; // Keep for compatibility if needed elsewhere
  fields?: Record<string, any>;
}

export interface User {
  uid: string;
  data: UserData;
  createdAt: number;
  createdBy: string | 'system';
  updatedAt: number;
  updatedBy: string | 'system';
  deletedAt?: number;
  isDeleted?: boolean;
  deletedBy?: string | 'system';
  lockedAt?: number;
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: string | 'system';
}

export interface CreateUserRequest {
  uid?: string;
  data: UserData;
  createdBy?: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  uid?: string;
  data?: Partial<UserData>;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedBy?: string | 'system';
  isLocked?: boolean;
  isActive?: boolean;
  lockedBy?: string | 'system';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
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
