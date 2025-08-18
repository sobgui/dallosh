/**
 * Environment Configuration
 * Loads and validates environment variables
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation
function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value && value !== '') {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

function getEnvNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Environment variable ${name} is required`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

function getEnvBoolean(name: string, defaultValue?: boolean): boolean {
  const value = process.env[name];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.toLowerCase() === 'true';
}

// Environment configuration
export const env = {
  // Environment
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  
  // Server
  PORT: getEnvNumber('PORT', 5001),
  HOST: getEnvVar('HOST', '0.0.0.0'),
  ENABLE_SSL: getEnvBoolean('ENABLE_SSL', false),
  SSL_CERT_DIR: process.env.SSL_CERT_DIR,
  SSL_PEM_DIR: process.env.SSL_PEM_DIR,
  
  API_VERSION: getEnvVar('API_VERSION', '/api/v1'),
  API_DOCS: getEnvVar('API_DOCS', '/docs'),
  
  // Security
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_REFRESH_SECRET: getEnvVar('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '1d'),
  JWT_REFRESH_EXPIRES_IN: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', '*'),
  
  HTTP_MAX_LOGIN_ATTEMPTS: getEnvNumber('HTTP_MAX_LOGIN_ATTEMPTS', 4),
  LOCKOUT_TIME: getEnvNumber('LOCKOUT_TIME', 60),
  ACCESS_TOKEN_EXPIRATION_TIME: getEnvNumber('ACCESS_TOKEN_EXPIRATION_TIME', 3600),
  FORGOT_PASSWORD_CODE_EXPIRATION_TIME: getEnvNumber('FORGOT_PASSWORD_CODE_EXPIRATION_TIME', 900),
  CONFIRM_EMAIL_CODE_EXPIRATION_TIME: getEnvNumber('CONFIRM_EMAIL_CODE_EXPIRATION_TIME', 900),
  
  HTTP_MAX_REQUESTS_PER_MINUTE: getEnvNumber('HTTP_MAX_REQUESTS_PER_MINUTE', 20),
  
  // Database
  DB_HOST: getEnvVar('DB_HOST', '0.0.0.0'),
  DB_PORT: getEnvNumber('DB_PORT', 27017),
  DB_NAME: getEnvVar('DB_NAME', 'sodular'),
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  MAX_QUERY_LIMIT: getEnvNumber('MAX_QUERY_LIMIT', 50),

  // Storage Service
  STORAGE_TYPE:getEnvVar('STORAGE_TYPE', 'local'),  // local storage, s3, gcs, azure
  LOCAL_STORAGE_PATH:getEnvVar('LOCAL_STORAGE_PATH', '/storage'),  // for local storage, default it is /storage, in the root of the project
  PREFIX_PATH:getEnvVar('PREFIX_PATH', ''),
  CHUNK_FILE_SIZE:getEnvNumber('CHUNK_FILE_SIZE', 50000000),  // 50MB, chunk file size when uploading heavy file, default is 50MB
  
  // Root User
  ROOT_USERNAME: getEnvVar('ROOT_USERNAME', 'root'),
  ROOT_ROLE_NAME: getEnvVar('ROOT_ROLE_NAME', 'root'),
  ROOT_EMAIL: getEnvVar('ROOT_EMAIL', 'root@sodular.com'),
  ROOT_PASSWORD: getEnvVar('ROOT_PASSWORD', 'root123'),
};

// Environment helpers
export const isDevelopment = env.NODE_ENV === 'development' || env.NODE_ENV === 'dev' || env.NODE_ENV === 'd';
export const isProduction = env.NODE_ENV === 'production' || env.NODE_ENV === 'prod' || env.NODE_ENV === 'p';
export const isTest = env.NODE_ENV === 'test' || env.NODE_ENV === 't';

// Export as ENV for backward compatibility
export const ENV = env;
