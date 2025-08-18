import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, TOKEN_KEYS } from '@/lib/sodular/utils';
import { getSodularClient, initializeSodularClient, isClientReady } from '@/services';

interface User {
  uid: string;
  email: string;
  username: string;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  clientInitialized: boolean;
  lastAuthCheck: number;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  initializeClient: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  validateCurrentAuth: () => boolean;
}

// JWT token validation helper
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    // Reduce buffer to 5 seconds to prevent premature expiration
    return payload.exp < (currentTime + 5);
  } catch {
    return true;
  }
}

// Extract user info from token
function getUserFromToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      uid: payload.uid,
      email: payload.email,
      username: payload.username,
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      clientInitialized: false,
      lastAuthCheck: 0,

      // Initialize client
      initializeClient: async () => {
        if (isClientReady()) {
          set({ clientInitialized: true });
          return;
        }

        try {
          const result = await initializeSodularClient();
          if (result.isReady) {
            set({ clientInitialized: true });
            console.log('✅ Sodular client initialized successfully');
          } else {
            console.error('❌ Failed to initialize client:', result.error);
            set({ clientInitialized: false });
          }
        } catch (err) {
          console.error('❌ Client initialization error:', err);
          set({ clientInitialized: false });
        }
      },

      // Check authentication status
      checkAuth: async () => {
        const state = get();

        // Prevent multiple simultaneous auth checks
        if (state.isLoading) {
          return;
        }

        // Don't check too frequently (cache for 2 minutes)
        const now = Date.now();
        if (now - state.lastAuthCheck < 120000 && state.isAuthenticated && state.user) {
          return;
        }

        set({ isLoading: true });

        try {
          // Ensure client is initialized
          if (!state.clientInitialized) {
            await state.initializeClient();
          }

          if (!state.clientInitialized) {
            set({ isLoading: false, isAuthenticated: false, user: null, lastAuthCheck: now });
            return;
          }

          const accessToken = storage.get(TOKEN_KEYS.ACCESS_TOKEN);

          if (!accessToken) {
            console.log('🔍 No access token found');
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false,
              lastAuthCheck: now
            });
            return;
          }

          // Check if token is expired
          if (isTokenExpired(accessToken)) {
            console.log('🔄 Access token expired, attempting refresh...');
            const refreshSuccess = await state.refreshAuth();

            if (!refreshSuccess) {
              console.log('❌ Token refresh failed, logging out');
              state.logout();
              return;
            }
          } else {
            // Token is valid, set it and extract user info
            const client = getSodularClient();
            client.setToken(accessToken);
            const userInfo = getUserFromToken(accessToken);

            if (userInfo) {
              console.log('✅ Auth check successful, user authenticated');
              set({
                user: userInfo,
                isAuthenticated: true,
                isLoading: false,
                lastAuthCheck: now
              });
            } else {
              console.log('❌ Failed to extract user info from token');
              set({
                isAuthenticated: false,
                user: null,
                isLoading: false,
                lastAuthCheck: now
              });
            }
          }
        } catch (err) {
          console.error('❌ Auth check failed:', err);
          set({
            isLoading: false,
            lastAuthCheck: now
          });

          // Only log out if it's a token-related error
          if (err instanceof Error && (err.message.includes('token') || err.message.includes('unauthorized'))) {
            console.log('🔄 Token error detected, logging out');
            state.logout();
          }
        }
      },

      // Refresh authentication tokens
      refreshAuth: async () => {
        try {
          const refreshToken = storage.get(TOKEN_KEYS.REFRESH_TOKEN);

          if (!refreshToken) {
            console.log('❌ No refresh token available');
            return false;
          }

          if (isTokenExpired(refreshToken)) {
            console.log('❌ Refresh token expired');
            return false;
          }

          const client = getSodularClient();
          const refreshResult = await client.auth.refreshToken({ refreshToken });

          if (refreshResult.data?.tokens) {
            const newAccessToken = refreshResult.data.tokens.accessToken;
            const newRefreshToken = refreshResult.data.tokens.refreshToken;
            const userInfo = getUserFromToken(newAccessToken);

            if (userInfo) {
              // Update tokens in client and storage
              client.setTokens(newAccessToken, newRefreshToken);

              set({
                user: userInfo,
                isAuthenticated: true,
                isLoading: false,
                lastAuthCheck: Date.now()
              });
              console.log('✅ Token refreshed successfully');
              return true;
            }
          }
          
          console.log('❌ Token refresh failed - invalid response');
          return false;
        } catch (err) {
          console.error('❌ Token refresh error:', err);
          return false;
        }
      },

      // Login
      login: async (email: string, password: string) => {
        const state = get();
        
        if (!state.clientInitialized) {
          await state.initializeClient();
        }

        if (!state.clientInitialized) {
          return { success: false, error: "Client not initialized" };
        }

        try {
          set({ isLoading: true });
          
          const client = getSodularClient();
          const result = await client.auth.login({ email, password });
          
          if (result.data?.tokens && result.data?.user) {
            const userInfo = {
              uid: result.data.user.uid,
              email: result.data.user.data.email,
              username: result.data.user.data.username || "",
            };
            
            set({ 
              user: userInfo, 
              isAuthenticated: true, 
              isLoading: false,
              lastAuthCheck: Date.now() 
            });
            
            console.log('✅ Login successful');
            return { success: true };
          } else {
            set({ isLoading: false });
            return { success: false, error: result.error || "Login failed" };
          }
        } catch (err: any) {
          console.error('❌ Login error:', err);
          set({ isLoading: false });
          return { success: false, error: err.message || "Login failed" };
        }
      },

      // Logout
      logout: () => {
        try {
          const client = getSodularClient();
          client.clearTokens();
        } catch (err) {
          console.error('❌ Logout error:', err);
        }
        
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          lastAuthCheck: 0 
        });
        
        console.log('✅ Logged out successfully');
      },

      // Utility setters
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setUser: (user: User | null) => set({ user }),
      setAuthenticated: (authenticated: boolean) => set({ isAuthenticated: authenticated }),

      // Validate current auth state without triggering full auth check
      validateCurrentAuth: () => {
        const state = get();

        // Quick validation without storage access if recently checked
        const now = Date.now();
        if (now - state.lastAuthCheck < 30000 && state.isAuthenticated && state.user) {
          return true;
        }

        const accessToken = storage.get(TOKEN_KEYS.ACCESS_TOKEN);

        if (!accessToken) {
          return false;
        }

        if (isTokenExpired(accessToken)) {
          return false;
        }

        return state.isAuthenticated && state.user !== null && state.clientInitialized;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          const value = storage.get(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name: string, value: string) => {
          storage.set(name, value);
        },
        removeItem: (name: string) => {
          storage.remove(name);
        },
      })),
      // Only persist user info and auth status, not loading states
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastAuthCheck: state.lastAuthCheck,
      }),
    }
  )
);
