/**
 * Auth Endpoints
 * Define routes for authentication API
 */

import { Router } from 'express';
import { AuthController } from '../controllers';
import { 
  validateLogin,
  validateRegister,
  validateCreateUser,
  validateUpdateUser,
  validateQueryParams,
  validateRefreshTokenQuery,
  parseJsonQueryParams
} from '../validators';
import { authMiddleware, refreshTokenMiddleware } from '@/app/middlewares/auth';
import express from 'express';

const router = Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Register a new user and return user data with tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               username:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', validateRegister, AuthController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     description: Authenticate user and return user data with tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', validateLogin, AuthController.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Generate new access and refresh tokens using refresh token
 *     parameters:
 *       - in: query
 *         name: refreshToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Refresh token
 *       - in: query
 *         name: database_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional database ID
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh-token', validateRefreshTokenQuery, refreshTokenMiddleware, AuthController.refreshToken);

/**
 * @swagger
 * /auth:
 *   post:
 *     tags: [Authentication]
 *     summary: Create user (without tokens)
 *     description: Create a new user without returning authentication tokens
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
 *                 $ref: '#/components/schemas/UserData'
 *               createdBy:
 *                 type: string
 *             required:
 *               - data
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/UserSchema'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, validateCreateUser, AuthController.create);

/**
 * @swagger
 * /auth:
 *   get:
 *     tags: [Authentication]
 *     summary: Get single user
 *     description: Get a single user by filter
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
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/UserSchema'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authMiddleware, validateQueryParams, parseJsonQueryParams, AuthController.get);

/**
 * @swagger
 * /auth/query:
 *   get:
 *     tags: [Authentication]
 *     summary: Query multiple users
 *     description: Query users with filtering, sorting, and pagination
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
 *         description: Users found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueryResult'
 */
router.get('/query', authMiddleware, validateQueryParams, parseJsonQueryParams, AuthController.query);

/**
 * @swagger
 * /auth/count:
 *   get:
 *     tags: [Authentication]
 *     summary: Count users
 *     description: Count users matching filter criteria
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
router.get('/count', authMiddleware, validateQueryParams, parseJsonQueryParams, AuthController.count);

/**
 * @swagger
 * /auth:
 *   put:
 *     tags: [Authentication]
 *     summary: Update users (replace)
 *     description: Replace user data completely
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
 *                 $ref: '#/components/schemas/UserData'
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
 *         description: Users updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.put('/', authMiddleware, validateQueryParams, parseJsonQueryParams, validateUpdateUser, AuthController.put);

/**
 * @swagger
 * /auth:
 *   patch:
 *     tags: [Authentication]
 *     summary: Update users (merge)
 *     description: Merge user data with existing data
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
 *                 $ref: '#/components/schemas/UserData'
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
 *         description: Users updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.patch('/', authMiddleware, validateQueryParams, parseJsonQueryParams, validateUpdateUser, AuthController.patch);

/**
 * @swagger
 * /auth:
 *   delete:
 *     tags: [Authentication]
 *     summary: Delete users
 *     description: Delete users (soft or hard delete)
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
 *         description: Users deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkResult'
 */
router.delete('/', authMiddleware, validateQueryParams, parseJsonQueryParams, AuthController.delete);

export default router;
