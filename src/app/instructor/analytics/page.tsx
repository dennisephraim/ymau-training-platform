'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthContext';
import { CourseAnalytics, getInstructorCourseAnalytics } from '@/lib/services/analytics';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<CourseAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getInstructorCourseAnalytics(user.id);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Calculate totals
  const totals = analytics.reduce(
    (acc, course) => ({
      enrollments: acc.enrollments + course.totalEnrollments,
      active: acc.active + course.activeEnrollments,
      completed: acc.completed + course.completedEnrollments,
      certificates: acc.certificates + course.certificatesIssued,
    }),
    { enrollments: 0, active: 0, completed: 0, certificates: 0 }
  );

  const overallCompletionRate =
    totals.enrollments > 0
      ? ((totals.completed / totals.enrollments) * 100).toFixed(1)
      : '0';

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            View student progress and completion rates
          </p>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">
          View student progress and completion rates across your courses
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 truncate">
                  Total Enrollments
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {totals.enrollments}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 truncate">
                  Active Students
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {totals.active}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-full shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 truncate">
                  Completion Rate
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {overallCompletionRate}%
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-ymau-orange/20 rounded-full shrink-0">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-ymau-orange" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 truncate">
                  Certificates Issued
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {totals.certificates}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-full shrink-0">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" aria-hidden="true" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" aria-hidden="true" />
            Course Performance
          </CardTitle>
          <CardDescription>
            Breakdown of student progress by course
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Courses Yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create your first course to start tracking student progress.
              </p>
              <Link href="/instructor/courses/new">
                <Button className="mt-4">Create Course</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.map((item) => (
                <CourseAnalyticsCard key={item.course.id} analytics={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CourseAnalyticsCard({ analytics }: { analytics: CourseAnalytics }) {
  const { course, totalEnrollments, activeEnrollments, completedEnrollments, averageProgress, certificatesIssued } = analytics;

  const completionRate =
    totalEnrollments > 0
      ? ((completedEnrollments / totalEnrollments) * 100).toFixed(0)
      : '0';

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-gray-900 truncate">{course.title}</h3>
            {!course.isPublished && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                Draft
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm">
            <div className="flex items-center text-gray-500">
              <Users className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
              <span>{totalEnrollments} enrolled</span>
            </div>
            <div className="flex items-center text-green-600">
              <TrendingUp className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
              <span>{activeEnrollments} active</span>
            </div>
            <div className="flex items-center text-blue-600">
              <BarChart3 className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
              <span>{averageProgress.toFixed(0)}% avg</span>
            </div>
            <div className="flex items-center text-yellow-600">
              <Award className="h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
              <span>{certificatesIssued} certs</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Completion Rate</span>
              <span>{completionRate}% ({completedEnrollments}/{totalEnrollments})</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        <Link href={`/instructor/courses/${course.id}/students`} className="shrink-0">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Eye className="h-4 w-4 sm:mr-1" aria-hidden="true" />
            <span className="sm:inline">Details</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
