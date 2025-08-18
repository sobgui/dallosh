import { useAuthStore } from '@/stores/authStore';

/**
 * Custom hook to access authentication state and actions
 * This provides a clean interface to the Zustand auth store
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    clientInitialized,
    login,
    logout,
    checkAuth,
    refreshAuth,
  } = useAuthStore();

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    clientInitialized,
    
    // Actions
    login,
    logout,
    checkAuth,
    refreshAuth,
    
    // Computed values
    isReady: clientInitialized && !isLoading,
  };
}
