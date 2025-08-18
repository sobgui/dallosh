/**
 * Tables Validators
 * Validate requests for table management endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { CONSTANTS } from '@/configs/constant';

// Table creation/update validation schema
const tableDataSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Table name can only contain letters, numbers, underscores, and hyphens',
      'string.min': 'Table name must be at least 1 character long',
      'string.max': 'Table name cannot exceed 100 characters'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
}).unknown(true);

const createTableSchema = Joi.object({
  uid: Joi.string()
    .pattern(CONSTANTS.PATTERNS.UUID)
    .optional()
    .messages({
      'string.pattern.base': 'UID must be a valid UUID'
    }),
  data: tableDataSchema.required(),
  createdBy: Joi.string()
    .optional(),
  isActive: Joi.string().optional()
});

const updateTableSchema = Joi.object({
  uid: Joi.string()
    .pattern(CONSTANTS.PATTERNS.UUID)
    .optional(),
  data: tableDataSchema.optional(),
  updatedBy: Joi.string().optional(),
  isDeleted: Joi.boolean().optional(),
  isLocked: Joi.boolean().optional(),
  lockedBy: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

// Patch table schema - allows partial data updates
const patchTableDataSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .optional() // Name is optional for PATCH operations
    .messages({
      'string.pattern.base': 'Table name can only contain letters, numbers, underscores, and hyphens',
      'string.min': 'Table name must be at least 1 character long',
      'string.max': 'Table name cannot exceed 100 characters'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow(''),
  
}).unknown(true);

const patchTableSchema = Joi.object({
  uid: Joi.string()
    .pattern(CONSTANTS.PATTERNS.UUID)
    .optional(),
  data: patchTableDataSchema.optional(),
  updatedBy: Joi.string().optional(),
  isDeleted: Joi.boolean().optional(),
  isLocked: Joi.boolean().optional(),
  lockedBy: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

// Query parameters validation
const queryParamsSchema = Joi.object({
  database_id: Joi.string()
    .pattern(CONSTANTS.PATTERNS.UUID)
    .optional()
    .messages({
      'string.pattern.base': 'database_id must be a valid UUID'
    }),
  filter: Joi.string().optional(),
  select: Joi.string().optional(),
  sort: Joi.string().optional(),
  take: Joi.number()
    .integer()
    .min(1)
    .max(CONSTANTS.DATABASE.MAX_QUERY_LIMIT)
    .optional(),
  skip: Joi.number()
    .integer()
    .min(0)
    .optional(),
  options: Joi.string().optional()
});

const existsQuerySchema = Joi.object({
  database_id: Joi.string()
    .pattern(CONSTANTS.PATTERNS.UUID)
    .optional()
    .messages({
      'string.pattern.base': 'database_id must be a valid UUID'
    }),
  table_id: Joi.string()
    .pattern(CONSTANTS.PATTERNS.UUID)
    .required()
    .messages({
      'string.pattern.base': 'table_id must be a valid UUID',
      'any.required': 'table_id is required for exists check'
    })
});

/**
 * Validate table creation request
 */
export const validateCreateTable = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = createTableSchema.validate(req.body);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

/**
 * Validate table update request (PUT)
 */
export const validateUpdateTable = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = updateTableSchema.validate(req.body);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

/**
 * Validate table patch request (PATCH)
 */
export const validatePatchTable = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = patchTableSchema.validate(req.body);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

/**
 * Validate query parameters
 */
export const validateQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = queryParamsSchema.validate(req.query);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

/**
 * Validate exists query parameters
 */
export const validateExistsQuery = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = existsQuerySchema.validate(req.query);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

/**
 * Parse JSON query parameters
 */
export const parseJsonQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Parse filter
    if (req.query.filter && typeof req.query.filter === 'string') {
      try {
        req.query.filter = JSON.parse(req.query.filter);
      } catch (error) {
        ResponseHelper.badRequest(res, 'Invalid filter JSON format');
        return;
      }
    }

    // Parse select
    if (req.query.select && typeof req.query.select === 'string') {
      try {
        req.query.select = JSON.parse(req.query.select);
      } catch (error) {
        ResponseHelper.badRequest(res, 'Invalid select JSON format');
        return;
      }
    }

    // Parse sort
    if (req.query.sort && typeof req.query.sort === 'string') {
      try {
        req.query.sort = JSON.parse(req.query.sort);
      } catch (error) {
        ResponseHelper.badRequest(res, 'Invalid sort JSON format');
        return;
      }
    }

    // Parse options
    if (req.query.options && typeof req.query.options === 'string') {
      try {
        req.query.options = JSON.parse(req.query.options);
      } catch (error) {
        ResponseHelper.badRequest(res, 'Invalid options JSON format');
        return;
      }
    }

    // Convert numeric parameters
    if (req.query.take) {
      (req.query as any).take = parseInt(req.query.take as string, 10);
    }
    if (req.query.skip) {
      (req.query as any).skip = parseInt(req.query.skip as string, 10);
    }

    next();
  } catch (error) {
    ResponseHelper.badRequest(res, 'Invalid query parameters');
  }
};
