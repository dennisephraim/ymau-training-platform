'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/components/auth/AuthContext';
import { Course } from '@/types/course';
import * as courseService from '@/lib/services/courses';
import { Calendar, Users } from 'lucide-react';

interface CourseFormProps {
  course?: Course;
  mode: 'create' | 'edit';
}

// Helper to format date for input
function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

export function CourseForm({ course, mode }: CourseFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [isPublished, setIsPublished] = useState(course?.isPublished || false);
  const [enrollmentOpen, setEnrollmentOpen] = useState(course?.enrollmentOpen || false);
  const [startDate, setStartDate] = useState(formatDateForInput(course?.startDate || null));
  const [endDate, setEndDate] = useState(formatDateForInput(course?.endDate || null));
  const [maxStudents, setMaxStudents] = useState<string>(course?.maxStudents?.toString() || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!user) {
      setError('You must be logged in');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const courseId = await courseService.createCourse({
          title: title.trim(),
          description: description.trim(),
          thumbnailUrl: null,
          createdBy: user.id,
          isPublished,
          enrollmentOpen,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          maxStudents: maxStudents ? parseInt(maxStudents) : null,
        });
        router.push(`/instructor/courses/${courseId}/chapters`);
      } else if (course) {
        await courseService.updateCourse(course.id, {
          title: title.trim(),
          description: description.trim(),
          isPublished,
          enrollmentOpen,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          maxStudents: maxStudents ? parseInt(maxStudents) : null,
        });
        router.push('/instructor/courses');
      }
    } catch (err) {
      console.error('Error saving course:', err);
      setError('Failed to save course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Create New Course' : 'Edit Course'}</CardTitle>
          <CardDescription>
            {mode === 'create'
              ? 'Fill in the details to create a new training course.'
              : 'Update the course details below.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Input
            label="Course Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Delegate Training 2026"
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what students will learn in this course..."
              rows={4}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isPublished" className="text-sm text-gray-700">
              Publish course (make it visible to students)
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="enrollmentOpen"
              checked={enrollmentOpen}
              onChange={(e) => setEnrollmentOpen(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="enrollmentOpen" className="text-sm text-gray-700">
              Open enrollment (allow students to enroll in this course)
            </label>
          </div>

          {/* Enrollment Settings */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              Enrollment Settings
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Start Date (optional)"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="End Date (optional)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <Input
                label="Maximum Students (optional)"
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                placeholder="Leave empty for unlimited"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                <Users className="h-3 w-3 inline mr-1" />
                Set a limit on how many students can enroll
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              {mode === 'create' ? 'Create Course' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
