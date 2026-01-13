'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar, Users, Key, Copy, Check, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCourse } from '@/lib/hooks/useCourses';
import { useAuth } from '@/components/auth/AuthContext';
import { CourseIteration, EnrollmentCode } from '@/types/enrollment';
import * as iterationService from '@/lib/services/iterations';
import { formatDate } from '@/lib/utils/formatters';

export default function IterationsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const { course, loading: courseLoading } = useCourse(courseId);
  const { user } = useAuth();
  const [iterations, setIterations] = useState<CourseIteration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIteration, setEditingIteration] = useState<CourseIteration | null>(null);

  const fetchIterations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await iterationService.getIterations(courseId);
      setIterations(data);
    } catch (err) {
      console.error('Error fetching iterations:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchIterations();
  }, [fetchIterations]);

  if (courseLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-48 mt-2 animate-pulse"></div>
        </div>
        <Card className="animate-pulse">
          <CardContent className="py-8">
            <div className="h-20 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
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
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{course.title}</h1>
        <p className="text-gray-600 mt-1">Manage course iterations (semesters)</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {iterations.length} {iterations.length === 1 ? 'iteration' : 'iterations'}
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Iteration
        </Button>
      </div>

      {showAddForm && user && (
        <IterationForm
          courseId={courseId}
          userId={user.id}
          onClose={() => setShowAddForm(false)}
          onSaved={() => {
            setShowAddForm(false);
            fetchIterations();
          }}
        />
      )}

      {editingIteration && user && (
        <IterationForm
          courseId={courseId}
          userId={user.id}
          iteration={editingIteration}
          onClose={() => setEditingIteration(null)}
          onSaved={() => {
            setEditingIteration(null);
            fetchIterations();
          }}
        />
      )}

      {iterations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No iterations yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Create an iteration for each semester or cohort.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {iterations.map((iteration) => (
            <IterationCard
              key={iteration.id}
              iteration={iteration}
              courseId={courseId}
              userId={user?.id || ''}
              onEdit={() => setEditingIteration(iteration)}
              onDelete={async () => {
                if (confirm('Are you sure you want to delete this iteration?')) {
                  await iterationService.deleteIteration(iteration.id);
                  fetchIterations();
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IterationCard({
  iteration,
  courseId,
  userId,
  onEdit,
  onDelete,
}: {
  iteration: CourseIteration;
  courseId: string;
  userId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [codes, setCodes] = useState<EnrollmentCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  const fetchCodes = async () => {
    setLoadingCodes(true);
    try {
      const data = await iterationService.getEnrollmentCodes(iteration.id);
      setCodes(data);
    } catch (err) {
      console.error('Error fetching codes:', err);
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      await iterationService.createEnrollmentCode(iteration.id, courseId, userId);
      fetchCodes();
    } catch (err) {
      console.error('Error generating code:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{iteration.name}</CardTitle>
            <CardDescription className="mt-1">
              {iteration.startDate && iteration.endDate ? (
                `${formatDate(iteration.startDate)} - ${formatDate(iteration.endDate)}`
              ) : (
                'No dates set'
              )}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                iteration.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {iteration.isActive ? 'Active' : 'Inactive'}
            </span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                iteration.enrollmentOpen
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {iteration.enrollmentOpen ? 'Enrollment Open' : 'Enrollment Closed'}
            </span>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <MoreVertical className="h-5 w-5 text-gray-400" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCodes(!showCodes);
              if (!showCodes && codes.length === 0) {
                fetchCodes();
              }
            }}
          >
            <Key className="h-4 w-4 mr-2" />
            Enrollment Codes
          </Button>
          <Link href={`/instructor/courses/${courseId}/iterations/${iteration.id}/students`}>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              View Students
            </Button>
          </Link>
        </div>

        {showCodes && (
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Enrollment Codes</h4>
              <Button size="sm" onClick={handleGenerateCode}>
                <Plus className="h-4 w-4 mr-1" />
                Generate Code
              </Button>
            </div>
            {loadingCodes ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : codes.length === 0 ? (
              <div className="text-sm text-gray-500">No codes generated yet</div>
            ) : (
              <div className="space-y-2">
                {codes.map((code) => (
                  <EnrollmentCodeItem key={code.id} code={code} onDeactivate={fetchCodes} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EnrollmentCodeItem({
  code,
  onDeactivate,
}: {
  code: EnrollmentCode;
  onDeactivate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeactivate = async () => {
    if (confirm('Deactivate this code?')) {
      await iterationService.deactivateEnrollmentCode(code.id);
      onDeactivate();
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <code className="font-mono text-lg font-bold text-gray-900">{code.code}</code>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-gray-200"
          title="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        <span>Used: {code.useCount}{code.maxUses ? `/${code.maxUses}` : ''}</span>
        {code.isActive ? (
          <Button variant="ghost" size="sm" onClick={handleDeactivate}>
            Deactivate
          </Button>
        ) : (
          <span className="text-red-600">Inactive</span>
        )}
      </div>
    </div>
  );
}

function IterationForm({
  courseId,
  userId,
  iteration,
  onClose,
  onSaved,
}: {
  courseId: string;
  userId: string;
  iteration?: CourseIteration;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(iteration?.name || '');
  const [startDate, setStartDate] = useState(
    iteration?.startDate ? iteration.startDate.toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    iteration?.endDate ? iteration.endDate.toISOString().split('T')[0] : ''
  );
  const [isActive, setIsActive] = useState(iteration?.isActive ?? true);
  const [enrollmentOpen, setEnrollmentOpen] = useState(iteration?.enrollmentOpen ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        courseId,
        name: name.trim(),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive,
        enrollmentOpen,
        createdBy: userId,
      };

      if (iteration) {
        await iterationService.updateIteration(iteration.id, data);
      } else {
        await iterationService.createIteration(data);
      }
      onSaved();
    } catch (err) {
      console.error('Error saving iteration:', err);
      setError('Failed to save iteration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{iteration ? 'Edit Iteration' : 'Create New Iteration'}</CardTitle>
        <CardDescription>
          {iteration ? 'Update iteration details' : 'Create a new semester or cohort'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <Input
            label="Iteration Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Fall 2026, Spring 2027"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active (students can access this iteration)
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="enrollmentOpen"
                checked={enrollmentOpen}
                onChange={(e) => setEnrollmentOpen(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="enrollmentOpen" className="text-sm text-gray-700">
                Enrollment open (new students can join)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              {iteration ? 'Save Changes' : 'Create Iteration'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
