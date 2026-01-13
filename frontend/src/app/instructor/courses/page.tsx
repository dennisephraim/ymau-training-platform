'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlusCircle, BookOpen, Clock, Video, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { useCourses } from '@/lib/hooks/useCourses';
import { Course } from '@/types/course';
import { formatDuration } from '@/lib/utils/formatters';

export default function ManageCoursesPage() {
  const { courses, loading, error, refetch } = useCourses();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Courses</h1>
            <p className="text-gray-600 mt-1">Create and manage training courses</p>
          </div>
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Courses</h1>
            <p className="text-gray-600 mt-1">Create and manage training courses</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-red-600">{error}</p>
            <div className="text-center mt-4">
              <Button onClick={refetch} variant="outline">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Courses</h1>
          <p className="text-gray-600 mt-1">Create and manage training courses</p>
        </div>
        <Link href="/instructor/courses/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No courses yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by creating your first training course.
              </p>
              <div className="mt-6">
                <Link href="/instructor/courses/new">
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onDelete={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, onDelete }: { course: Course; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{course.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {course.description || 'No description'}
            </CardDescription>
          </div>
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20">
                  <Link
                    href={`/instructor/courses/${course.id}`}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowMenu(false)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Course
                  </Link>
                  <Link
                    href={`/instructor/courses/${course.id}/chapters`}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowMenu(false)}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Manage Chapters
                  </Link>
                  <Link
                    href={`/instructor/courses/${course.id}/iterations`}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowMenu(false)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Iterations
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
        <div className="mt-3 flex items-center">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              course.isPublished
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {course.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
