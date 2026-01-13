'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  Award,
  Users,
  Settings,
  BarChart3,
  PlusCircle,
  Home,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/components/auth/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('student' | 'instructor' | 'admin')[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'My Courses',
    href: '/dashboard/courses',
    icon: BookOpen,
  },
  {
    label: 'Join Course',
    href: '/dashboard/enroll',
    icon: UserPlus,
    roles: ['student'],
  },
  {
    label: 'My Progress',
    href: '/dashboard/progress',
    icon: GraduationCap,
    roles: ['student'],
  },
  {
    label: 'Certificates',
    href: '/dashboard/certificates',
    icon: Award,
  },
  {
    label: 'Manage Courses',
    href: '/instructor/courses',
    icon: PlusCircle,
    roles: ['instructor', 'admin'],
  },
  {
    label: 'Analytics',
    href: '/instructor/analytics',
    icon: BarChart3,
    roles: ['instructor', 'admin'],
  },
  {
    label: 'Manage Users',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
            Y
          </div>
          <span className="text-lg font-semibold text-gray-900">YMAU Training</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-blue-700' : 'text-gray-400')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500">
          Yale Model African Union
        </div>
      </div>
    </aside>
  );
}
