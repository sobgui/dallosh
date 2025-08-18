/**
 * Buckets Endpoints
 * Define routes for buckets management API
 */

import { Router } from 'express';
import { BucketsController } from '../controllers';
import { validateCreateBucket, validateUpdateBucket, validateQueryParams, parseJsonQueryParams } from '../validators';
import { authMiddleware } from '@/app/middlewares/auth';
import express from 'express';

const router = Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post('/', authMiddleware, validateQueryParams, validateCreateBucket, BucketsController.create);
router.get('/', authMiddleware, validateQueryParams, parseJsonQueryParams, BucketsController.get);
router.get('/query', authMiddleware, validateQueryParams, parseJsonQueryParams, BucketsController.query);
router.get('/count', authMiddleware, validateQueryParams, parseJsonQueryParams, BucketsController.count);
router.put('/', authMiddleware, validateQueryParams, validateUpdateBucket, BucketsController.put);
router.patch('/', authMiddleware, validateQueryParams, validateUpdateBucket, BucketsController.patch);
router.delete('/', authMiddleware, validateQueryParams, parseJsonQueryParams, BucketsController.delete);

export default router; 