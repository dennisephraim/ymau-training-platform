'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
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
  Compass,
  Sparkles,
  TrendingUp,
  Target,
} from 'lucide-react';
import { Enrollment } from '@/types/enrollment';
import { Course } from '@/types/course';
import { Certificate } from '@/types/certificate';
import * as enrollmentService from '@/lib/services/enrollments';
import * as courseService from '@/lib/services/courses';
import * as certificateService from '@/lib/services/certificates';
import * as progressService from '@/lib/services/progress';
import { formatDuration } from '@/lib/utils/formatters';
import Image from 'next/image';

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

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Header Skeleton */}
        <div className="relative overflow-hidden rounded-2xl p-8 bg-gray-200 animate-pulse" style={{ minHeight: '220px' }}>
          <div className="relative space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
              <div className="h-4 bg-gray-300 rounded w-24"></div>
            </div>
            <div className="h-9 bg-gray-300 rounded-lg w-72"></div>
            <div className="h-4 bg-gray-300 rounded w-96 max-w-full"></div>
            
            {/* Stats skeleton */}
            <div className="flex items-center gap-6 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-300/50 rounded-xl px-4 py-2">
                  <div className="w-5 h-5 bg-gray-300 rounded"></div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-300 rounded w-12"></div>
                    <div className="h-5 bg-gray-300 rounded w-6"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Continue Learning Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            <div className="h-9 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const greeting = getGreeting();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white" style={{ backgroundImage: 'url(/YMAU%20Logos%20%28Banner%29.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#1e1b4b' }}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <Image
              src="/YMAU Crest.svg"
              alt="YMAU Crest"
              width={20}
              height={20}
            />
            {greeting}
          </div>
          <h1 className="text-3xl font-bold">Welcome back, {firstName}!</h1>
          <p className="mt-2 text-white/80 max-w-xl">
            {user?.role === 'student' 
              ? "Continue your learning journey. Every video watched brings you closer to your goals."
              : user?.role === 'instructor'
              ? "Manage your courses and track student progress from your dashboard."
              : "Full access to manage users, courses, and system settings."}
          </p>
        </div>
        
        {/* Quick stats in header */}
        {user?.role === 'student' && stats.enrolledCourses > 0 && (
          <div className="relative mt-6 flex items-center gap-6">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <Target className="h-5 w-5" />
              <div>
                <p className="text-xs text-white/70">Courses</p>
                <p className="font-semibold">{stats.enrolledCourses}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <TrendingUp className="h-5 w-5" />
              <div>
                <p className="text-xs text-white/70">Completed</p>
                <p className="font-semibold">{stats.completed}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <Award className="h-5 w-5" />
              <div>
                <p className="text-xs text-white/70">Certificates</p>
                <p className="font-semibold">{stats.certificates}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student Content */}
      {user?.role === 'student' && (
        <>
          {/* Continue Learning Section */}
          {recentCourses.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Continue Learning</h2>
                  <p className="text-sm text-gray-500">Pick up where you left off</p>
                </div>
                <Link href="/dashboard/courses">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentCourses.map(({ enrollment, course, progress }) => (
                  <Link 
                    key={enrollment.id} 
                    href={`/dashboard/courses/${enrollment.id}`}
                    className="group"
                  >
                    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-ymau-dark-red/30 hover:shadow-lg hover:shadow-ymau-dark-red/10 transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {enrollment.status === 'completed' ? (
                              <Badge variant="success" size="sm">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="info" size="sm">In Progress</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-ymau-dark-red transition-colors truncate">
                            {course.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {course.chapterCount} chapters • {formatDuration(course.totalDurationSeconds)}
                          </p>
                        </div>
                        <CircularProgress 
                          value={progress} 
                          size="md"
                          strokeWidth={4}
                          className="shrink-0"
                        />
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {Math.round(progress)}% complete
                        </span>
                        <span className="text-sm font-medium text-ymau-dark-red group-hover:text-ymau-dark-red/80 flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {enrollment.status === 'completed' ? 'Review' : 'Continue'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            /* Getting Started for new students */
            <Card className="border-dashed border-2 border-ymau-dark-red/30 bg-ymau-dark-red/5">
              <CardContent className="py-12">
                <EmptyState
                  icon={<Compass className="h-8 w-8" />}
                  title="Start Your Learning Journey"
                  description="You're not enrolled in any courses yet. Browse available courses or enter an enrollment code from your instructor."
                  action={
                    <Link href="/dashboard/enroll">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Explore Courses
                      </Button>
                    </Link>
                  }
                />
              </CardContent>
            </Card>
          )}


        </>
      )}

      {/* Instructor Content */}
      {(user?.role === 'instructor' || user?.role === 'admin') && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-ymau-orange" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common instructor tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/instructor/courses/new" className="block">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Course
                </Button>
              </Link>
              <Link href="/instructor/courses" className="block">
                <Button className="w-full justify-start" variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage Courses
                </Button>
              </Link>
              <Link href="/instructor/analytics" className="block">
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin/users" className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
                Platform Overview
              </CardTitle>
              <CardDescription>Quick navigation to key areas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuickLink href="/instructor/courses" label="Your Courses" />
              <QuickLink href="/instructor/analytics" label="Analytics Dashboard" />
              {user?.role === 'admin' && (
                <QuickLink href="/admin/users" label="User Management" />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <span className="text-sm text-gray-700">{label}</span>
      <ArrowRight className="h-4 w-4 text-gray-400" />
    </Link>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
