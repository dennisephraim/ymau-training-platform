'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  ClipboardList,
  Calendar,
  Users,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { InstructorPicker } from '@/components/courses/InstructorPicker';
import { TaskQuestion, QuestionResponseType } from '@/types/task';
import { UserRole } from '@/types/user';
import * as taskService from '@/lib/services/tasks';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Students' },
  { value: 'instructor', label: 'Instructors' },
  { value: 'admin', label: 'Admins' },
];

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const taskId = params.taskId as string;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<TaskQuestion[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<UserRole[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [instructorIds, setInstructorIds] = useState<string[]>([]);
  const [createdBy, setCreatedBy] = useState<string>('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      const task = await taskService.getTask(taskId);
      if (!task) {
        setError('Task not found');
        return;
      }

      setTitle(task.title);
      setDescription(task.description);
      setQuestions(task.questions);
      setAssignedRoles(task.assignedRoles);
      setIsPublished(task.isPublished);
      setInstructorIds(task.instructorIds || []);
      setCreatedBy(task.createdBy);
      
      if (task.dueDate) {
        // Format date for datetime-local input
        const d = new Date(task.dueDate);
        const formatted = d.toISOString().slice(0, 16);
        setDueDate(formatted);
      }
    } catch (err) {
      console.error('Error fetching task:', err);
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { id: crypto.randomUUID(), text: '', order: questions.length, responseType: 'text' },
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length === 1) {
      setError('Tasks must have at least one question');
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i })));
  };

  const updateQuestion = (id: string, text: string) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)));
  };

  const updateQuestionResponseType = (id: string, responseType: QuestionResponseType) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, responseType } : q)));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }

    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })));
  };

  const toggleRole = (role: UserRole) => {
    if (assignedRoles.includes(role)) {
      if (assignedRoles.length === 1) {
        setError('At least one role must be selected');
        return;
      }
      setAssignedRoles(assignedRoles.filter((r) => r !== role));
    } else {
      setAssignedRoles([...assignedRoles, role]);
    }
    setError(null);
  };

  const handleSubmit = async (publish?: boolean) => {
    if (!user) return;

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const emptyQuestions = questions.filter((q) => !q.text.trim());
    if (emptyQuestions.length > 0) {
      setError('All questions must have text');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await taskService.updateTask(taskId, {
        title: title.trim(),
        description: description.trim(),
        questions,
        assignedRoles,
        dueDate: dueDate ? new Date(dueDate) : null,
        allowsFileUpload: questions.some(q => q.responseType === 'file' || q.responseType === 'either'),
        instructorIds,
        isPublished: publish !== undefined ? publish : isPublished,
      });

      router.push('/instructor/tasks');
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ymau-dark-red" />
      </div>
    );
  }

  if (error && !title) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/instructor/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/instructor/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Edit Task</h1>
          <p className="text-gray-500">Update task details and questions</p>
        </div>
        <Badge variant={isPublished ? 'success' : 'default'}>
          {isPublished ? 'Published' : 'Draft'}
        </Badge>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-ymau-orange" />
            Task Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this task is about..."
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red"
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">Questions</span>
            <Badge variant="info" size="sm">{questions.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex flex-col items-center gap-1 pt-2">
                <button
                  onClick={() => moveQuestion(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <GripVertical className="h-4 w-4 text-gray-300" />
                <button
                  onClick={() => moveQuestion(index, 'down')}
                  disabled={index === questions.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question {index + 1}
                  </label>
                  <textarea
                    value={question.text}
                    onChange={(e) => updateQuestion(question.id, e.target.value)}
                    placeholder="Enter question text..."
                    rows={2}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Expected Response
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestionResponseType(question.id, 'text')}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                        question.responseType === 'text'
                          ? 'bg-ymau-dark-red text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Text Answer
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestionResponseType(question.id, 'file')}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                        question.responseType === 'file'
                          ? 'bg-ymau-dark-red text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestionResponseType(question.id, 'either')}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                        question.responseType === 'either'
                          ? 'bg-ymau-dark-red text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Either
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeQuestion(question.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-6"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assigned Roles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4" />
              Assign to Roles
            </label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => toggleRole(role.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    assignedRoles.includes(role.value)
                      ? 'bg-ymau-dark-red text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4" />
              Due Date
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red"
            />
          </div>

          {/* Co-Instructors */}
          <div className="pt-4 border-t border-gray-200">
            <InstructorPicker
              selectedIds={instructorIds}
              onChange={setInstructorIds}
              createdById={createdBy}
              currentUserId={user?.id}
              disabled={saving}
              label="Co-Instructors"
            />
            <p className="text-xs text-gray-500 mt-2">
              Add other instructors who can manage this task and view responses
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Link href="/instructor/tasks">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <div className="flex gap-3">
          {isPublished ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                disabled={saving}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish
              </Button>
              <Button
                onClick={() => handleSubmit()}
                disabled={saving}
                isLoading={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={saving}
                isLoading={saving}
              >
                <Eye className="h-4 w-4 mr-2" />
                Publish Task
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
