'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  BookOpen,
  GraduationCap,
  Award,
  Clock,
  Play,
  Users,
  Plus,
  BarChart3,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { Enrollment } from '@/types/enrollment';
import { Course } from '@/types/course';
import { Certificate } from '@/types/certificate';
import * as enrollmentService from '@/lib/services/enrollments';
import * as courseService from '@/lib/services/courses';
import * as certificateService from '@/lib/services/certificates';
import * as progressService from '@/lib/services/progress';
import { formatDuration } from '@/lib/utils/formatters';

interface DashboardStats {
  enrolledCourses: number;
  inProgress: number;
  completed: number;
  certificates: number;
}

interface RecentCourse {
  enrollment: Enrollment;
  course: Course;
  progress: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    inProgress: 0,
    completed: 0,
    certificates: 0,
  });
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch enrollments
      const enrollments = await enrollmentService.getUserEnrollments(user.id);

      // Fetch certificates
      const certificates = await certificateService.getStudentCertificates(user.id);

      // Calculate stats
      const inProgress = enrollments.filter((e) => e.status === 'active').length;
      const completed = enrollments.filter((e) => e.status === 'completed').length;

      setStats({
        enrolledCourses: enrollments.length,
        inProgress,
        completed,
        certificates: certificates.length,
      });

      // Get recent courses with progress
      const recentEnrollments = enrollments.slice(0, 3);
      const recentCoursesData: RecentCourse[] = [];

      for (const enrollment of recentEnrollments) {
        const course = await courseService.getCourse(enrollment.courseId);
        if (course) {
          const progress = await progressService.getCourseProgress(
            enrollment.id,
            enrollment.courseId
          );
          recentCoursesData.push({
            enrollment,
            course,
            progress: progress.overallPercentage,
          });
        }
      }

      setRecentCourses(recentCoursesData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const roleMessages = {
    student: 'Start learning and track your progress through YMAU training courses.',
    instructor: 'Manage courses, view student progress, and analyze completion rates.',
    admin: 'Full access to manage users, courses, and system settings.',
  };

  const statCards = [
    {
      title: 'Enrolled Courses',
      value: stats.enrolledCourses.toString(),
      description: 'Active course enrollments',
      icon: BookOpen,
      color: 'bg-blue-500',
    },
    {
      title: 'In Progress',
      value: stats.inProgress.toString(),
      description: 'Courses currently watching',
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'Completed',
      value: stats.completed.toString(),
      description: 'Courses finished',
      icon: GraduationCap,
      color: 'bg-green-500',
    },
    {
      title: 'Certificates',
      value: stats.certificates.toString(),
      description: 'Earned certificates',
      icon: Award,
      color: 'bg-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mt-2 animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
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

      {/* Student Content */}
      {user?.role === 'student' && (
        <>
          {/* Recent Courses */}
          {recentCourses.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Continue Learning</CardTitle>
                    <CardDescription>Pick up where you left off</CardDescription>
                  </div>
                  <Link href="/dashboard/courses">
                    <Button variant="outline" size="sm">
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentCourses.map(({ enrollment, course, progress }) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {course.title}
                          </h3>
                          {enrollment.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{course.chapterCount} chapters</span>
                          <span>|</span>
                          <span>{formatDuration(course.totalDurationSeconds)}</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <Link href={`/dashboard/courses/${enrollment.id}`}>
                        <Button size="sm" className="ml-4">
                          <Play className="h-4 w-4 mr-1" />
                          {enrollment.status === 'completed' ? 'Review' : 'Continue'}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Getting Started (only show if no enrollments) */}
          {stats.enrolledCourses === 0 && (
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
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Account Created</p>
                      <p className="text-sm text-gray-500">Your account is ready to go</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Enroll in a Course</p>
                      <p className="text-sm text-gray-500">Use an enrollment code or browse available courses</p>
                    </div>
                    <Link href="/dashboard/enroll">
                      <Button size="sm">Join Course</Button>
                    </Link>
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
        </>
      )}

      {/* Instructor Content */}
      {(user?.role === 'instructor' || user?.role === 'admin') && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common instructor tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/instructor/courses/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Course
                </Button>
              </Link>
              <Link href="/instructor/courses" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage Courses
                </Button>
              </Link>
              <Link href="/instructor/analytics" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin/users" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Overview</CardTitle>
              <CardDescription>Quick stats for your courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Your Courses</span>
                  <Link
                    href="/instructor/courses"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View All
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Analytics</span>
                  <Link
                    href="/instructor/analytics"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View Dashboard
                  </Link>
                </div>
                {user?.role === 'admin' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">User Management</span>
                    <Link
                      href="/admin/users"
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Manage Users
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
