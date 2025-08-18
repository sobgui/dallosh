/**
 * Swagger API Documentation Configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '@/configs/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sodular API',
      version: '1.0.0',
      description: 'Sodular Headless CMS - Database Agnostic REST API',
      contact: {
        name: 'Sodular Team',
        email: 'support@sodular.com',
      },
    },
    servers: [
      {
        url: `http://${env.HOST}:${env.PORT}${env.API_VERSION}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
          required: ['error'],
        },
        Success: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
          required: ['data'],
        },
        UserData: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password',
            },
            username: {
              type: 'string',
              description: 'User username (optional)',
            },
            isActive: {
              type: 'boolean',
              description: 'User active status',
            },
            isEmailVerified: {
              type: 'boolean',
              description: 'Email verification status',
            },
          },
          required: ['email', 'password'],
        },
        UserSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier',
            },
            data: {
              $ref: '#/components/schemas/UserData',
            },
            createdAt: {
              type: 'number',
              description: 'Creation timestamp',
            },
            createdBy: {
              type: 'string',
              description: 'Creator ID or "system"',
            },
            updatedAt: {
              type: 'number',
              description: 'Last update timestamp',
            },
            updatedBy: {
              type: 'string',
              description: 'Last updater ID or "system"',
            },
            deletedAt: {
              type: 'number',
              description: 'Deletion timestamp (optional)',
            },
            isDeleted: {
              type: 'boolean',
              description: 'Soft delete flag',
            },
            deletedBy: {
              type: 'string',
              description: 'Deleter ID or "system"',
            },
            lockedAt: {
              type: 'number',
              description: 'Lock timestamp (optional)',
            },
            isLocked: {
              type: 'boolean',
              description: 'Lock flag',
            },
            lockedBy: {
              type: 'string',
              description: 'Locker ID or "system"',
            },
          },
          required: ['uid', 'data', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'],
        },
        DatabaseData: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Database name',
            },
            description: {
              type: 'string',
              description: 'Database description (optional)',
            },
          },
          required: ['name'],
        },
        TableData: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Table name (unique)',
            },
            description: {
              type: 'string',
              description: 'Table description (optional)',
            },
          },
          required: ['name'],
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
            },
          },
          required: ['accessToken', 'refreshToken'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/UserSchema',
                },
                tokens: {
                  $ref: '#/components/schemas/AuthTokens',
                },
              },
              required: ['user', 'tokens'],
            },
          },
          required: ['data'],
        },
        QueryResult: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                list: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                  description: 'Array of results',
                },
                total: {
                  type: 'number',
                  description: 'Total count of results',
                },
              },
              required: ['list', 'total'],
            },
          },
          required: ['data'],
        },
        CountResult: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                total: {
                  type: 'number',
                  description: 'Total count',
                },
              },
              required: ['total'],
            },
          },
          required: ['data'],
        },
        BulkResult: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                list: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      uid: {
                        type: 'string',
                        format: 'uuid',
                      },
                    },
                    required: ['uid'],
                  },
                  description: 'Array of affected record IDs',
                },
                total: {
                  type: 'number',
                  description: 'Total count of affected records',
                },
              },
              required: ['list', 'total'],
            },
          },
          required: ['data'],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/api/**/*.ts', // Path to the API files
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
