function getLocal(key: string, fallback: string) {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem(key);
    if (val) return val;
  }
  return fallback;
}
  
// Always get en variable with NEXT_PUBLIC_ prefix
export const apiUrl = getLocal('sodular_base_url', process.env.NEXT_PUBLIC_SODULAR_BASE_URL || 'http://localhost:5005/api/v1');
export const aiUrl = getLocal('sodular_ai_base_url', process.env.NEXT_PUBLIC_SODULAR_AI_BASE_URL || 'http://localhost:4200/api/v1');
export const databaseID = getLocal('dallosh_database_id', process.env.NEXT_PUBLIC_DALLOSH_DATABASE_ID || 'bb3312c2-bb52-4506-be36-76b30d7b71cc');
export const dalloshAIBaseUrl = getLocal('dallosh_ai_base_url', process.env.NEXT_PUBLIC_DALLOSH_AI_BASE_URL || 'http://localhost:7860');