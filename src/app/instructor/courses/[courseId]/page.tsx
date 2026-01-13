'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CourseForm } from '@/components/courses/CourseForm';
import { useCourse } from '@/lib/hooks/useCourses';
import { Card, CardContent } from '@/components/ui/Card';

export default function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { course, loading, error } = useCourse(courseId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/instructor/courses"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Courses
          </Link>
          <div className="h-8 bg-gray-200 rounded w-48 mt-2 animate-pulse"></div>
        </div>
        <Card className="max-w-2xl animate-pulse">
          <CardContent className="py-8 space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/instructor/courses"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Courses
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Course Not Found</h1>
        </div>
        <Card className="max-w-2xl">
          <CardContent className="py-8">
            <p className="text-center text-gray-500">
              {error || 'The course you are looking for does not exist.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/instructor/courses"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Courses
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Course</h1>
        <p className="text-gray-600 mt-1">Update course details</p>
      </div>

      <div className="max-w-2xl">
        <CourseForm course={course} mode="edit" />
      </div>
    </div>
  );
}
