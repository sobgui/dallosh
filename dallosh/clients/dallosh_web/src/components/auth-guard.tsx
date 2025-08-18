'use client';

import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsClient } from '@/hooks/use-is-client';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const isClient = useIsClient();

  useEffect(() => {
    if (isClient && !isLoggedIn) {
      router.push('/auth/login');
    }
  }, [isLoggedIn, isClient, router]);

  if (!isClient || !isLoggedIn) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
