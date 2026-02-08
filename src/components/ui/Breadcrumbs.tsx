'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({ items, showHome = true, className }: BreadcrumbsProps) {
  const allItems = showHome
    ? [{ label: 'Home', href: '/dashboard' }, ...items]
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center overflow-x-auto scrollbar-hide scroll-smooth-ios',
        className
      )}
    >
      <ol className="flex items-center gap-1 text-sm">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isHome = showHome && index === 0;

          return (
            <li key={index} className="flex items-center gap-1 min-w-0">
              {index > 0 && (
                <ChevronRight
                  className="h-4 w-4 text-gray-400 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span className="font-medium text-gray-900 truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px]">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1 text-gray-500 hover:text-gray-700',
                    'transition-colors touch-action-manipulation',
                    'focus-visible:ring-2 focus-visible:ring-ymau-dark-red focus-visible:ring-offset-2 focus-visible:outline-none rounded'
                  )}
                >
                  {isHome && <Home className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                  {!isHome && (
                    <span className="truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]">
                      {item.label}
                    </span>
                  )}
                </Link>
              ) : (
                <span className="text-gray-500 truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
