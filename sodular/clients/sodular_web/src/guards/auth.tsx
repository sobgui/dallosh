"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { storage, TOKEN_KEYS } from '@/lib/sodular/utils';
import { isClientReady, initializeSodularClient, getClientAsync, getSodularClient } from '@/services';

interface AuthGuardProps {
  children: React.ReactNode;
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/auth/login', '/auth/register', '/', '/landing'];
  return publicRoutes.some(route => pathname.startsWith(route));
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth/');
}

function getIsAuthenticated(token: string | null): boolean {
  if (!token) return false;
  try {
    const client = getSodularClient();
    // @ts-ignore
    const isTokenExpired = client._baseClient?.isTokenExpired?.() ?? true;
    return !isTokenExpired;
  } catch {
    return false;
  }
}

function useAccessToken() {
  const [token, setToken] = useState(() =>
    typeof window !== 'undefined' ? storage.get(TOKEN_KEYS.ACCESS_TOKEN) : null
  );

  useEffect(() => {
    const update = () => {
      setToken(storage.get(TOKEN_KEYS.ACCESS_TOKEN));
    };
    window.addEventListener('storage', update);
    // Patch login/logout to update state
    const origSetItem = localStorage.setItem;
    localStorage.setItem = function (...args) {
      origSetItem.apply(this, args);
      update();
    };
    const origRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function (...args) {
      origRemoveItem.apply(this, args);
      update();
    };
    return () => {
      window.removeEventListener('storage', update);
      localStorage.setItem = origSetItem;
      localStorage.removeItem = origRemoveItem;
    };
  }, []);

  return token;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const initializingRef = useRef(false); 
  const { setAuthenticated, setUser, isAuthenticated } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    try {
        // Always ensure client is initialized and up-to-date
        let client;
        try {
          client = await getClientAsync();
        } catch (err: any) {
          setError('Failed to initialize Sodular client: ' + (err?.message || err));
          setReady(true);
          return;
        }
        // Use the actual client instance to check token
        let authenticated = false;
        try {
          // @ts-ignore
          authenticated = !client._baseClient?.isTokenExpired?.();
        } catch {
          authenticated = false;
        }
        if (!authenticated) {
          setAuthenticated(false);
          setUser(null);
          if (!isPublicRoute(pathname)) {
            router.replace('/auth/login');
          }
          setReady(true);
          return;
        }
        setAuthenticated(true);
        // If on /auth/login and already authenticated, redirect to /home
        if (isAuthRoute(pathname)) {
          router.replace('/home');
          setReady(true);
          return;
        }
        if (!cancelled) setReady(true);
    } finally {
      initializingRef.current = false;
    }
    };
    checkAuth();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAuthenticated]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive mb-4">{error}</div>
          <p className="text-muted-foreground">Authentication failed. Please try again or contact support.</p>
        </div>
      </div>
    );
  }

  if (!ready && !isPublicRoute(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const AuthGuardFC: React.FC<{ children: React.ReactNode }> = AuthGuard;
