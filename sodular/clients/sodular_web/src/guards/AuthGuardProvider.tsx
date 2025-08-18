"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { storage, TOKEN_KEYS } from "@/lib/sodular/utils";
import { jwtDecode } from "jwt-decode";
import { initializeSodularClient, isClientReady } from "@/services";

const PUBLIC_ROUTES = ["/auth/login", "/auth/register", "/landing", "/"];

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const { exp } = jwtDecode<{ exp: number }>(token);
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthGuardProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [clientReady, setClientReady] = useState(false);

  // Ensure Sodular client is initialized globally and await it
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!isClientReady()) {
        await initializeSodularClient();
      }
      if (!cancelled) setClientReady(true);
    }
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const token = storage.get(TOKEN_KEYS.ACCESS_TOKEN);
    const valid = isTokenValid(token);

    // If not public and not authenticated, redirect to login
    if (!PUBLIC_ROUTES.includes(pathname) && !valid) {
      if (pathname !== "/auth/login") {
        router.replace("/auth/login");
        setChecked(false);
        return;
      }
    }
    // If on login and already authenticated, redirect to home
    if (pathname === "/auth/login" && valid) {
      router.replace("/home");
      setChecked(false);
      return;
    }
    setChecked(true);
  }, [pathname]);

  if ((!checked || !clientReady) && !PUBLIC_ROUTES.includes(pathname)) {
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
} 