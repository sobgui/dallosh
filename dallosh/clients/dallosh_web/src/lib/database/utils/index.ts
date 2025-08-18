/**
 * Database Utilities
 */

import { v4 as uuidv4 } from 'uuid';
import { Filter, FilterCondition } from '../types';

/**
 * Generate UUID if not provided
 */
export function generateUid(uid?: string): string {
  return uid || uuidv4();
}

/**
 * Get current timestamp
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Convert MongoDB-like filter to native MongoDB filter
 */
export function convertFilter(filter: Filter): any {
  if (!filter) return {};

  const mongoFilter: any = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or' || key === '$and') {
      mongoFilter[key] = value.map((subFilter: Filter) => convertFilter(subFilter));
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const condition = value as FilterCondition;
      const mongoCondition: any = {};

      for (const [condKey, condValue] of Object.entries(condition)) {
        switch (condKey) {
          case '$like':
            // Convert wildcard pattern to regex
            const pattern = condValue.replace(/\*/g, '.*');
            mongoCondition.$regex = new RegExp(`^${pattern}$`, 'i');
            break;
          case '$reg':
            const flags = (condition as any).$options || '';
            mongoCondition.$regex = new RegExp(condValue, flags);
            break;
          case '$gt':
          case '$gte':
          case '$lt':
          case '$lte':
          case '$eq':
          case '$ne':
          case '$in':
          case '$nin':
            mongoCondition[condKey] = condValue;
            break;
        }
      }

      mongoFilter[key] = Object.keys(mongoCondition).length > 0 ? mongoCondition : value;
    } else {
      mongoFilter[key] = value;
    }
  }

  return mongoFilter;
}

/**
 * Convert sort object to MongoDB sort
 */
export function convertSort(sort?: Record<string, 'asc' | 'desc' | 1 | -1>): any {
  if (!sort) return {};

  const mongoSort: any = {};
  for (const [key, value] of Object.entries(sort)) {
    if (value === 'asc') {
      mongoSort[key] = 1;
    } else if (value === 'desc') {
      mongoSort[key] = -1;
    } else {
      mongoSort[key] = value;
    }
  }

  return mongoSort;
}

/**
 * Build database name with prefix
 */
export function buildDatabaseName(primaryDbName: string, databaseId?: string): string {
  if (!databaseId) return primaryDbName;
  return `${primaryDbName}_${databaseId.replace(/-/g, '_')}`;
}

/**
 * Build table/collection name with prefix
 */
export function buildTableName(tableId: string): string {
  return `table_${tableId.replace(/-/g, '_')}`;
}

/**
 * Validate required fields
 */
export function validateRequired(obj: any, fields: string[]): string | null {
  for (const field of fields) {
    if (!obj[field]) {
      return `Field '${field}' is required`;
    }
  }
  return null;
}
