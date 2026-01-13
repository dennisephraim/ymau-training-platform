'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CourseForm } from '@/components/courses/CourseForm';

export default function NewCoursePage() {
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
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create New Course</h1>
        <p className="text-gray-600 mt-1">
          Set up a new training course for YMAU delegates
        </p>
      </div>

      <div className="max-w-2xl">
        <CourseForm mode="create" />
      </div>
    </div>
  );
}
