/**
 * Application Constants
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  TOKEN_REQUIRED: 'Authorization token is required',
  REFRESH_TOKEN_INVALID: 'Invalid refresh token',
  REFRESH_TOKEN_EXPIRED: 'Refresh token has expired',
  
  // Authorization
  ACCESS_DENIED: 'Access denied',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  
  // Validation
  VALIDATION_ERROR: 'Validation error',
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  INVALID_EMAIL: 'Invalid email format',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters',
  
  // Database
  DATABASE_ERROR: 'Database operation failed',
  DATABASE_CONNECTION_ERROR: 'Database connection failed',
  RECORD_NOT_FOUND: 'Record not found',
  RECORD_ALREADY_EXISTS: 'Record already exists',
  DUPLICATE_ENTRY: 'Duplicate entry',
  
  // Rate Limiting
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  TOO_MANY_LOGIN_ATTEMPTS: 'Too many login attempts, account locked temporarily',
  
  // General
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  INVALID_REQUEST: 'Invalid request',
  METHOD_NOT_ALLOWED: 'Method not allowed',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration successful',
  TOKEN_REFRESHED: 'Token refreshed successfully',
} as const;

// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  STORAGE: 'storage',
  BUCKETS: 'buckets',
  FILES: 'files',
  DATABASE_RECORDS: 'database_records',
  TABLES_RECORDS: 'tables_records',
} as const;

// Default Values
export const DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PASSWORD_MIN_LENGTH: 6,
  TOKEN_EXPIRY_HOURS: 24,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_UNDERSCORE: /^[a-zA-Z0-9_]+$/,
} as const;

// API Response Types
export const RESPONSE_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const;

// Database Operations
export const DB_OPERATIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  QUERY: 'query',
  COUNT: 'count',
} as const;

// Database Configuration
export const DATABASE = {
  MAX_QUERY_LIMIT: 100,
  DEFAULT_QUERY_LIMIT: 20,
  CONNECTION_TIMEOUT: 30000,
  QUERY_TIMEOUT: 10000,
} as const;

// Patterns (alias for REGEX_PATTERNS)
export const PATTERNS = REGEX_PATTERNS;

// User Roles
export const USER_ROLES = {
  ROOT: 'root',
  ADMIN: 'admin',
  USER: 'user',
} as const;

// System User
export const SYSTEM_USER = 'system' as const;

// Export all constants as a single object
export const CONSTANTS = {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  COLLECTIONS,
  DATABASE,
  PATTERNS,
  USER_ROLES,
  SYSTEM_USER
} as const;
