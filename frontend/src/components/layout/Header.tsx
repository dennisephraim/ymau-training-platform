'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils/cn';

export function Header() {
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

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOut();
  };

  const roleLabels = {
    student: 'Student',
    instructor: 'Instructor',
    admin: 'Administrator',
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        {/* Breadcrumb or page title can go here */}
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
        >
          <Avatar
            src={user?.photoURL}
            fallback={user?.displayName || user?.email}
            size="sm"
          />
          <div className="hidden md:block text-left">
            <p className="font-medium text-gray-900">{user?.displayName || 'User'}</p>
            <p className="text-xs text-gray-500">{user ? roleLabels[user.role] : ''}</p>
          </div>
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 transition-transform',
            isDropdownOpen && 'rotate-180'
          )} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
