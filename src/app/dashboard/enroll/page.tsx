'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/components/auth/AuthContext';
import { 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Video,
  Calendar,
  Loader2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Users
} from 'lucide-react';
import { BrowsableCourse, getPublishedCourses } from '@/lib/services/browse';
import { Enrollment } from '@/types/enrollment';
import * as enrollmentService from '@/lib/services/enrollments';
import { formatDuration, formatDate } from '@/lib/utils/formatters';

export default function ExplorePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('browse');
  
  // Code enrollment state
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState(false);
  
  // Browse state
  const [courses, setCourses] = useState<BrowsableCourse[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<Enrollment[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    try {
      setBrowseLoading(true);
      const [coursesData, enrollmentsData] = await Promise.all([
        getPublishedCourses(),
        enrollmentService.getUserEnrollments(user.id),
      ]);
      setCourses(coursesData);
      setUserEnrollments(enrollmentsData);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setBrowseLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !user) {
      setCodeError('Please enter an enrollment code');
      return;
    }

    setCodeLoading(true);
    setCodeError(null);

    try {
      const result = await enrollmentService.enrollWithCode(code.trim().toUpperCase(), user.id);
      if (result.success) {
        setCodeSuccess(true);
        setTimeout(() => router.push('/dashboard/courses'), 2000);
      } else {
        setCodeError(result.error || 'Failed to enroll');
      }
    } catch (err) {
      setCodeError('An error occurred. Please try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Explore Courses</h1>
        <p className="text-gray-500 mt-1">
          Join a course with an enrollment code or browse available sessions
        </p>
      </div>

      {/* Quick Enroll Card */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Key className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Have an enrollment code?</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter the code from your instructor to instantly join a course
              </p>
            </div>
            {codeSuccess ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Success! Redirecting...</span>
              </div>
            ) : (
              <form onSubmit={handleCodeSubmit} className="flex gap-2 flex-shrink-0">
                <div className="relative">
                  <Input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setCodeError(null);
                    }}
                    placeholder="ENTER CODE"
                    className="w-40 font-mono text-center tracking-widest uppercase"
                    maxLength={10}
                  />
                </div>
                <Button type="submit" isLoading={codeLoading}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
          {codeError && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {codeError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Catalog */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Course Catalog</h2>
          <Badge variant="info" size="sm">
            <Sparkles className="h-3 w-3" />
            {courses.length} available
          </Badge>
        </div>

        {browseLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </div>
                </div>
                <div className="mt-6 h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={<BookOpen className="h-8 w-8" />}
                title="No courses available"
                description="There are no courses with open enrollment at this time. Check back later or contact your instructor for an enrollment code."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                userEnrollments={userEnrollments}
                userId={user?.id || ''}
                onEnrollmentChange={fetchCourses}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({
  course,
  userEnrollments,
  userId,
  onEnrollmentChange,
}: {
  course: BrowsableCourse;
  userEnrollments: Enrollment[];
  userId: string;
  onEnrollmentChange: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isEnrolled = userEnrollments.some(e => e.courseId === course.id);
  
  const handleRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      await enrollmentService.createEnrollmentRequest(course.id, userId);
      setRequestSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 overflow-hidden">
      {/* Course Header */}
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white flex-shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {course.description || 'No description'}
            </p>
          </div>
        </div>
        
        {/* Course Stats */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Video className="h-4 w-4" />
            <span>{course.chapterCount} chapters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(course.totalDurationSeconds)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{course.enrolledCount || 0} enrolled</span>
          </div>
        </div>
        
        {/* Course Dates */}
        {(course.startDate || course.endDate) && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>
              {course.startDate && course.endDate
                ? `${formatDate(course.startDate)} - ${formatDate(course.endDate)}`
                : course.startDate
                ? `Starts ${formatDate(course.startDate)}`
                : course.endDate
                ? `Ends ${formatDate(course.endDate)}`
                : ''}
            </span>
          </div>
        )}
        
        {/* Action */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <Badge variant={course.enrollmentOpen ? 'success' : 'default'} size="sm">
            {course.enrollmentOpen ? 'Open' : 'Closed'}
          </Badge>
          
          {isEnrolled ? (
            <Badge variant="success" size="sm">
              <CheckCircle className="h-3 w-3" />
              Enrolled
            </Badge>
          ) : requestSent ? (
            <Badge variant="info" size="sm">Request Pending</Badge>
          ) : error ? (
            <span className="text-xs text-red-600">{error}</span>
          ) : (
            <Button size="sm" onClick={handleRequest} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Request Enrollment'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
