/**
 * Auth Services
 * Business logic for authentication operations
 */

import { Request } from 'express';
import { 
  UserSchema, 
  CreateUserRequest, 
  UpdateUserRequest,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthTokens
} from '@/types/schema/users.schema';
import { 
  DatabaseResult, 
  QueryResult, 
  CountResult, 
  BulkResult,
  QueryOptions,
  GetOptions,
  CountOptions,
  DeleteOptions,
  Filter
} from '@/lib/database/types';
import { BaseDatabase } from '@/lib/database/base';
import { JWTUtils, PasswordUtils, Logger } from '@/core/utils';
import { COLLECTIONS } from '@/configs/constant';
import { CreateTableRequest } from '@/types/schema/tables.schema';

export class AuthService {
  private database: BaseDatabase;

  constructor(database: BaseDatabase) {
    this.database = database;
  }

  /**
   * Ensure users table exists in the current database context
   * Creates the users table if it doesn't exist
   */
  private async ensureUsersTableExists(): Promise<DatabaseResult> {
    try {
      // Check if users table already exists
      const existingTable = await this.database.tables.get({
        filter: { 'data.name': COLLECTIONS.USERS }
      });

      if (existingTable.value) {
        Logger.info('📋 Users table already exists, skipping creation');
        return existingTable;
      }

      // Create users table
      const createTableRequest: CreateTableRequest = {
        data: {
          name: COLLECTIONS.USERS,
          description: 'Users collection for authentication'
        },
        createdBy: 'system'
      };

      const createResult = await this.database.tables.create(createTableRequest);
      if (createResult.error) {
        Logger.error('Failed to create users table:', createResult.error);
        return { error: 'Failed to create users table' };
      }

      Logger.info(`Users table created in database context`);

      return createResult

    } catch (error) {
      Logger.error('Error ensuring users table exists:', error);
      return { error: 'Failed to ensure users table exists' };
    }
  }

