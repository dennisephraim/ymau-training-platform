'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  BookOpen, 
  Clock, 
  Video, 
  Play, 
  CheckCircle,
  Compass,
  Plus,
  GraduationCap
} from 'lucide-react';
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

  // Separate completed and in-progress courses
  const completedCourses = enrollments.filter(e => e.status === 'completed');
  const inProgressCourses = enrollments.filter(e => e.status !== 'completed');

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-72 animate-pulse"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-500 mt-1">
            {enrollments.length > 0 
              ? `${enrollments.length} course${enrollments.length !== 1 ? 's' : ''} • ${completedCourses.length} completed`
              : 'View your enrolled courses and continue learning'
            }
          </p>
        </div>
        <Link href="/dashboard/enroll">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Join Course
          </Button>
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <Card className="border-dashed border-2 border-ymau-dark-red/30 bg-ymau-dark-red/5">
          <CardContent className="py-12">
            <EmptyState
              icon={<Compass className="h-8 w-8" />}
              title="No Courses Yet"
              description="You haven't enrolled in any courses yet. Browse available courses or enter an enrollment code from your instructor."
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
      ) : (
        <div className="space-y-8">
          {/* In Progress Courses */}
          {inProgressCourses.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Play className="h-5 w-5 text-ymau-dark-red" />
                In Progress
                <Badge variant="info" size="sm">{inProgressCourses.length}</Badge>
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {inProgressCourses.map((enrollment) => (
                  <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Courses */}
          {completedCourses.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-emerald-500" />
                Completed
                <Badge variant="success" size="sm">{completedCourses.length}</Badge>
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {completedCourses.map((enrollment) => (
                  <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </div>
          )}
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
    <Link 
      href={`/dashboard/courses/${enrollment.id}`}
      className="group block"
    >
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-ymau-dark-red/30 hover:shadow-lg hover:shadow-ymau-dark-red/10 transition-all duration-300">
        {/* Course Header with gradient */}
        <div className={`h-2 ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-ymau-dark-red to-ymau-orange'}`} />
        
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isCompleted ? (
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
              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                {course.description || 'No description'}
              </p>
            </div>
            <CircularProgress 
              value={progressPercentage} 
              size="md"
              strokeWidth={4}
              className="shrink-0 ml-3"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1.5">
              <Video className="h-4 w-4" />
              <span>{completedChapters}/{totalChapters} chapters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(course.totalDurationSeconds)}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Progress</span>
              <span className="font-medium text-gray-700">{progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercentage} size="md" />
          </div>

          {/* Action */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {isCompleted ? 'View certificate' : 'Continue where you left off'}
            </span>
            <span className="text-sm font-medium text-ymau-dark-red group-hover:text-ymau-dark-red/80 flex items-center gap-1">
              <Play className="h-3 w-3" />
              {isCompleted ? 'Review' : 'Continue'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
