/**
 * Storage Endpoints
 * Define routes for storage management API
 */

import { Router } from 'express';
import { StorageController } from '../controllers';
import { validateCreateStorage, validateUpdateStorage, validateQueryParams, parseJsonQueryParams } from '../validators';
import { authMiddleware } from '@/app/middlewares/auth';
import express from 'express';

const router = Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post('/', authMiddleware, validateQueryParams, validateCreateStorage, StorageController.create);
router.get('/', authMiddleware, validateQueryParams, parseJsonQueryParams, StorageController.get);
router.get('/query', authMiddleware, validateQueryParams, parseJsonQueryParams, StorageController.query);
router.get('/count', authMiddleware, validateQueryParams, parseJsonQueryParams, StorageController.count);
router.put('/', authMiddleware, validateQueryParams, validateUpdateStorage, StorageController.put);
router.patch('/', authMiddleware, validateQueryParams, validateUpdateStorage, StorageController.patch);
router.delete('/', authMiddleware, validateQueryParams, parseJsonQueryParams, StorageController.delete);

export default router; 