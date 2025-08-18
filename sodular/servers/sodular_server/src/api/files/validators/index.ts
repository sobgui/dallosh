/**
 * Files Validators
 * Validate requests for files management endpoints
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '@/core/helpers';
import { CONSTANTS } from '@/configs/constant';

const uploadFileSchema = Joi.object({
  uid: Joi.string().pattern(CONSTANTS.PATTERNS.UUID).optional(),
  data: Joi.object({
    bucket_id: Joi.string().pattern(CONSTANTS.PATTERNS.UUID).required(),
    filename: Joi.string().required(),
    parts: Joi.array().items(Joi.object({
      order: Joi.number().required(),
      file_id: Joi.string().pattern(CONSTANTS.PATTERNS.UUID).required(),
      ext: Joi.string().required(),
      size: Joi.number().required(),
      file_path: Joi.string().required(),
    })).optional(),
    path: Joi.string().required(),
    size: Joi.number().required(),
    ext: Joi.string().required(),
    type: Joi.string().required(),
    downloadUrl: Joi.string().required(),
  }).unknown(true).required(),
  createdBy: Joi.string().optional(),
  isActive: Joi.boolean().optional()
}).unknown(true);

const updateFileSchema = Joi.object({
  data: Joi.object({
    filename: Joi.string().optional(),
    file_path: Joi.string().optional(),
  }).optional(),
  isDeleted: Joi.boolean().optional(),
  isLocked: Joi.boolean().optional(),
  lockedBy: Joi.string().optional(),
  isActive: Joi.boolean().optional()
});

const queryParamsSchema = Joi.object({
  database_id:Joi.string().optional(),
  storage_id: Joi.string().optional(),
  bucket_id: Joi.string().optional(),
  file_id: Joi.string().optional(),
  filter: Joi.string().optional(),
  select: Joi.string().optional(),
  sort: Joi.string().optional(),
  take: Joi.number().integer().min(1).max(CONSTANTS.DATABASE.MAX_QUERY_LIMIT).optional(),
  skip: Joi.number().integer().min(0).optional(),
  options: Joi.string().optional()
});

export const validateUploadFile = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = uploadFileSchema.validate(req.body);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

export const validateUpdateFile = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = updateFileSchema.validate(req.body);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

export const validateQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = queryParamsSchema.validate(req.query);
  if (error) {
    ResponseHelper.validationError(res, error.details[0].message);
    return;
  }
  next();
};

export const parseJsonQueryParams = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (req.query.filter && typeof req.query.filter === 'string') {
      try { req.query.filter = JSON.parse(req.query.filter); } catch { ResponseHelper.badRequest(res, 'Invalid filter JSON format'); return; }
    }
    if (req.query.select && typeof req.query.select === 'string') {
      try { req.query.select = JSON.parse(req.query.select); } catch { ResponseHelper.badRequest(res, 'Invalid select JSON format'); return; }
    }
    if (req.query.sort && typeof req.query.sort === 'string') {
      try { req.query.sort = JSON.parse(req.query.sort); } catch { ResponseHelper.badRequest(res, 'Invalid sort JSON format'); return; }
    }
    if (req.query.options && typeof req.query.options === 'string') {
      try { req.query.options = JSON.parse(req.query.options); } catch { ResponseHelper.badRequest(res, 'Invalid options JSON format'); return; }
    }
    if (req.query.take) (req.query as any).take = parseInt(req.query.take as string, 10);
    if (req.query.skip) (req.query as any).skip = parseInt(req.query.skip as string, 10);
    next();
  } catch { ResponseHelper.badRequest(res, 'Invalid query parameters'); return; }
}; 