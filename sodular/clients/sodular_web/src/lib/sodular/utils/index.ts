// Utility functions for Sodular SDK

/**
 * Sanitize and build query parameters for API requests
 */
export function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        // Stringify objects (filter, select, sort, options)
        searchParams.append(key, JSON.stringify(value));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

/**
 * Validate request data against schema before sending to backend
 */
export function validateRequestData(data: any, requiredFields: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Request data must be an object');
    return { isValid: false, errors };
  }
  
  // Check required fields
  requiredFields.forEach(field => {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      errors.push(`Required field '${field}' is missing`);
    }
  });
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Sanitize path parameters
 */
export function sanitizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

/**
 * Build full API URL with base URL and path
 */
export function buildApiUrl(baseUrl: string, path: string, queryParams?: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanPath = sanitizePath(path);
  const url = `${cleanBaseUrl}${cleanPath}`;
  
  return queryParams ? `${url}?${queryParams}` : url;
}

/**
 * Handle localStorage operations safely (for browser environment)
 */
export const storage = {
  get: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  set: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
};

/**
 * Token storage keys
 */
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'sodular_access_token',
  REFRESH_TOKEN: 'sodular_refresh_token'
} as const;
