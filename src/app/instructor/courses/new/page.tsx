'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/components/auth/AuthContext';
import { InstructorPicker } from '@/components/courses/InstructorPicker';
import * as courseService from '@/lib/services/courses';
import { 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  FileText, 
  Sparkles,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function NewCoursePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructorIds, setInstructorIds] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter a course title');
      return;
    }

    if (!user) {
      setError('You must be logged in');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const courseId = await courseService.createCourse({
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl: null,
        createdBy: user.id,
        instructorIds,
        isPublished: false,
        enrollmentOpen: false,
        startDate: null,
        endDate: null,
        maxStudents: null,
      });
      router.push(`/instructor/courses/${courseId}/chapters`);
    } catch (err) {
      console.error('Error creating course:', err);
      setError('Failed to create course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Back Button */}
      <Link
        href="/instructor/courses"
        className="inline-flex items-center text-sm text-gray-500 hover:text-ymau-dark-red transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Courses
      </Link>

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-ymau-dark-red to-ymau-orange text-white mb-4 shadow-lg shadow-ymau-dark-red/25">
          <BookOpen className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
        <p className="text-gray-500 mt-2">
          Set up a new training course for your students
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-ymau-dark-red text-white flex items-center justify-center text-sm font-medium">
            1
          </div>
          <span className="text-sm font-medium text-gray-900">Details</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-200"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-medium">
            2
          </div>
          <span className="text-sm text-gray-400">Chapters</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-200"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-medium">
            3
          </div>
          <span className="text-sm text-gray-400">Publish</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="border-2 border-gray-100 shadow-xl shadow-gray-100/50">
          <CardContent className="p-8 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Course Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., Delegate Training 2026"
                className="text-lg"
              />
              <p className="text-xs text-gray-500">
                Choose a clear, descriptive title that explains what students will learn
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what students will learn in this course, the skills they'll gain, and any prerequisites..."
                rows={5}
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-ymau-dark-red focus:outline-none focus:ring-2 focus:ring-ymau-dark-red/20 transition-all"
              />
              <p className="text-xs text-gray-500">
                A good description helps students understand if this course is right for them
              </p>
            </div>

            {/* Additional Instructors */}
            <div className="pt-4 border-t border-gray-100">
              <InstructorPicker
                selectedIds={instructorIds}
                onChange={setInstructorIds}
                currentUserId={user?.id}
                disabled={loading}
                label="Co-Instructors (Optional)"
              />
              <p className="text-xs text-gray-500 mt-2">
                Add other instructors who can manage this course content
              </p>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-ymau-light-indigo/20 to-ymau-orange/10 rounded-xl p-5 border border-ymau-dark-red/20">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-ymau-dark-red flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">Quick Tips</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      Use a specific title (e.g., "Spring 2026 Training" not "Training")
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      Include key topics in the description
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      You can edit these details later
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Continue to Chapters
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
