/**
 * Ref Endpoints
 * Define routes for ref (document/row) management API
 */

import { Router } from 'express';
import { RefController } from '../controllers';
import { 
  validateCreateRef,
  validateUpdateRef,
  validateQueryParams,
  parseJsonQueryParams
} from '../validators';
import { authMiddleware } from '@/app/middlewares/auth';
import express from 'express';

const router = Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

/**
 * @swagger
 * /ref:
 *   post:
 *     tags: [Ref]
 *     summary: Create a new ref (document/row)
 *     description: Create a new document/row in the specified table
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
 *         description: Table ID to create ref in
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
 *                 description: The document/row data
 *               createdBy:
 *                 type: string
 *             required:
 *               - data
 *     responses:
 *       201:
 *         description: Ref created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RefSchema'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, validateQueryParams, validateCreateRef, RefController.create);

/**
 * @swagger
 * /ref:
 *   get:
 *     tags: [Ref]
 *     summary: Get single ref
 *     description: Get a single document/row by filter
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
 *         description: Table ID to query from
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
 *         description: Ref found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/RefSchema'
 *       404:
 *         description: Ref not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authMiddleware, validateQueryParams, parseJsonQueryParams, RefController.get);

/**
 * @swagger
 * /ref/query:
 *   get:
 *     tags: [Ref]
 *     summary: Query multiple refs
 *     description: Query documents/rows with filtering, sorting, and pagination
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
 *         description: Table ID to query from
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
 *         description: Refs found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueryResult'
 */
router.get('/query', authMiddleware, validateQueryParams, parseJsonQueryParams, RefController.query);

/**
 * @swagger
 * /ref/count:
 *   get:
 *     tags: [Ref]
 *     summary: Count refs
 *     description: Count documents/rows matching filter criteria
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
 *         description: Table ID to count from
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
router.get('/count', authMiddleware, validateQueryParams, parseJsonQueryParams, RefController.count);

/**
 * @swagger
 * /ref:
 *   put:
 *     tags: [Ref]
 *     summary: Update refs (replace)
 *     description: Replace document/row data completely
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
 *         description: Table ID to update in
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
 *                 description: The document/row data
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
 *         description: Refs updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.put('/', authMiddleware, validateQueryParams, parseJsonQueryParams, validateUpdateRef, RefController.put);

/**
 * @swagger
 * /ref:
 *   patch:
 *     tags: [Ref]
 *     summary: Update refs (merge)
 *     description: Merge document/row data with existing data
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
 *         description: Table ID to update in
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
 *                 description: The document/row data
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
 *         description: Refs updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.patch('/', authMiddleware, validateQueryParams, parseJsonQueryParams, validateUpdateRef, RefController.patch);

/**
 * @swagger
 * /ref:
 *   delete:
 *     tags: [Ref]
 *     summary: Delete refs
 *     description: Delete documents/rows (soft or hard delete)
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
 *         description: Table ID to delete from
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
 *         description: Refs deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.delete('/', authMiddleware, validateQueryParams, parseJsonQueryParams, RefController.delete);

export default router;
