/**
 * Files Endpoints
 * Define routes for files management API
 */

import { Router } from 'express';
import { FilesController } from '../controllers';
import { validateUploadFile, validateUpdateFile, validateQueryParams, parseJsonQueryParams } from '../validators';
import { authMiddleware } from '@/app/middlewares/auth';
import express from 'express';
import busboy from 'busboy';

const router = Router();

function busboyMiddleware(req: any, res: any, next: any) {
  if (req.method !== 'POST') return next();
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) return next();
  const bb = busboy({ headers: req.headers });
  const result: { files: any[]; fields: Record<string, any> } = { files: [], fields: {} };
  let fileHandled = false;
  bb.on('file', (name: string, file: any, info: any) => {
    // Only handle the first file for now
    if (!fileHandled) {
      result.files.push({
        stream: file,
        filename: info.filename,
        encoding: info.encoding,
        mimeType: info.mimeType,
        fieldname: name
      });
      fileHandled = true;
    } else {
      file.resume(); // Discard additional files
    }
  });
  bb.on('field', (name: string, val: any) => {
    result.fields[name] = val;
  });
  bb.on('finish', () => {
    req.busboyResult = result;
    next();
  });
  req.pipe(bb);
}

router.post('/upload', authMiddleware, FilesController.upload);
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
router.get('/download', authMiddleware, validateQueryParams, parseJsonQueryParams, FilesController.download);
router.get('/', authMiddleware, validateQueryParams, parseJsonQueryParams, FilesController.get);
router.get('/query', authMiddleware, validateQueryParams, parseJsonQueryParams, FilesController.query);
router.get('/count', authMiddleware, validateQueryParams, parseJsonQueryParams, FilesController.count);
router.delete('/', authMiddleware, validateQueryParams, parseJsonQueryParams, FilesController.delete);
router.patch('/', authMiddleware, validateQueryParams, validateUpdateFile, FilesController.patch);

export default router; 