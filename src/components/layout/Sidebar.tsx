'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/components/auth/AuthContext';
import { navSections } from './navigationConfig';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

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
    <aside className="hidden md:flex h-screen w-64 flex-col bg-white border-r border-gray-200/80">
      {/* Logo */}
      <div className="flex h-16 items-center px-5 border-b border-gray-100">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-ymau-dark-red focus-visible:ring-offset-2 focus-visible:outline-none rounded-lg"
        >
          <Image
            src="/YMAU Crest.svg"
            alt="YMAU Crest"
            width={40}
            height={40}
          />
          <div>
            <span className="text-base font-semibold text-gray-900">YMAU</span>
            <span className="block text-[10px] text-gray-500 -mt-0.5 tracking-wide">Delegate Hub</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Main navigation">
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
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
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

      {/* User section & Settings */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
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
    </aside>
  );
}
