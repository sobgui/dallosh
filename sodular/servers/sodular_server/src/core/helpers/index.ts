/**
 * Response Helpers
 * Standardized response formats for the API
 */

import { Response } from 'express';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/configs/constant';
import { Logger } from '../utils';

// Base response interface
export interface ApiResponse<T = any> {
  error?: string;
  data?: T;
}

// Response helper class
export class ResponseHelper {
  /**
   * Send success response
   */
  static success<T>(res: Response, data: T, statusCode: number = HTTP_STATUS.OK): Response {
    const response: ApiResponse<T> = { data };
    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(res: Response, error: string, statusCode: number = HTTP_STATUS.BAD_REQUEST): Response {
    const response: ApiResponse = { error };
    Logger.error(`API Error: ${error}`, { statusCode });
    return res.status(statusCode).json(response);
  }

  /**
   * Send created response
   */
  static created<T>(res: Response, data: T): Response {
    return this.success(res, data, HTTP_STATUS.CREATED);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Send bad request response
   */
  static badRequest(res: Response, error: string = ERROR_MESSAGES.INVALID_REQUEST): Response {
    return this.error(res, error, HTTP_STATUS.BAD_REQUEST);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res: Response, error: string = ERROR_MESSAGES.TOKEN_REQUIRED): Response {
    return this.error(res, error, HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Send forbidden response
   */
  static forbidden(res: Response, error: string = ERROR_MESSAGES.ACCESS_DENIED): Response {
    return this.error(res, error, HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Send not found response
   */
  static notFound(res: Response, error: string = ERROR_MESSAGES.RECORD_NOT_FOUND): Response {
    return this.error(res, error, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Send conflict response
   */
  static conflict(res: Response, error: string = ERROR_MESSAGES.RECORD_ALREADY_EXISTS): Response {
    return this.error(res, error, HTTP_STATUS.CONFLICT);
  }

  /**
   * Send unprocessable entity response
   */
  static unprocessableEntity(res: Response, error: string = ERROR_MESSAGES.VALIDATION_ERROR): Response {
    return this.error(res, error, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  /**
   * Send too many requests response
   */
  static tooManyRequests(res: Response, error: string = ERROR_MESSAGES.TOO_MANY_REQUESTS): Response {
    return this.error(res, error, HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  /**
   * Send internal server error response
   */
  static internalError(res: Response, error: string = ERROR_MESSAGES.INTERNAL_ERROR): Response {
    return this.error(res, error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  /**
   * Send service unavailable response
   */
  static serviceUnavailable(res: Response, error: string = ERROR_MESSAGES.SERVICE_UNAVAILABLE): Response {
    return this.error(res, error, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  /**
   * Handle database result and send appropriate response
   */
  static handleDatabaseResult<T>(res: Response, result: { value?: T; error?: string }, successStatus: number = HTTP_STATUS.OK): Response {
    if (result.error) {
      // Return 404 for not found errors
      const notFoundErrors = [
        'File not found',
        'Document not found',
        'Bucket not found',
        'Storage not found',
        'Record not found',
      ];
      if (notFoundErrors.some(msg => result.error?.toLowerCase().includes(msg.toLowerCase()))) {
        return this.notFound(res, result.error);
      }
      return this.badRequest(res, result.error);
    }
    return this.success(res, result.value, successStatus);
  }

  /**
   * Handle authentication response (special case for login/register)
   */
  static authSuccess(res: Response, data: any): Response {
    return this.success(res, data, HTTP_STATUS.OK);
  }

  /**
   * Handle validation errors
   */
  static validationError(res: Response, errors: any): Response {
    const errorMessage = Array.isArray(errors) 
      ? errors.map(err => err.message || err).join(', ')
      : errors.message || errors.toString();
    
    return this.unprocessableEntity(res, errorMessage);
  }
}

// Error response classes for throwing
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.INVALID_REQUEST) {
    super(message, HTTP_STATUS.BAD_REQUEST);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.TOKEN_REQUIRED) {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.ACCESS_DENIED) {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.RECORD_NOT_FOUND) {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.RECORD_ALREADY_EXISTS) {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.VALIDATION_ERROR) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message: string = ERROR_MESSAGES.TOO_MANY_REQUESTS) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }
}
