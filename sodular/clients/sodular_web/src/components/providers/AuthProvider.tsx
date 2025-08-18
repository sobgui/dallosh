"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface AuthProviderProps {
  children: React.ReactNode;
}

// Check if we're on a public route that doesn't need auth
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/auth/login', '/auth/register', '/', '/landing'];
  return publicRoutes.some(route => pathname.startsWith(route));
}

// Check if we're on an auth route
function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth/');
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>;
}
