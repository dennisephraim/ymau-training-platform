import {
  BookOpen,
  GraduationCap,
  Award,
  Users,
  Settings,
  BarChart3,
  LayoutDashboard,
  FolderOpen,
  FileText,
  ClipboardList,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('student' | 'instructor' | 'admin')[];
  badge?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Activities',
    items: [
      {
        label: 'My Activities',
        href: '/dashboard/courses',
        icon: BookOpen,
      },
      {
        label: 'Resources',
        href: '/dashboard/resources',
        icon: FileText,
      },
      {
        label: 'Certificates',
        href: '/dashboard/certificates',
        icon: Award,
      },
    ],
  },
  {
    title: 'Teaching',
    items: [
      {
        label: 'My Courses',
        href: '/instructor/courses',
        icon: FolderOpen,
        roles: ['instructor', 'admin'],
      },
      {
        label: 'Tasks',
        href: '/instructor/tasks',
        icon: ClipboardList,
        roles: ['instructor', 'admin'],
      },
      {
        label: 'Resources',
        href: '/instructor/resources',
        icon: FileText,
        roles: ['instructor', 'admin'],
      },
      {
        label: 'Analytics',
        href: '/instructor/analytics',
        icon: BarChart3,
        roles: ['instructor', 'admin'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Manage Users',
        href: '/admin/users',
        icon: Users,
        roles: ['admin'],
      },
    ],
  },
];
