'use client';

import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsClient } from '@/hooks/use-is-client';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isClient = useIsClient();

  useEffect(() => {
    // This effect redirects the user if they are not logged in.
    if (isClient && !isLoggedIn) {
      router.push('/auth/login');
    }
  }, [isLoggedIn, isClient, router]);

  // The main initialization spinner is in AppProviders.
  // This guard just needs to check the final `isLoggedIn` state.
  // If not logged in, we can show a spinner while the redirect happens,
  // or just return null. A spinner is better for UX.
  if (!isLoggedIn) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
