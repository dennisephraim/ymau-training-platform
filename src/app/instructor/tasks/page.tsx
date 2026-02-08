'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Plus,
  ClipboardList,
  Calendar,
  Users,
  FileText,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Task } from '@/types/task';
import * as taskService from '@/lib/services/tasks';

export default function InstructorTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Use getInstructorTasks to get tasks where user is creator or co-instructor
      // Admins see all tasks
      const data = user.role === 'admin'
        ? await taskService.getAllTasks()
        : await taskService.getInstructorTasks(user.id);
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      await taskService.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return dueDate < new Date();
  };

  // Stats
  const publishedTasks = tasks.filter((t) => t.isPublished);
  const draftTasks = tasks.filter((t) => !t.isPublished);
  const overdueTasks = tasks.filter((t) => t.isPublished && isOverdue(t.dueDate));

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-72 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded-lg w-full sm:w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">
            Create and manage tasks for delegates
          </p>
        </div>
        <Link href="/instructor/tasks/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Create Task
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-100 shrink-0">
                <CheckCircle className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900">{publishedTasks.length}</p>
                <p className="text-sm text-gray-500">Published Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gray-100 shrink-0">
                <Clock className="h-6 w-6 text-gray-600" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900">{draftTasks.length}</p>
                <p className="text-sm text-gray-500">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100 shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900">{overdueTasks.length}</p>
                <p className="text-sm text-gray-500">Past Due Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card className="border-dashed border-2 border-ymau-dark-red/30 bg-ymau-dark-red/5">
          <CardContent className="py-12">
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title="No Tasks Yet"
              description="Create your first task to assign questions and collect responses from delegates."
              action={
                <Link href="/instructor/tasks/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Create Task
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:border-ymau-dark-red/30 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {task.isPublished ? (
                        <Badge variant="success" size="sm">Published</Badge>
                      ) : (
                        <Badge variant="info" size="sm">Draft</Badge>
                      )}
                      {task.dueDate && isOverdue(task.dueDate) && task.isPublished && (
                        <Badge variant="warning" size="sm">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          Past Due
                        </Badge>
                      )}
                      {task.allowsFileUpload && (
                        <Badge variant="info" size="sm">File Upload</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {task.description || 'No description'}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {task.questions.length} question{task.questions.length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {task.assignedRoles.join(', ')}
                      </span>
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-red-600' : ''}`}>
                          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/instructor/tasks/${task.id}/responses`}>
                      <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                        <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                        Responses
                      </Button>
                      <Button variant="ghost" size="icon" className="sm:hidden" aria-label="View responses">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                    <Link href={`/instructor/tasks/${task.id}`}>
                      <Button variant="ghost" size="icon" aria-label="Edit task">
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(task.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
