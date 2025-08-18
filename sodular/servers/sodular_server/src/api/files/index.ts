/**
 * Files API Module
 * Export all files-related components
 */

export { FilesController } from './controllers';
export { FilesService } from './services';
export {
  validateUploadFile,
  validateUpdateFile,
  validateQueryParams as validateFilesQueryParams,
  parseJsonQueryParams as parseFilesJsonQueryParams
} from './validators';
export { default as FilesEndpoints } from './endpoints'; 