'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpen, GraduationCap, Award, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const roleMessages = {
    student: 'Start learning and track your progress through YMAU training courses.',
    instructor: 'Manage courses, view student progress, and analyze completion rates.',
    admin: 'Full access to manage users, courses, and system settings.',
  };

  const stats = [
    {
      title: 'Enrolled Courses',
      value: '0',
      description: 'Active course enrollments',
      icon: BookOpen,
      color: 'bg-blue-500',
    },
    {
      title: 'In Progress',
      value: '0',
      description: 'Courses currently watching',
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Completed',
      value: '0',
      description: 'Courses finished',
      icon: GraduationCap,
      color: 'bg-green-500',
    },
    {
      title: 'Certificates',
      value: '0',
      description: 'Earned certificates',
      icon: Award,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.displayName?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-gray-600 mt-1">
          {user && roleMessages[user.role]}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {user?.role === 'student' && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Complete these steps to begin your YMAU training journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                  1
                </div>
                <div>
                  <p className="font-medium">Account Created</p>
                  <p className="text-sm text-gray-500">Your account is ready to go</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  2
                </div>
                <div>
                  <p className="font-medium">Enroll in a Course</p>
                  <p className="text-sm text-gray-500">Use an enrollment code or request access</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  3
                </div>
                <div>
                  <p className="font-medium">Complete Training</p>
                  <p className="text-sm text-gray-500">Watch all videos to earn your certificate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(user?.role === 'instructor' || user?.role === 'admin') && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common instructor tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-500">
                Course management features coming soon in Phase 2.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform activity</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                No recent activity to display.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
