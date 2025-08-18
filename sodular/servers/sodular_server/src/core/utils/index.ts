/**
 * Core Utilities
 */

import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { env } from '@/configs/env';
import * as fs from 'fs';
import * as path from 'path';

// Logger utility
export class Logger {
  static logToFile(level: string, message: string, data?: any) {
    try {
      const logDir = path.join(__dirname, '../../../logs');
      const logFile = path.join(logDir, 'backend.log');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logMsg = `[${level}] ${new Date().toISOString()} - ${message}` + (data ? ' ' + (typeof data === 'string' ? data : JSON.stringify(data)) : '') + '\n';
      fs.appendFileSync(logFile, logMsg, { encoding: 'utf8' });
    } catch (err) {
      // Fallback: log to console if file write fails
      console.error('[LOGGER FILE ERROR]', err);
    }
  }

  static info(message: string, data?: any) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
    this.logToFile('INFO', message, data);
  }

  static error(message: string, error?: any) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
    this.logToFile('ERROR', message, error);
  }

  static warn(message: string, data?: any) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
    this.logToFile('WARN', message, data);
  }

  static debug(message: string, data?: any) {
    if (env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
      this.logToFile('DEBUG', message, data);
    }
  }
}

// JWT utilities
export class JWTUtils {
  /**
   * Sign a JWT token
   */
  static signToken(payload: any, expiresIn?: string | false): string {
    const options: jwt.SignOptions = {};
    
    if (expiresIn !== false) {
      options.expiresIn = (expiresIn || env.JWT_EXPIRES_IN) as any;
    }
    
    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  /**
   * Sign a refresh token
   */
  static signRefreshToken(payload: any, expiresIn?: string): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: expiresIn || env.JWT_REFRESH_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  /**
   * Verify a JWT token
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify a refresh token
   */
  static verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }
}

// Password utilities
export class PasswordUtils {
  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate a random password
   */
  static generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

// Validation utilities
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): { valid: boolean; message?: string } {
    if (!password || password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    return { valid: true };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }
}

// Date utilities
export class DateUtils {
  /**
   * Get current timestamp
   */
  static getCurrentTimestamp(): number {
    return Date.now();
  }

  /**
   * Format timestamp to ISO string
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }

  /**
   * Add time to current timestamp
   */
  static addTime(amount: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): number {
    const multipliers = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };
    return Date.now() + (amount * multipliers[unit]);
  }
}

// Object utilities
export class ObjectUtils {
  /**
   * Deep merge objects
   */
  static deepMerge(target: any, source: any): any {
    if (!source) return target;
    if (!target) return source;

    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Remove undefined values from object
   */
  static removeUndefined(obj: any): any {
    const result: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  /**
   * Pick specific keys from object
   */
  static pick(obj: any, keys: string[]): any {
    const result: any = {};
    keys.forEach(key => {
      if (obj.hasOwnProperty(key)) {
        result[key] = obj[key];
      }
    });
    return result;
  }
}
