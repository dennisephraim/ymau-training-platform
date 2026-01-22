'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  Plus, 
  BookOpen, 
  Clock, 
  Video, 
  MoreVertical, 
  Edit, 
  Users,
  ChevronRight,
  Copy,
  PlayCircle
} from 'lucide-react';
import { useCourses } from '@/lib/hooks/useCourses';
import { useAuth } from '@/components/auth/AuthContext';
import { Course } from '@/types/course';
import { duplicateCourse } from '@/lib/services/courses';
import { formatDuration } from '@/lib/utils/formatters';

export default function ManageCoursesPage() {
  const { courses, loading, error, refetch } = useCourses();

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
                </div>
              </div>
              <div className="mt-4 h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader />
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      {courses.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="Create your first course"
              description="Start building engaging training content for your students. Add videos, create chapters, and track progress."
              action={
                <Link href="/instructor/courses/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    New Course
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onUpdate={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-500 mt-1">Create and manage your training courses</p>
      </div>
      <Link href="/instructor/courses/new">
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          New Course
        </Button>
      </Link>
    </div>
  );
}

function CourseCard({ course, onUpdate }: { course: Course; onUpdate: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleDuplicate = async () => {
    if (!user) return;
    
    const newTitle = prompt('Enter a name for the duplicated course:', `${course.title} (Copy)`);
    if (!newTitle) return;

    setDuplicating(true);
    setShowMenu(false);
    
    try {
      const newCourseId = await duplicateCourse(course.id, newTitle, user.id);
      onUpdate();
      router.push(`/instructor/courses/${newCourseId}`);
    } catch (err) {
      console.error('Error duplicating course:', err);
      alert('Failed to duplicate course');
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className={`group relative bg-white rounded-xl border border-gray-200 hover:border-ymau-dark-red/30 hover:shadow-lg hover:shadow-ymau-dark-red/10 transition-all duration-300 ${duplicating ? 'opacity-50' : ''}`}>
      {/* Course Content */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Course Icon/Thumbnail */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-ymau-dark-red to-ymau-orange flex items-center justify-center text-white shadow-lg shadow-ymau-dark-red/20 flex-shrink-0">
            <PlayCircle className="h-7 w-7" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-ymau-dark-red transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                  {course.description || 'No description'}
                </p>
              </div>
              
              {/* Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg z-20 overflow-hidden">
                      <Link
                        href={`/instructor/courses/${course.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowMenu(false)}
                      >
                        <Edit className="h-4 w-4 text-gray-400" />
                        Edit Details
                      </Link>
                      <Link
                        href={`/instructor/courses/${course.id}/chapters`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowMenu(false)}
                      >
                        <Video className="h-4 w-4 text-gray-400" />
                        Manage Content
                      </Link>
                      <Link
                        href={`/instructor/courses/${course.id}/students`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowMenu(false)}
                      >
                        <Users className="h-4 w-4 text-gray-400" />
                        Manage Students
                      </Link>
                      <hr className="my-1.5 border-gray-100" />
                      <button
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={handleDuplicate}
                      >
                        <Copy className="h-4 w-4 text-gray-400" />
                        Duplicate Course
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Video className="h-4 w-4" />
            <span>{course.chapterCount} chapters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(course.totalDurationSeconds)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={course.isPublished ? 'success' : 'warning'}>
              {course.isPublished ? 'Published' : 'Draft'}
            </Badge>
            {course.enrollmentOpen && (
              <Badge variant="default">Enrolling</Badge>
            )}
          </div>
          
          <Link
            href={`/instructor/courses/${course.id}/students`}
            className="text-sm text-ymau-dark-red hover:text-ymau-dark-red/80 font-medium flex items-center gap-1 group/link"
          >
            <Users className="h-4 w-4" />
            <span>{course.enrolledCount || 0} students</span>
            <ChevronRight className="h-4 w-4 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
