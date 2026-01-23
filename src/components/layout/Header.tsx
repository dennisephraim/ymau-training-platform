'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200/80 bg-white/80 backdrop-blur-sm px-6">
      {/* Left side - Title */}
      <div className="flex items-center gap-4">
        {title && (
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
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
            className="flex items-center gap-3 rounded-lg pl-2 pr-3 py-1.5 hover:bg-gray-50 transition-colors"
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
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-gray-400" />
                  <span>Settings</span>
                </a>
              </div>
              
              {/* Sign Out */}
              <div className="border-t border-gray-100 py-2">
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                >
                  <LogOut className="h-4 w-4" />
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
