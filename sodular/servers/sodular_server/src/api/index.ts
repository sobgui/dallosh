/**
 * API Index
 * Main entry point for all API endpoints
 */

import { Router } from 'express';
import AuthEndpoints from './auth/endpoints';
import DatabaseEndpoints from './database/endpoints';
import TablesEndpoints from './tables/endpoints';
import RefEndpoints from './ref/endpoints';
import FilesEndpoints from './files/endpoints';
import StorageEndpoints from './storage/endpoints';
import BucketsEndpoints from './buckets/endpoints';

// Create main API router
const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    data: {
      status: 'ok',
      timestamp: Date.now(),
      service: 'Sodular Backend API',
      version: '1.0.0'
    }
  });
});

// Mount API endpoints
apiRouter.use('/auth', AuthEndpoints);
apiRouter.use('/database', DatabaseEndpoints);
apiRouter.use('/tables', TablesEndpoints);
apiRouter.use('/ref', RefEndpoints);
apiRouter.use('/files', FilesEndpoints);
apiRouter.use('/storage', StorageEndpoints);
apiRouter.use('/buckets', BucketsEndpoints);

// Export API endpoints array for SodularServer
export const APIEndpoints = [
  {
    path: '/auth',
    router: AuthEndpoints
  },
  {
    path: '/database', 
    router: DatabaseEndpoints
  },
  {
    path: '/tables',
    router: TablesEndpoints
  },
  {
    path: '/ref',
    router: RefEndpoints
  },
  {
    path: '/files',
    router: FilesEndpoints
  },
  {
    path: '/storage',
    router: StorageEndpoints
  },
  {
    path: '/buckets',
    router: BucketsEndpoints
  }
];

export default apiRouter;
