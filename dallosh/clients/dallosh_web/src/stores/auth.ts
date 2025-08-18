
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens } from '@/lib/sodular';
import { getSodularClient } from '@/services/client';
import { jwtDecode } from 'jwt-decode';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoggedIn: boolean;
  isHydrated: boolean;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  setTokens: (tokens: AuthTokens) => void;
  updateUser: (user: User) => void;
  // Role-based helper functions
  isAdmin: () => boolean;
  isAgent: () => boolean;
  getUserRole: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isLoggedIn: false,
      isHydrated: false,
      login: (user, tokens) => {
        getSodularClient().then(client => client?.setTokens(tokens.accessToken, tokens.refreshToken));
        set({ user, tokens, isLoggedIn: true });
      },
      logout: () => {
        getSodularClient().then(client => client?.clearTokens());
        set({ user: null, tokens: null, isLoggedIn: false });
      },
      setTokens: (tokens) => {
         getSodularClient().then(client => client?.setTokens(tokens.accessToken, tokens.refreshToken));
         set({ tokens });
      },
      updateUser: (user) => {
        set({ user });
      },
      // Role-based helper functions
      isAdmin: () => {
        const state = get();
        if (!state.user) return false;
        // Check if user is admin@dallosh.com
        return state.user.data.email === 'admin@dallosh.com';
      },
      isAgent: () => {
        const state = get();
        if (!state.user) return false;
        // Check if user has agent role in fields
        return state.user.data.fields?.role === 'agent';
      },
      getUserRole: () => {
        const state = get();
        if (!state.user) return null;
        
        // Check admin first
        if (state.user.data.email === 'admin@dallosh.com') {
          return 'admin';
        }
        
        // Check agent role
        if (state.user.data.fields?.role === 'agent') {
          return 'agent';
        }
        
        // Default user role
        return 'user';
      }
    }),
    {
      name: 'sodular-auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // After hydration, if we have user and tokens, set isLoggedIn to true
        if (state?.user && state?.tokens) {
          // Check if token is still valid
          try {
            const decoded = jwtDecode<{ exp: number }>(state.tokens.accessToken);
            if (decoded.exp * 1000 > Date.now()) {
              state.isLoggedIn = true;
            } else {
              // Token expired, clear everything
              state.user = null;
              state.tokens = null;
              state.isLoggedIn = false;
            }
          } catch (e) {
            // Invalid token, clear everything
            state.user = null;
            state.tokens = null;
            state.isLoggedIn = false;
          }
        }
        // Mark as hydrated regardless
        if (state) {
          state.isHydrated = true;
        }
      }
    }
  )
);
