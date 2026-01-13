'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/components/auth/AuthContext';
import { Key, CheckCircle, AlertCircle } from 'lucide-react';
import * as enrollmentService from '@/lib/services/enrollments';

export default function EnrollPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Please enter an enrollment code');
      return;
    }

    if (!user) {
      setError('You must be logged in to enroll');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await enrollmentService.enrollWithCode(code.trim().toUpperCase(), user.id);

      if (result.success) {
        setSuccess(true);
        // Redirect to courses after a short delay
        setTimeout(() => {
          router.push('/dashboard/courses');
        }, 2000);
      } else {
        setError(result.error || 'Failed to enroll');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Join a Course</h1>
        <p className="text-gray-600 mt-1">
          Enter an enrollment code to join a course
        </p>
      </div>

      <div className="max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Enrollment Code</CardTitle>
                <CardDescription>
                  Get a code from your instructor
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center py-4">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Successfully Enrolled!</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Redirecting to your courses...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Input
                  label="Enrollment Code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g., ABC12345)"
                  className="font-mono text-lg tracking-wider"
                  maxLength={10}
                />

                <Button type="submit" isLoading={loading} className="w-full">
                  Join Course
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How to get an enrollment code</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>1. Contact your YMAU instructor or program coordinator</p>
              <p>2. Ask them for the enrollment code for your course/semester</p>
              <p>3. Enter the code above to join the course</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
