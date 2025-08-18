/**
 * Tables Endpoints
 * Define routes for table management API
 */

import { Router } from 'express';
import { TablesController } from '../controllers';
import {
  validateCreateTable,
  validateUpdateTable,
  validatePatchTable,
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
 * /tables/exists:
 *   get:
 *     tags: [Tables]
 *     summary: Check if table exists
 *     description: Check if a specific table exists in a database
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID
 *       - in: query
 *         name: table_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Table ID to check
 *     responses:
 *       200:
 *         description: Table existence check result
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
router.get('/exists', authMiddleware, validateExistsQuery, TablesController.exists);

/**
 * @swagger
 * /tables:
 *   post:
 *     tags: [Tables]
 *     summary: Create a new table
 *     description: Create a new table in the specified database
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID
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
 *         description: Table created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/TableSchema'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, validateCreateTable, TablesController.create);

/**
 * @swagger
 * /tables:
 *   get:
 *     tags: [Tables]
 *     summary: Get single table
 *     description: Get a single table by filter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID
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
 *         description: Table found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/TableSchema'
 *       404:
 *         description: Table not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authMiddleware, validateQueryParams, parseJsonQueryParams, TablesController.get);

/**
 * @swagger
 * /tables/query:
 *   get:
 *     tags: [Tables]
 *     summary: Query multiple tables
 *     description: Query tables with filtering, sorting, and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID
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
 *         description: Tables found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueryResult'
 */
router.get('/query', authMiddleware, validateQueryParams, parseJsonQueryParams, TablesController.query);

/**
 * @swagger
 * /tables/count:
 *   get:
 *     tags: [Tables]
 *     summary: Count tables
 *     description: Count tables matching filter criteria
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID
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
router.get('/count', authMiddleware, validateQueryParams, parseJsonQueryParams, TablesController.count);

/**
 * @swagger
 * /tables:
 *   put:
 *     tags: [Tables]
 *     summary: Update tables (replace)
 *     description: Replace table data completely
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID
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
 *         description: Tables updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.put('/', authMiddleware, validateQueryParams, parseJsonQueryParams, validateUpdateTable, TablesController.put);

/**
 * @swagger
 * /tables:
 *   patch:
 *     tags: [Tables]
 *     summary: Update tables (merge)
 *     description: Merge table data with existing data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID
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
 *         description: Tables updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.patch('/', authMiddleware, validateQueryParams, parseJsonQueryParams, validatePatchTable, TablesController.patch);

/**
 * @swagger
 * /tables:
 *   delete:
 *     tags: [Tables]
 *     summary: Delete tables
 *     description: Delete tables (soft or hard delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID
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
 *         description: Tables deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.delete('/', authMiddleware, validateQueryParams, parseJsonQueryParams, TablesController.delete);

export default router;
