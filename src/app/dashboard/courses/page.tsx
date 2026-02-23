'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  BookOpen,
  Clock,
  Video,
  Play,
  CheckCircle,
  Plus,
  GraduationCap,
  ClipboardList,
  AlertCircle,
  Calendar,
  FileText,
  Upload,
  Key,
  ArrowRight,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Enrollment } from '@/types/enrollment';
import { Course } from '@/types/course';
import { CourseProgress } from '@/types/progress';
import { TaskWithStatus } from '@/types/task';
import * as enrollmentService from '@/lib/services/enrollments';
import * as courseService from '@/lib/services/courses';
import * as progressService from '@/lib/services/progress';
import * as taskService from '@/lib/services/tasks';
import * as committeeCodeService from '@/lib/services/committeeCodes';
import { formatDuration } from '@/lib/utils/formatters';

interface EnrolledCourse extends Enrollment {
  course: Course | null;
  progress: CourseProgress | null;
}

export default function MyActivitiesPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Join code modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState(false);

  // Committee join code modal state
  const [showCommitteeJoinModal, setShowCommitteeJoinModal] = useState(false);
  const [committeeJoinCode, setCommitteeJoinCode] = useState('');
  const [committeeCodeLoading, setCommitteeCodeLoading] = useState(false);
  const [committeeCodeError, setCommitteeCodeError] = useState<string | null>(null);
  const [committeeCodeSuccess, setCommitteeCodeSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch enrollments and tasks in parallel
      const [userEnrollments, userTasks] = await Promise.all([
        enrollmentService.getUserEnrollments(user.id),
        taskService.getTasksWithStatus(user.id, user.role),
      ]);

      // Fetch course details and progress for each enrollment
      const enrichedEnrollments = await Promise.all(
        userEnrollments.map(async (enrollment) => {
          const [course, progress] = await Promise.all([
            courseService.getCourse(enrollment.courseId),
            progressService.getCourseProgress(enrollment.id, enrollment.courseId),
          ]);
          return { ...enrollment, course, progress };
        })
      );

      // Filter out enrollments where the course no longer exists (orphaned enrollments)
      const validEnrollments = enrichedEnrollments.filter(e => e.course !== null);

      setEnrollments(validEnrollments);
      setTasks(userTasks);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle join code submission
  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;

    setCodeLoading(true);
    setCodeError(null);

    try {
      const result = await enrollmentService.enrollWithCode(joinCode.trim().toUpperCase(), user.id);
      
      if (result.success) {
        setCodeSuccess(true);
        setTimeout(() => {
          setShowJoinModal(false);
          setJoinCode('');
          setCodeSuccess(false);
          fetchData(); // Refresh the list
        }, 1500);
      } else {
        setCodeError(result.error || 'Failed to enroll');
      }
    } catch {
      setCodeError('An error occurred. Please try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  const resetJoinModal = () => {
    setShowJoinModal(false);
    setJoinCode('');
    setCodeError(null);
    setCodeSuccess(false);
  };

  // Handle committee join code submission
  const handleCommitteeJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !committeeJoinCode.trim()) return;

    setCommitteeCodeLoading(true);
    setCommitteeCodeError(null);

    try {
      const result = await committeeCodeService.joinCommitteeWithCode(
        committeeJoinCode.trim().toUpperCase(),
        user.id
      );

      if (result.success) {
        setCommitteeCodeSuccess(result.committeeName || 'the committee');
        setTimeout(() => {
          resetCommitteeJoinModal();
        }, 1500);
      } else {
        setCommitteeCodeError(result.error || 'Failed to join committee');
      }
    } catch {
      setCommitteeCodeError('An error occurred. Please try again.');
    } finally {
      setCommitteeCodeLoading(false);
    }
  };

  const resetCommitteeJoinModal = () => {
    setShowCommitteeJoinModal(false);
    setCommitteeJoinCode('');
    setCommitteeCodeError(null);
    setCommitteeCodeSuccess(null);
  };

  // Separate completed and in-progress courses
  const completedCourses = enrollments.filter(e => e.status === 'completed');
  const inProgressCourses = enrollments.filter(e => e.status !== 'completed');

  // Separate pending and submitted tasks
  const pendingTasks = tasks.filter(t => !t.isSubmitted);
  const submittedTasks = tasks.filter(t => t.isSubmitted);
  const overdueTasks = pendingTasks.filter(t => t.isOverdue);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-72 animate-pulse"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasContent = enrollments.length > 0 || tasks.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Join Course Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={resetJoinModal}
        title="Join Course"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Enter the enrollment code from your instructor to join a course.
          </p>
          
          {codeSuccess ? (
            <div className="flex items-center justify-center gap-2 py-8 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium text-lg">Success! Loading course...</span>
            </div>
          ) : (
            <form onSubmit={handleJoinCode} className="space-y-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setCodeError(null);
                  }}
                  placeholder="ENTER CODE"
                  className="pl-10 font-mono text-center tracking-widest uppercase text-lg"
                  maxLength={10}
                  autoFocus
                />
              </div>
              
              {codeError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {codeError}
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetJoinModal}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={codeLoading} disabled={!joinCode.trim()}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Join Course
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Join Committee Modal */}
      <Modal
        isOpen={showCommitteeJoinModal}
        onClose={resetCommitteeJoinModal}
        title="Join Committee"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Enter the committee code from your instructor to join a committee.
          </p>

          {committeeCodeSuccess ? (
            <div className="flex items-center justify-center gap-2 py-8 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium text-lg">Joined {committeeCodeSuccess}!</span>
            </div>
          ) : (
            <form onSubmit={handleCommitteeJoinCode} className="space-y-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <UsersRound className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  value={committeeJoinCode}
                  onChange={(e) => {
                    setCommitteeJoinCode(e.target.value.toUpperCase());
                    setCommitteeCodeError(null);
                  }}
                  placeholder="ENTER CODE"
                  className="pl-10 font-mono text-center tracking-widest uppercase text-lg"
                  maxLength={10}
                  autoFocus
                />
              </div>

              {committeeCodeError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {committeeCodeError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetCommitteeJoinModal}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={committeeCodeLoading} disabled={!committeeJoinCode.trim()}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Join Committee
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Activities</h1>
          <p className="text-gray-500 mt-1">
            {hasContent 
              ? `${enrollments.length} course${enrollments.length !== 1 ? 's' : ''} • ${tasks.length} task${tasks.length !== 1 ? 's' : ''}${overdueTasks.length > 0 ? ` • ${overdueTasks.length} overdue` : ''}`
              : 'View your enrolled courses and assigned tasks'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCommitteeJoinModal(true)}>
            <UsersRound className="h-4 w-4 mr-2" />
            Join Committee
          </Button>
          <Button onClick={() => setShowJoinModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Join Course
          </Button>
        </div>
      </div>

      {!hasContent ? (
        <Card className="border-dashed border-2 border-ymau-dark-red/30 bg-ymau-dark-red/5">
          <CardContent className="py-12">
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="Nothing Here Yet"
              description="You haven't enrolled in any courses and don't have any assigned tasks yet. Enter an enrollment code from your instructor to get started."
              action={
                <Button onClick={() => setShowJoinModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Join Course
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {/* Tasks Section */}
          {tasks.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-ymau-orange/10">
                  <ClipboardList className="h-5 w-5 text-ymau-orange" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
                  <p className="text-sm text-gray-500">
                    {pendingTasks.length} pending • {submittedTasks.length} submitted
                  </p>
                </div>
              </div>

              {/* Overdue Warning */}
              {overdueTasks.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">
                    You have {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''} that need{overdueTasks.length === 1 ? 's' : ''} your attention.
                  </p>
                </div>
              )}

              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    Pending
                    <Badge variant="warning" size="sm">{pendingTasks.length}</Badge>
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pendingTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted Tasks */}
              {submittedTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    Submitted
                    <Badge variant="success" size="sm">{submittedTasks.length}</Badge>
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {submittedTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Courses Section */}
          {enrollments.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-ymau-dark-red/10">
                  <BookOpen className="h-5 w-5 text-ymau-dark-red" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Courses</h2>
                  <p className="text-sm text-gray-500">
                    {inProgressCourses.length} in progress • {completedCourses.length} completed
                  </p>
                </div>
              </div>

              {/* In Progress Courses */}
              {inProgressCourses.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Play className="h-4 w-4 text-ymau-dark-red" />
                    In Progress
                    <Badge variant="info" size="sm">{inProgressCourses.length}</Badge>
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {inProgressCourses.map((enrollment) => (
                      <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Courses */}
              {completedCourses.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-emerald-500" />
                    Completed
                    <Badge variant="success" size="sm">{completedCourses.length}</Badge>
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {completedCourses.map((enrollment) => (
                      <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: TaskWithStatus }) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Link 
      href={`/dashboard/tasks/${task.id}`}
      className="group block"
    >
      <div className={`bg-white rounded-xl border overflow-hidden transition-all duration-300 ${
        task.isOverdue 
          ? 'border-red-300 hover:border-red-400 hover:shadow-lg hover:shadow-red-100' 
          : task.isSubmitted
          ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100'
          : 'border-gray-200 hover:border-ymau-orange/30 hover:shadow-lg hover:shadow-ymau-orange/10'
      }`}>
        {/* Task Header with gradient */}
        <div className={`h-2 ${
          task.isOverdue 
            ? 'bg-gradient-to-r from-red-400 to-red-500' 
            : task.isSubmitted
            ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
            : 'bg-gradient-to-r from-ymau-orange to-amber-500'
        }`} />
        
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {task.isSubmitted ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="h-3 w-3" />
                    Submitted
                  </Badge>
                ) : task.isOverdue ? (
                  <Badge variant="error" size="sm">
                    <AlertCircle className="h-3 w-3" />
                    Overdue
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">Pending</Badge>
                )}
                {task.allowsFileUpload && (
                  <Badge variant="default" size="sm">
                    <Upload className="h-3 w-3" />
                    File
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-ymau-orange transition-colors truncate">
                {task.title}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                {task.description || 'No description'}
              </p>
            </div>
            <div className={`p-2 rounded-lg shrink-0 ml-3 ${
              task.isSubmitted ? 'bg-emerald-100' : task.isOverdue ? 'bg-red-100' : 'bg-ymau-orange/10'
            }`}>
              <ClipboardList className={`h-5 w-5 ${
                task.isSubmitted ? 'text-emerald-600' : task.isOverdue ? 'text-red-600' : 'text-ymau-orange'
              }`} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              <span>{task.questions.length} question{task.questions.length !== 1 ? 's' : ''}</span>
            </div>
            {task.dueDate && (
              <div className={`flex items-center gap-1.5 ${task.isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar className="h-4 w-4" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
            )}
          </div>

          {/* Action */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {task.isSubmitted 
                ? 'View your submission' 
                : task.isOverdue 
                ? 'Submit as soon as possible'
                : 'Complete this task'
              }
            </span>
            <span className={`text-sm font-medium flex items-center gap-1 ${
              task.isSubmitted ? 'text-emerald-600' : task.isOverdue ? 'text-red-600' : 'text-ymau-orange'
            }`}>
              <Play className="h-3 w-3" />
              {task.isSubmitted ? 'View' : 'Start'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EnrolledCourseCard({ enrollment }: { enrollment: EnrolledCourse }) {
  const { course, progress } = enrollment;

  if (!course) {
    return null;
  }

  const isCompleted = enrollment.status === 'completed';
  const progressPercentage = progress?.componentPercentage || 0;
  const completedChapters = progress?.completedChapters || 0;
  const totalChapters = progress?.totalChapters || course.chapterCount;

  return (
    <Link 
      href={`/dashboard/courses/${enrollment.id}`}
      className="group block"
    >
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-ymau-dark-red/30 hover:shadow-lg hover:shadow-ymau-dark-red/10 transition-all duration-300">
        {/* Course Header with gradient */}
        <div className={`h-2 ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-ymau-dark-red to-ymau-orange'}`} />
        
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isCompleted ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="h-3 w-3" />
                    Completed
                  </Badge>
                ) : (
                  <Badge variant="info" size="sm">In Progress</Badge>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-ymau-dark-red transition-colors truncate">
                {course.title}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                {course.description || 'No description'}
              </p>
            </div>
            <CircularProgress 
              value={progressPercentage} 
              size="md"
              strokeWidth={4}
              className="shrink-0 ml-3"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1.5">
              <Video className="h-4 w-4" />
              <span>{completedChapters}/{totalChapters} chapters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(course.totalDurationSeconds)}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Progress</span>
              <span className="font-medium text-gray-700">{progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercentage} size="md" />
          </div>

          {/* Action */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {isCompleted ? 'View certificate' : 'Continue where you left off'}
            </span>
            <span className="text-sm font-medium text-ymau-dark-red group-hover:text-ymau-dark-red/80 flex items-center gap-1">
              <Play className="h-3 w-3" />
              {isCompleted ? 'Review' : 'Continue'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
