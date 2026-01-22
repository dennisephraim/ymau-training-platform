'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, alt = '', fallback, size = 'md', className }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-20 w-20 text-xl',
  };

  const pixelSizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 80,
  };

  const initials = fallback
    ? fallback.charAt(0).toUpperCase()
    : '?';

  // Show fallback if no src or if image failed to load
  if (!src || imageError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-ymau-dark-red font-medium text-white',
          sizes[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-full', sizes[size], className)}>
      <Image
        src={src}
        alt={alt}
        width={pixelSizes[size] * 2}
        height={pixelSizes[size] * 2}
        className="h-full w-full object-cover"
        unoptimized
        onError={() => setImageError(true)}
      />
    </div>
  );
}
