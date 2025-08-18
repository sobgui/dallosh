/**
 * Authentication Middleware
 * Simple JWT middleware to authenticate valid tokens in headers authorization bearer
 */

import { Request, Response, NextFunction } from 'express';
import { JWTUtils, Logger } from '@/core/utils';
import { ResponseHelper } from '@/core/helpers';
import { ERROR_MESSAGES } from '@/configs/constant';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        username?: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.TOKEN_REQUIRED);
      return;
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      ResponseHelper.unauthorized(res, 'Invalid authorization format. Use Bearer token');
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.TOKEN_REQUIRED);
      return;
    }

    // Verify token
    const decoded = JWTUtils.verifyToken(token);
    
    // Add user info to request
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      username: decoded.username,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    Logger.debug('User authenticated:', { uid: req.user.uid, email: req.user.email });
    
    next();
  } catch (error) {
    Logger.error('Authentication error:', error);
    
    if (error instanceof Error && error.message.includes('expired')) {
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.TOKEN_EXPIRED);
    } else if (error instanceof Error && (error.message.includes('invalid') || error.message.includes('malformed'))) {
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.TOKEN_INVALID);
    } else {
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.TOKEN_INVALID);
    }
  }
};

/**
 * Optional authentication middleware
 * Validates JWT token if present, but doesn't require it
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      next();
      return;
    }

    // Try to verify token
    const decoded = JWTUtils.verifyToken(token);
    
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      username: decoded.username,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    Logger.debug('User optionally authenticated:', { uid: req.user.uid, email: req.user.email });
    
    next();
  } catch (error) {
    // Token is invalid, but we continue without authentication
    Logger.debug('Optional authentication failed, continuing without auth:', error instanceof Error ? error.message : String(error));
    next();
  }
};

/**
 * Refresh token middleware
 * Validates refresh token from query parameter
 */
export const refreshTokenMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const refreshToken = req.query.refreshToken as string;
    
    if (!refreshToken) {
      ResponseHelper.badRequest(res, 'Refresh token is required');
      return;
    }

    // Verify refresh token
    const decoded = JWTUtils.verifyRefreshToken(refreshToken);
    
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      username: decoded.username,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    Logger.debug('Refresh token validated:', { uid: req.user.uid, email: req.user.email });
    
    next();
  } catch (error) {
    Logger.error('Refresh token validation error:', error);
    
    if (error instanceof Error && error.message.includes('expired')) {
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED);
    } else {
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.REFRESH_TOKEN_INVALID);
    }
  }
};
