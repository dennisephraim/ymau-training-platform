'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen, Clock, Video, Play, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Enrollment } from '@/types/enrollment';
import { Course } from '@/types/course';
import { CourseProgress } from '@/types/progress';
import * as enrollmentService from '@/lib/services/enrollments';
import * as courseService from '@/lib/services/courses';
import * as progressService from '@/lib/services/progress';
import { formatDuration } from '@/lib/utils/formatters';

interface EnrolledCourse extends Enrollment {
  course: Course | null;
  progress: CourseProgress | null;
}

export default function MyCoursesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnrollments = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userEnrollments = await enrollmentService.getUserEnrollments(user.id);

      // Fetch course details and progress for each enrollment
      const enrichedEnrollments = await Promise.all(
        userEnrollments.map(async (enrollment) => {
          const [course, progress] = await Promise.all([
            courseService.getCourse(enrollment.courseId),
            progressService.getCourseProgress(enrollment.id, enrollment.courseId),
          ]);
          return { ...enrollment, course, progress };
        })
      );

      setEnrollments(enrichedEnrollments);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-600 mt-1">View your enrolled courses and continue learning</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-600 mt-1">View your enrolled courses and continue learning</p>
        </div>
        {user?.role === 'student' && (
          <Link href="/dashboard/enroll">
            <Button variant="outline">Join Course</Button>
          </Link>
        )}
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Courses Yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                You haven&apos;t enrolled in any courses yet.
              </p>
              {user?.role === 'student' && (
                <div className="mt-6">
                  <Link href="/dashboard/enroll">
                    <Button>Join a Course</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => (
            <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
          ))}
        </div>
      )}
    </div>
  );
}

function EnrolledCourseCard({ enrollment }: { enrollment: EnrolledCourse }) {
  const { course, progress } = enrollment;

  if (!course) {
    return null;
  }

  const isCompleted = enrollment.status === 'completed';
  const progressPercentage = progress?.overallPercentage || 0;
  const completedChapters = progress?.completedChapters || 0;
  const totalChapters = progress?.totalChapters || course.chapterCount;

  return (
    <Card className="relative overflow-hidden">
      {isCompleted && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-lg pr-20">{course.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {course.description || 'No description'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Video className="h-4 w-4 mr-1" />
            {completedChapters}/{totalChapters} chapters
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {formatDuration(course.totalDurationSeconds)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <Link href={`/dashboard/courses/${enrollment.id}`}>
          <Button className="w-full">
            <Play className="h-4 w-4 mr-2" />
            {isCompleted ? 'Review Course' : 'Continue Learning'}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