  /**
   * Register a new user
   */
  async register(request: RegisterRequest): Promise<DatabaseResult<AuthResponse>> {
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      // Check if user already exists
      const existingUser = await this.database.ref.from(tableCheck.value.uid).get({
        filter: { 'data.email': request.email }
      });

      if (existingUser.value) {
        return { error: 'User with this email already exists' };
      }

      // Hash password
      const hashedPassword = await PasswordUtils.hashPassword(request.password);

      // Create user
      const createUserRequest: CreateUserRequest = {
        data: {
          email: request.email,
          password: hashedPassword,
          username: request.username,
          isEmailVerified: false,
        },
        isActive: true,
        createdBy: 'system',
      };

      const userResult = await this.database.ref.from(tableCheck.value.uid).create(createUserRequest);

      if (userResult.error) {
        return { error: userResult.error };
      }

      // Generate tokens
      const tokens = this.generateTokens(userResult.value!);

      // Remove password from response
      const userResponse = { ...userResult.value! };
      delete userResponse.data.password;

      return {
        value: {
          user: userResponse,
          tokens,
        },
      };
    } catch (error) {
      Logger.error('Registration error:', error);
      return { error: 'Registration failed' };
    }
  }

  /**
   * Login user
   */
  async login(request: LoginRequest): Promise<DatabaseResult<AuthResponse>> {
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      // Find user by email
      const userResult = await this.database.ref.from(tableCheck.value.uid).get({
        filter: { 'data.email': request.email }
      });

      if (userResult.error || !userResult.value) {
        return { error: 'Invalid email or password' };
      }

      const user = userResult.value;

      // Check if user is active
      if (user.data.isActive === false) {
        return { error: 'Account is deactivated' };
      }

      // Check if user is locked
      if (user.isLocked) {
        return { error: 'Account is temporarily locked' };
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.comparePassword(
        request.password,
        user.data.password
      );

      if (!isPasswordValid) {
        return { error: 'Invalid email or password' };
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.data.password;

      return {
        value: {
          user: userResponse,
          tokens,
        },
      };
    } catch (error) {
      Logger.error('Login error:', error);
      return { error: 'Login failed' };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<DatabaseResult<{ tokens: AuthTokens }>> {
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      // Verify refresh token
      const decoded = JWTUtils.verifyRefreshToken(refreshToken);

      // Find user
      const userResult = await this.database.ref.from(tableCheck.value.uid).get({
        filter: { uid: decoded.uid }
      });

      if (userResult.error || !userResult.value) {
        return { error: 'User not found' };
      }

      const user = userResult.value;

      // Check if user is active
      if (user.data.isActive === false) {
        return { error: 'Account is deactivated' };
      }

      // Check if user is locked
      if (user.isLocked) {
        return { error: 'Account is temporarily locked' };
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return {
        value: { tokens },
      };
    } catch (error) {
      Logger.error('Refresh token error:', error);
      return { error: 'Invalid or expired refresh token' };
    }
  }

  /**
   * Create user (without tokens)
   */
  async create(request: CreateUserRequest, options?: any): Promise<DatabaseResult<UserSchema>> {
    const user_uid = (options && options.user_uid) || 'system';
    request.createdBy = user_uid;
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      // Check if user already exists
      const existingUser = await this.database.ref.from(tableCheck.value.uid).get({
        filter: { 'data.email': request.data.email }
      });

      if (existingUser.value) {
        return { error: 'User with this email already exists' };
      }

      // Hash password
      const hashedPassword = await PasswordUtils.hashPassword(request.data.password);

      // Create user request with hashed password
      const createRequest: CreateUserRequest = {
        ...request,
        data: {
          ...request.data,
          password: hashedPassword,
        },
        isActive:true
      };

      const result = await this.database.ref.from(tableCheck.value.uid).create(createRequest);

      if (result.value) {
        // Remove password from response
        const userResponse = { ...result.value };
        delete userResponse.data.password;
        return { value: userResponse };
      }

      return result;
    } catch (error) {
      Logger.error('Create user error:', error);
      return { error: 'Failed to create user' };
    }
  }

  /**
   * Get user
   */
  async get(options: GetOptions): Promise<DatabaseResult<UserSchema>> {
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      const result = await this.database.ref.from(tableCheck.value.uid).get(options);
      
      if (result.value) {
        // Remove password from response
        const userResponse = { ...result.value };
        delete userResponse.data.password;
        return { value: userResponse };
      }

      return result;
    } catch (error) {
      Logger.error('Get user error:', error);
      return { error: 'Failed to get user' };
    }
  }

  /**
   * Query users
   */
  async query(options: QueryOptions): Promise<DatabaseResult<QueryResult<UserSchema>>> {
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      const result = await this.database.ref.from(tableCheck.value.uid).query(options);
      
      if (result.value) {
        // Remove passwords from response
        const users = result.value.list.map(user => {
          const userResponse = { ...user };
          delete userResponse.data.password;
          return userResponse;
        });

        return {
          value: {
            list: users,
            total: result.value.total,
          },
        };
      }

      return result;
    } catch (error) {
      Logger.error('Query users error:', error);
      return { error: 'Failed to query users' };
    }
  }

  /**
   * Count users
   */
  async count(options: CountOptions): Promise<DatabaseResult<CountResult>> {
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      return await this.database.ref.from(tableCheck.value.uid).count(options);
    } catch (error) {
      Logger.error('Count users error:', error);
      return { error: 'Failed to count users' };
    }
  }

  /**
   * Update users (PUT)
   */
  async put(filter: Filter, request: UpdateUserRequest): Promise<DatabaseResult<BulkResult>> {
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      // Hash password if provided
      if (request.data?.password) {
        request.data.password = await PasswordUtils.hashPassword(request.data.password);
      }

      return await this.database.ref.from(tableCheck.value.uid).put(filter, request);
    } catch (error) {
      Logger.error('Put users error:', error);
      return { error: 'Failed to update users' };
    }
  }

  /**
   * Update users (PATCH)
   */
  async patch(filter: Filter, request: UpdateUserRequest, options?: any): Promise<DatabaseResult<BulkResult>> {
    const user_uid = (options && options.user_uid) || 'system';
    request.updatedBy = user_uid;
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      // Hash password if provided
      if (request.data?.password) {
        request.data.password = await PasswordUtils.hashPassword(request.data.password);
      }
      return await this.database.ref.from(tableCheck.value.uid).patch(filter, request);
    } catch (error) {
      Logger.error('Patch users error:', error);
      return { error: 'Failed to update users' };
    }
  }

  /**
   * Delete users
   */
  async delete(filter: Filter, options?: DeleteOptions & { user_uid?: string }): Promise<DatabaseResult<BulkResult>> {
    const user_uid = (options && (options as any).user_uid) || 'system';
    if (options && (options as any).withSoftDelete) {
      (options as any).deletedBy = user_uid;
    }
    try {
      // Ensure users table exists in current database context
      const tableCheck = await this.ensureUsersTableExists();
      if (tableCheck.error) {
        return { error: tableCheck.error };
      }

      return await this.database.ref.from(tableCheck.value.uid).delete(filter, options);
    } catch (error) {
      Logger.error('Delete users error:', error);
      return { error: 'Failed to delete users' };
    }
  }

  /**
   * Generate JWT tokens for user
   */
  private generateTokens(user: UserSchema): AuthTokens {
    const payload = {
      uid: user.uid,
      email: user.data.email,
      username: user.data.username,
    };

    return {
      accessToken: JWTUtils.signToken(payload),
      refreshToken: JWTUtils.signRefreshToken(payload),
    };
  }
}
