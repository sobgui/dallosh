/**
 * Database Endpoints
 * Define routes for database management API
 */

import { Router } from 'express';
import { DatabaseController } from '../controllers';
import { 
  validateCreateDatabase,
  validateUpdateDatabase,
  validateQueryParams,
  validateExistsQuery,
  parseJsonQueryParams
} from '../validators';
import { authMiddleware } from '@/app/middlewares/auth';
import express from 'express';

const router = Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

/**
 * @swagger
 * /database/exists:
 *   get:
 *     tags: [Database]
 *     summary: Check if database exists
 *     description: Check if a specific database exists
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Database ID to check
 *     responses:
 *       200:
 *         description: Database existence check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/exists', authMiddleware, validateExistsQuery, DatabaseController.exists);

/**
 * @swagger
 * /database:
 *   post:
 *     tags: [Database]
 *     summary: Create a new database
 *     description: Create a new database with specified configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional parent database ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *                 format: uuid
 *               data:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     pattern: '^[a-zA-Z0-9_-]+$'
 *                   description:
 *                     type: string
 *                 required:
 *                   - name
 *               createdBy:
 *                 type: string
 *             required:
 *               - data
 *     responses:
 *       201:
 *         description: Database created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DatabaseSchema'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, validateCreateDatabase, DatabaseController.create);

/**
 * @swagger
 * /database:
 *   get:
 *     tags: [Database]
 *     summary: Get single database
 *     description: Get a single database by filter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID to query from
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: JSON filter object
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         description: JSON array of fields to select
 *     responses:
 *       200:
 *         description: Database found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DatabaseSchema'
 *       404:
 *         description: Database not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authMiddleware, validateQueryParams, parseJsonQueryParams, DatabaseController.get);

/**
 * @swagger
 * /database/query:
 *   get:
 *     tags: [Database]
 *     summary: Query multiple databases
 *     description: Query databases with filtering, sorting, and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID to query from
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: JSON filter object
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         description: JSON array of fields to select
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: JSON sort object
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records to take
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Databases found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueryResult'
 */
router.get('/query', authMiddleware, validateQueryParams, parseJsonQueryParams, DatabaseController.query);

/**
 * @swagger
 * /database/count:
 *   get:
 *     tags: [Database]
 *     summary: Count databases
 *     description: Count databases matching filter criteria
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID to query from
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: JSON filter object
 *     responses:
 *       200:
 *         description: Count result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountResult'
 */
router.get('/count', authMiddleware, validateQueryParams, parseJsonQueryParams, DatabaseController.count);

/**
 * @swagger
 * /database:
 *   put:
 *     tags: [Database]
 *     summary: Update databases (replace)
 *     description: Replace database data completely
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID to update in
 *       - in: query
 *         name: filter
 *         required: true
 *         schema:
 *           type: string
 *         description: JSON filter object
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *                 format: uuid
 *               data:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *               updatedBy:
 *                 type: string
 *               isDeleted:
 *                 type: boolean
 *               isLocked:
 *                 type: boolean
 *               lockedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Databases updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.put('/', authMiddleware, validateQueryParams, parseJsonQueryParams, validateUpdateDatabase, DatabaseController.put);

/**
 * @swagger
 * /database:
 *   patch:
 *     tags: [Database]
 *     summary: Update databases (merge)
 *     description: Merge database data with existing data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID to update in
 *       - in: query
 *         name: filter
 *         required: true
 *         schema:
 *           type: string
 *         description: JSON filter object
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *                 format: uuid
 *               data:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *               updatedBy:
 *                 type: string
 *               isDeleted:
 *                 type: boolean
 *               isLocked:
 *                 type: boolean
 *               lockedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Databases updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.patch('/', authMiddleware, validateQueryParams, parseJsonQueryParams, validateUpdateDatabase, DatabaseController.patch);

/**
 * @swagger
 * /database:
 *   delete:
 *     tags: [Database]
 *     summary: Delete databases
 *     description: Delete databases (soft or hard delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID to delete from
 *       - in: query
 *         name: filter
 *         required: true
 *         schema:
 *           type: string
 *         description: JSON filter object
 *       - in: query
 *         name: options
 *         schema:
 *           type: string
 *         description: JSON options object (withSoftDelete, deletedBy)
 *     responses:
 *       200:
 *         description: Databases deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.delete('/', authMiddleware, validateQueryParams, parseJsonQueryParams, DatabaseController.delete);

export default router;
