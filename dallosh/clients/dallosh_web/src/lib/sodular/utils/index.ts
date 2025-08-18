export function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        searchParams.append(key, JSON.stringify(value));
      } else {
        searchParams.append(key, String(value));
      }
    }
  }
  
  return searchParams.toString();
}

export function buildApiUrl(baseUrl: string, path: string, queryParams?: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${cleanBaseUrl}${cleanPath}`;
  return queryParams ? `${url}?${queryParams}` : url;
}

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
      // Ignore
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
};

export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'sodular_access_token',
  REFRESH_TOKEN: 'sodular_refresh_token'
} as const;



