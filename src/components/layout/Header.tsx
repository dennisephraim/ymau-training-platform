'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Settings, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, actions, onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleConfig = {
    student: { label: 'Student', variant: 'primary' as const },
    instructor: { label: 'Instructor', variant: 'purple' as const },
    admin: { label: 'Admin', variant: 'warning' as const },
  };

  const userRole = user?.role || 'student';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200/80 bg-white/80 backdrop-blur-sm px-4 md:px-6">
      {/* Left side - Hamburger & Title */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger menu */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className={cn(
              'md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center',
              'rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100',
              'transition-colors touch-action-manipulation',
              'focus-visible:ring-2 focus-visible:ring-ymau-dark-red focus-visible:ring-offset-2 focus-visible:outline-none'
            )}
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        )}

        {title && (
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
          </div>
        )}
      </div>

      {/* Right side - Actions & User */}
      <div className="flex items-center gap-2">
        {actions}

        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              'flex items-center gap-2 sm:gap-3 rounded-lg pl-2 pr-2 sm:pr-3 py-1.5',
              'hover:bg-gray-50 transition-colors touch-action-manipulation',
              'focus-visible:ring-2 focus-visible:ring-ymau-dark-red focus-visible:ring-offset-2 focus-visible:outline-none'
            )}
            aria-label="User menu"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <Avatar
              src={user?.photoURL}
              fallback={user?.displayName || user?.email}
              size="sm"
            />
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {user?.displayName || 'User'}
              </p>
              <Badge variant={roleConfig[userRole].variant} size="sm" className="mt-0.5">
                {roleConfig[userRole].label}
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform duration-200',
                isDropdownOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden animate-slide-up">
              {/* User info */}
              <div className="px-4 py-4 bg-gradient-to-br from-ymau-light-indigo/30 to-ymau-orange/10 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user?.photoURL}
                    fallback={user?.displayName || user?.email}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user?.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-2">
                <a
                  href="/dashboard/settings"
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700',
                    'hover:bg-gray-50 transition-colors touch-action-manipulation',
                    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ymau-dark-red focus-visible:outline-none'
                  )}
                >
                  <Settings className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span>Settings</span>
                </a>
              </div>

              {/* Sign Out */}
              <div className="border-t border-gray-100 py-2">
                <button
                  onClick={() => signOut()}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 w-full',
                    'hover:bg-red-50 transition-colors touch-action-manipulation',
                    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 focus-visible:outline-none'
                  )}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
