/**
 * Auth API Validators
 * Validate request body and query parameters for auth endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { REGEX_PATTERNS } from '@/configs/constant';

// Validation schemas
const loginSchema = Joi.object({
  uid: Joi.string()
    .pattern(REGEX_PATTERNS.UUID)
    .optional()
    .messages({
      'string.pattern.base': 'UID must be a valid UUID',
    }),
  data: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required',
      }),
  }).required(),
});

const registerSchema = Joi.object({
  data: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required',
      }),
    username: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Username must be at least 2 characters long',
        'string.max': 'Username must not exceed 50 characters',
      }),
  }).required(),
});

const createUserSchema = Joi.object({
  uid: Joi.string()
    .pattern(REGEX_PATTERNS.UUID)
    .optional()
    .messages({
      'string.pattern.base': 'UID must be a valid UUID',
    }),
  data: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required',
      }),
    username: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Username must be at least 2 characters long',
        'string.max': 'Username must not exceed 50 characters',
      }),
    isEmailVerified: Joi.boolean().optional(),
  }).required(),
  isActive: Joi.boolean().optional(),
  createdBy: Joi.string().optional(),
});

const updateUserSchema = Joi.object({
  uid: Joi.string()
    .pattern(REGEX_PATTERNS.UUID)
    .optional()
    .messages({
      'string.pattern.base': 'UID must be a valid UUID',
    }),
  data: Joi.object({
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address',
      }),
    password: Joi.string()
      .min(6)
      .optional()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
      }),
    username: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Username must be at least 2 characters long',
        'string.max': 'Username must not exceed 50 characters',
      }),
    imageUrl: Joi.string().optional(),
    fields: Joi.object().optional(),
    isEmailVerified: Joi.boolean().optional(),
  }).optional(),
  updatedBy: Joi.string().optional(),
  deletedBy: Joi.string().optional(),
  isDeleted: Joi.boolean().optional(),
  isLocked: Joi.boolean().optional(),
  lockedBy: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

const queryParamsSchema = Joi.object({
  database_id: Joi.string()
    .pattern(REGEX_PATTERNS.UUID)
    .optional()
    .messages({
      'string.pattern.base': 'Database ID must be a valid UUID',
    }),
  filter: Joi.string().optional(),
  select: Joi.string().optional(),
  sort: Joi.string().optional(),
  take: Joi.number().integer().min(1).max(100).optional(),
  skip: Joi.number().integer().min(0).optional(),
  options: Joi.string().optional(),
});

const refreshTokenQuerySchema = Joi.object({
  database_id: Joi.string()
    .pattern(REGEX_PATTERNS.UUID)
    .optional()
    .messages({
      'string.pattern.base': 'Database ID must be a valid UUID',
    }),
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

// Validation middleware factory
function createValidator(schema: Joi.ObjectSchema, target: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = target === 'body' ? req.body : req.query;
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      ResponseHelper.validationError(res, errorMessages.join(', '));
      return;
    }

    // Replace the original data with validated data
    if (target === 'body') {
      req.body = value;
    } else {
      req.query = value;
    }

    next();
  };
}

// Export validators
export const validateLogin = createValidator(loginSchema);
export const validateRegister = createValidator(registerSchema);
export const validateCreateUser = createValidator(createUserSchema);
export const validateUpdateUser = createValidator(updateUserSchema);
export const validateQueryParams = createValidator(queryParamsSchema, 'query');
export const validateRefreshTokenQuery = createValidator(refreshTokenQuerySchema, 'query');

// Helper function to parse JSON query parameters
export const parseJsonQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Parse filter parameter
    if (req.query.filter && typeof req.query.filter === 'string') {
      try {
        req.query.filter = JSON.parse(req.query.filter);
      } catch (error) {
        ResponseHelper.badRequest(res, 'Invalid filter JSON format');
        return;
      }
    }

    // Parse select parameter
    if (req.query.select && typeof req.query.select === 'string') {
      try {
        req.query.select = JSON.parse(req.query.select);
      } catch (error) {
        ResponseHelper.badRequest(res, 'Invalid select JSON format');
        return;
      }
    }

    // Parse sort parameter
    if (req.query.sort && typeof req.query.sort === 'string') {
      try {
        req.query.sort = JSON.parse(req.query.sort);
      } catch (error) {
        ResponseHelper.badRequest(res, 'Invalid sort JSON format');
        return;
      }
    }

    next();
  } catch (error) {
    ResponseHelper.badRequest(res, 'Invalid query parameters');
    return;
  }
};
