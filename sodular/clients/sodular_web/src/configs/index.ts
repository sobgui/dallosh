
function getLocalBaseUrl() {
    if (typeof window !== 'undefined') {
      const url = localStorage.getItem('sodular_base_url');
      if (url) return url;
    }
    return undefined;
  }
// export const apiUrl = getLocalBaseUrl() || process.env.NEXT_PUBLIC_SODULAR_BASE_URL || 'http://sodular_backend:5005/api/v1';
export const apiUrl = getLocalBaseUrl() || process.env.NEXT_PUBLIC_SODULAR_BASE_URL || 'http://localhost:5005/api/v1';