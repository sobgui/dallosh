'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAgent?: boolean;
  allowedRoles?: string[];
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireAgent = false,
  allowedRoles = []
}: ProtectedRouteProps) {
  const { isLoggedIn, user, isHydrated, isAdmin, isAgent, getUserRole } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Don't make routing decisions until after hydration
    if (!isHydrated) return;

    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }

    // Get user role
    const userRole = getUserRole();
    
    // Check role-based access
    if (requireAdmin && !isAdmin()) {
      // Redirect based on user role
      if (userRole === 'agent') {
        router.push('/admin/dallosh');
      } else {
        router.push('/twitter');
      }
      return;
    }

    if (requireAgent && !isAgent() && !isAdmin()) {
      // Only admin and agents can access agent routes
      if (userRole === 'admin') {
        router.push('/admin/dallosh');
      } else {
        router.push('/twitter');
      }
      return;
    }

    // Check allowed roles if specified
    if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
      // Redirect based on user role
      if (userRole === 'admin') {
        router.push('/admin/dallosh');
      } else if (userRole === 'agent') {
        router.push('/admin/dallosh');
      } else {
        router.push('/twitter');
      }
      return;
    }
  }, [isLoggedIn, requireAdmin, requireAgent, allowedRoles, user, router, isHydrated, isAdmin, isAgent, getUserRole]);

  // Show loading until hydrated
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  // Check role-based access
  const userRole = getUserRole();
  
  if (requireAdmin && !isAdmin()) {
    return null;
  }

  if (requireAgent && !isAgent() && !isAdmin()) {
    return null;
  }

  if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    return null;
  }

  return <>{children}</>;
}
