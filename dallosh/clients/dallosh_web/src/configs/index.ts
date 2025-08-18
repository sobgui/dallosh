function getLocal(key: string, fallback: string) {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem(key);
    if (val) return val;
  }
  return fallback;
}
  
// Always get en variable with NEXT_PUBLIC_ prefix
export const apiUrl = getLocal('sodular_base_url', process.env.NEXT_PUBLIC_SODULAR_BASE_URL || 'http://192.168.1.117:5005/api/v1');
export const aiUrl = getLocal('sodular_ai_base_url', process.env.NEXT_PUBLIC_SODULAR_AI_BASE_URL || 'http://192.168.1.117:4200/api/v1');
export const databaseID = getLocal('sodular_database_id', process.env.NEXT_PUBLIC_SODULAR_DATABASE_ID || 'd8d1badd-d3bd-48ce-863b-44c0ebdca41d');
export const dalloshAIBaseUrl = getLocal('dallosh_ai_base_url', process.env.NEXT_PUBLIC_DALLOSH_AI_BASE_URL || 'http://192.168.1.117:7860');