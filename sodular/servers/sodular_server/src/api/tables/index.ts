/**
 * Tables API Module
 * Export all table-related components
 */

export { TablesController } from './controllers';
export { TablesService } from './services';
export { 
  validateCreateTable,
  validateUpdateTable,
  validateQueryParams,
  validateExistsQuery,
  parseJsonQueryParams
} from './validators';
export { default as TablesEndpoints } from './endpoints';
