'use client';

import { useEffect, useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { getSodularClient, apiUrl } from '@/services/client';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

type ProtectedImageProps = Omit<ImageProps, 'src'> & {
  src: string | null | undefined;
};

// Simple in-memory cache for object URLs
const imageCache = new Map<string, string>();

export function ProtectedImage({ src, alt, ...props }: ProtectedImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let url: string | null = null;

    const fetchImage = async () => {
      setLoading(true);
      setError(false);
      setObjectUrl(null);

      if (!src) {
        setError(true);
        setLoading(false);
        return;
      }

      let cleanSrc = typeof src === 'string' ? src.trim() : '';
      // If the src is a relative or absolute URL, ensure all query params are properly encoded
      if (cleanSrc && cleanSrc.includes('?')) {
        const [base, query] = cleanSrc.split('?');
        const params = new URLSearchParams(query);
        // Re-encode all params
        const encodedParams = Array.from(params.entries()).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        cleanSrc = `${base}?${encodedParams}`;
      }
      if (!cleanSrc.startsWith('http')) {
        cleanSrc = apiUrl + cleanSrc;
      }

      try {
        const accessToken = localStorage.getItem('sodular_access_token');
        const response = await fetch(cleanSrc, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!response.ok) throw new Error('Failed to fetch protected image');
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
        if (!isCancelled) setObjectUrl(url);
      } catch (err) {
        if (!isCancelled) setError(true);
        console.error('Failed to fetch protected image:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchImage();

    return () => {
      isCancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);

  if (loading) return <Skeleton className={cn('w-full h-full', props.className)} />;
  if (error || !objectUrl) return <div className={cn('flex items-center justify-center w-full h-full bg-muted/30 rounded', props.className)}><ImageOff className="w-8 h-8 text-muted-foreground" /><span className="ml-2 text-xs">Image not found</span></div>;
  return <img src={objectUrl} alt={alt || ""} {...props} />;
}
