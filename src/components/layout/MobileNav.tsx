'use client';

import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { X, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { navSections } from './navigationConfig';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/components/auth/AuthContext';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Close drawer on navigation
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Filter sections based on user role
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles) return true;
        return user && item.roles.includes(user.role);
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in"
          aria-hidden="true"
        />

        {/* Drawer */}
        <Dialog.Content
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-white shadow-xl',
            'flex flex-col',
            'focus:outline-none',
            'overscroll-contain',
            'data-[state=open]:animate-slide-in-left'
          )}
          aria-label="Navigation menu"
        >
          <VisuallyHidden.Root>
            <Dialog.Title>Navigation menu</Dialog.Title>
          </VisuallyHidden.Root>

          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group touch-action-manipulation"
              onClick={onClose}
            >
              <Image
                src="/YMAU Crest.svg"
                alt="YMAU Crest"
                width={36}
                height={36}
              />
              <div>
                <span className="text-base font-semibold text-gray-900">YMAU</span>
                <span className="block text-[10px] text-gray-500 -mt-0.5 tracking-wide">
                  Delegate Hub
                </span>
              </div>
            </Link>

            <Dialog.Close asChild>
              <button
                className={cn(
                  'min-h-[44px] min-w-[44px] flex items-center justify-center',
                  'rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                  'transition-colors touch-action-manipulation',
                  'focus-visible:ring-2 focus-visible:ring-ymau-dark-red focus-visible:ring-offset-2 focus-visible:outline-none'
                )}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 overflow-y-auto py-4 px-3 overscroll-contain scrollbar-hide"
            aria-label="Main navigation"
          >
            {filteredSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className={cn(sectionIndex > 0 && 'mt-6')}>
                {section.title && (
                  <h3 className="px-3 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium',
                          'transition-all duration-200 touch-action-manipulation',
                          'focus-visible:ring-2 focus-visible:ring-ymau-dark-red focus-visible:ring-offset-2 focus-visible:outline-none',
                          isActive
                            ? 'bg-ymau-dark-red/10 text-ymau-dark-red'
                            : 'text-gray-600 hover:bg-ymau-dark-red/5 hover:text-gray-900'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5 transition-colors',
                            isActive
                              ? 'text-ymau-dark-red'
                              : 'text-gray-400 group-hover:text-gray-600'
                          )}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-xs bg-ymau-dark-red/10 text-ymau-dark-red px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Settings link at bottom */}
          <div className="border-t border-gray-100 p-3 safe-area-bottom">
            <Link
              href="/dashboard/settings"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium',
                'transition-all duration-200 touch-action-manipulation',
                'focus-visible:ring-2 focus-visible:ring-ymau-dark-red focus-visible:ring-offset-2 focus-visible:outline-none',
                pathname === '/dashboard/settings'
                  ? 'bg-ymau-dark-red/10 text-ymau-dark-red'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Settings
                className={cn(
                  'h-5 w-5',
                  pathname === '/dashboard/settings' ? 'text-ymau-dark-red' : 'text-gray-400'
                )}
                aria-hidden="true"
              />
              <span>Settings</span>
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
