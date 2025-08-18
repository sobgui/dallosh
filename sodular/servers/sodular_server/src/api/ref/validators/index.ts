/**
 * Ref Validators
 * Validate requests for ref (document/row) management endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { CONSTANTS } from '@/configs/constant';

// Ref creation/update validation schema
const createRefSchema = Joi.object({
  uid: Joi.string()
    .pattern(CONSTANTS.PATTERNS.UUID)
    .optional()
    .messages({
      'string.pattern.base': 'UID must be a valid UUID'
    }),
  data: Joi.object()
    .required()
    .messages({
      'any.required': 'Data is required'
    }),
  createdBy: Joi.string()
    .optional(),
  isActive: Joi.boolean().optional()
});

const updateRefSchema = Joi.object({
  uid: Joi.string()
    .pattern(CONSTANTS.PATTERNS.UUID)
    .optional(),
  data: Joi.object().optional(),
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
  table_id: Joi.string()
    .pattern(CONSTANTS.PATTERNS.UUID)
    .required()
    .messages({
      'string.pattern.base': 'table_id must be a valid UUID',
      'any.required': 'table_id is required for ref operations'
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

/**
 * Validate ref creation request
 */
export const validateCreateRef = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = createRefSchema.validate(req.body);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

/**
 * Validate ref update request
 */
export const validateUpdateRef = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = updateRefSchema.validate(req.body);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

/**
 * Validate query parameters (including required table_id)
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
