'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen, Clock, Video, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { BrowsableCourse, getPublishedCourses } from '@/lib/services/browse';
import { CourseIteration, Enrollment } from '@/types/enrollment';
import * as enrollmentService from '@/lib/services/enrollments';
import { formatDuration, formatDate } from '@/lib/utils/formatters';

export default function BrowseCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<BrowsableCourse[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [coursesData, enrollmentsData] = await Promise.all([
        getPublishedCourses(),
        enrollmentService.getUserEnrollments(user.id),
      ]);
      setCourses(coursesData);
      setUserEnrollments(enrollmentsData);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Courses</h1>
          <p className="text-gray-600 mt-1">Discover available training courses</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
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
        <h1 className="text-2xl font-bold text-gray-900">Browse Courses</h1>
        <p className="text-gray-600 mt-1">
          Discover available training courses and request enrollment
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Courses Available</h3>
              <p className="mt-2 text-sm text-gray-500">
                There are no courses with open enrollment at this time.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {courses.map((course) => (
            <BrowsableCourseCard
              key={course.id}
              course={course}
              userEnrollments={userEnrollments}
              userId={user?.id || ''}
              onEnrollmentChange={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BrowsableCourseCard({
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{course.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {course.description || 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Video className="h-4 w-4 mr-1" />
            {course.chapterCount} {course.chapterCount === 1 ? 'chapter' : 'chapters'}
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {formatDuration(course.totalDurationSeconds)}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Available Sessions</h4>
          <div className="space-y-3">
            {course.iterations.map((iteration) => (
              <IterationEnrollOption
                key={iteration.id}
                iteration={iteration}
                courseId={course.id}
                userId={userId}
                userEnrollments={userEnrollments}
                onEnrollmentChange={onEnrollmentChange}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IterationEnrollOption({
  iteration,
  courseId,
  userId,
  userEnrollments,
  onEnrollmentChange,
}: {
  iteration: CourseIteration;
  courseId: string;
  userId: string;
  userEnrollments: Enrollment[];
  onEnrollmentChange: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already enrolled in this iteration
  const isEnrolled = userEnrollments.some((e) => e.iterationId === iteration.id);

  const handleRequestEnrollment = async () => {
    setLoading(true);
    setError(null);

    try {
      await enrollmentService.createEnrollmentRequest(iteration.id, courseId, userId);
      setRequestSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900">{iteration.name}</p>
        {iteration.startDate && iteration.endDate && (
          <p className="text-xs text-gray-500 flex items-center mt-1">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(iteration.startDate)} - {formatDate(iteration.endDate)}
          </p>
        )}
      </div>
      <div>
        {isEnrolled ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Enrolled
          </span>
        ) : requestSent ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Request Sent
          </span>
        ) : error ? (
          <span className="text-xs text-red-600">{error}</span>
        ) : (
          <Button size="sm" onClick={handleRequestEnrollment} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Request Access'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
