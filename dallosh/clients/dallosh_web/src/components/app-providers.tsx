'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { useSettingsStore } from '@/stores/settings';
import { hexToHsl } from '@/lib/utils';
import { useEffect } from 'react';
import { getSodularClient } from '@/services/client';
import { useAuthStore } from '@/stores/auth';
import { jwtDecode } from 'jwt-decode';

function DynamicStyles() {
    const { primaryColor, accentColor } = useSettingsStore();
    
    // Fallback to default colors if not loaded yet to prevent flashes of unstyled content
    const pColor = primaryColor || '#3b82f6';
    const aColor = accentColor || '#a855f7';

    const styles = `
        :root {
            --primary: ${hexToHsl(pColor)};
            --accent: ${hexToHsl(aColor)};
        }
    `;

    return <style>{styles}</style>
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  // We use `getState` to get the initial tokens without subscribing the component
  // to the store, preventing the useEffect from re-running on token changes.
  // The `initialize` function should only run once on mount.
  const { tokens, logout } = useAuthStore.getState();
  const fetchSettings = useSettingsStore.getState().fetchSettings;

  useEffect(() => {
    const initialize = async () => {
      // Initialization now happens in the background without blocking rendering.
      
      // 1. Get the API client. This promise is cached so it only runs once.
      const client = await getSodularClient();
      if (!client) {
        console.error("FATAL: Could not initialize Sodular client.");
        // We don't block rendering, but subsequent API calls will fail.
        // Components should handle this gracefully.
        return; 
      }

      // 2. Hydrate auth state from the persisted store into the API client.
      // Auth state is now handled by onRehydrateStorage in the auth store
      if (tokens?.accessToken) {
        client.setTokens(tokens.accessToken, tokens.refreshToken!);
      }

      // 3. Fetch global settings from the backend.
      // This will update the settings store and trigger re-renders in components that use it.
      await fetchSettings();
    };

    initialize();
  }, []); // The empty dependency array ensures this effect runs only once on mount.

  // Render children immediately. The blocking spinner is removed.
  // Pages and components are now responsible for their own loading states.
  return (
    <>
      <DynamicStyles />
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </>
  );
}
