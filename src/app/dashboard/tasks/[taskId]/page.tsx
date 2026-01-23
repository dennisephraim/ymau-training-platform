'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import {
  ArrowLeft,
  ClipboardList,
  Calendar,
  AlertCircle,
  CheckCircle,
  Upload,
  FileText,
  X,
  Loader2,
  Send,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Task, TaskResponse, TaskResponseAnswer } from '@/types/task';
import * as taskService from '@/lib/services/tasks';
import * as storageService from '@/lib/services/storage';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const taskId = params.taskId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [existingResponse, setExistingResponse] = useState<TaskResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskData = useCallback(async () => {
    if (!user || !taskId) return;

    try {
      setLoading(true);
      const [taskData, responseData] = await Promise.all([
        taskService.getTask(taskId),
        taskService.getUserTaskResponse(taskId, user.id),
      ]);

      if (!taskData) {
        setError('Task not found');
        return;
      }

      setTask(taskData);
      setExistingResponse(responseData);

      // Pre-fill answers if there's an existing response
      if (responseData) {
        const answersMap: Record<string, string> = {};
        responseData.answers.forEach((a) => {
          answersMap[a.questionId] = a.answer;
        });
        setAnswers(answersMap);
      } else {
        // Initialize empty answers
        const emptyAnswers: Record<string, string> = {};
        taskData.questions.forEach((q) => {
          emptyAnswers[q.id] = '';
        });
        setAnswers(emptyAnswers);
      }
    } catch (err) {
      console.error('Error fetching task:', err);
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [user, taskId]);

  useEffect(() => {
    fetchTaskData();
  }, [fetchTaskData]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (50MB max)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File must be less than 50MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!user || !task) return;

    try {
      setSubmitting(true);
      setError(null);

      let fileUrl: string | null = existingResponse?.fileUrl || null;
      let fileName: string | null = existingResponse?.fileName || null;

      // Upload file if selected
      if (file) {
        fileUrl = await storageService.uploadTaskResponseFile(
          taskId,
          user.id,
          file,
          (progress) => {
            setUploadProgress(progress.progress);
          }
        );
        fileName = file.name;
      }

      // Format answers
      const formattedAnswers: TaskResponseAnswer[] = task.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));

      // Submit response
      await taskService.submitTaskResponse(
        taskId,
        user.id,
        formattedAnswers,
        fileUrl,
        fileName
      );

      // Redirect back to activities page
      router.push('/dashboard/courses');
    } catch (err) {
      console.error('Error submitting response:', err);
      setError('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/dashboard/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    );
  }

  if (!task) return null;

  const isOverdue = task.dueDate && task.dueDate < new Date() && !existingResponse;
  const isSubmitted = !!existingResponse;
  
  // Check if all required questions are answered based on response type
  const allQuestionsAnswered = task.questions.every((q) => {
    const responseType = q.responseType || 'text'; // Default to text for backwards compatibility
    if (responseType === 'file') {
      // File-only questions are satisfied by file upload OR existing file
      return file !== null || existingResponse?.fileUrl;
    } else if (responseType === 'either') {
      // Either means text OR file is acceptable
      return answers[q.id]?.trim() || file !== null || existingResponse?.fileUrl;
    }
    // Text questions require text answer
    return answers[q.id]?.trim();
  });
  
  // Check if any question requires file upload
  const hasFileRequiredQuestion = task.questions.some(
    (q) => (q.responseType || 'text') === 'file'
  );
  
  // Check if file is needed but not provided
  const needsFileUpload = hasFileRequiredQuestion && !file && !existingResponse?.fileUrl;
  
  // Get appropriate status message
  const getStatusMessage = () => {
    if (isSubmitted) return 'You can update your submission at any time.';
    if (allQuestionsAnswered) return 'Ready to submit!';
    if (needsFileUpload) return 'Please upload a file to complete this task.';
    return 'Please complete all required responses.';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/courses">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isSubmitted ? (
              <Badge variant="success">
                <CheckCircle className="h-3 w-3" />
                Submitted
              </Badge>
            ) : isOverdue ? (
              <Badge variant="warning">
                <AlertCircle className="h-3 w-3" />
                Overdue
              </Badge>
            ) : (
              <Badge variant="warning">Pending</Badge>
            )}
            {task.allowsFileUpload && (
              <Badge variant="info">
                <Upload className="h-3 w-3" />
                File Upload
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
          <p className="text-gray-500 mt-1">{task.description}</p>
        </div>
      </div>

      {/* Task Info */}
      <div className="flex flex-wrap gap-4 text-sm">
        {task.dueDate && (
          <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
            <Calendar className="h-4 w-4" />
            <span>Due: {formatDate(task.dueDate)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-600">
          <FileText className="h-4 w-4" />
          <span>{task.questions.length} question{task.questions.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="h-4 w-4" />
          <span>Assigned to: {task.assignedRoles.join(', ')}</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-ymau-orange" />
            Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {task.questions
            .sort((a, b) => a.order - b.order)
            .map((question, index) => {
              const responseType = question.responseType || 'text';
              return (
                <div key={question.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {index + 1}. {question.text}
                    </label>
                    {responseType === 'file' && (
                      <Badge variant="info" size="sm">
                        <Upload className="h-3 w-3" />
                        File Required
                      </Badge>
                    )}
                    {responseType === 'either' && (
                      <Badge variant="default" size="sm">
                        Text or File
                      </Badge>
                    )}
                  </div>
                  {responseType !== 'file' && (
                    <textarea
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder={responseType === 'either' ? 'Enter your answer or upload a file below...' : 'Enter your answer...'}
                      rows={3}
                      disabled={submitting}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  )}
                  {responseType === 'file' && (
                    <p className="text-sm text-gray-500 italic">
                      Please upload a file below to answer this question.
                    </p>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* File Upload */}
      {(task.allowsFileUpload || hasFileRequiredQuestion) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-ymau-orange" />
              File Attachment
              {hasFileRequiredQuestion ? (
                <Badge variant="warning" size="sm">Required</Badge>
              ) : (
                <span className="text-sm font-normal text-gray-500">(Optional)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Existing file from previous submission */}
            {existingResponse?.fileUrl && !file && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {existingResponse.fileName || 'Previous submission'}
                    </p>
                    <p className="text-xs text-gray-500">Previously uploaded file</p>
                  </div>
                </div>
                <a
                  href={existingResponse.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ymau-dark-red hover:underline"
                >
                  View
                </a>
              </div>
            )}

            {/* New file selection */}
            {file ? (
              <div className="p-3 bg-ymau-orange/5 border border-ymau-orange/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-ymau-orange" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  disabled={submitting}
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => !submitting && fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-ymau-orange/50 cursor-pointer transition-colors"
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload a file
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Max file size: 50MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              disabled={submitting}
            />

            {/* Upload Progress */}
            {submitting && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Uploading file...</span>
                  <span className="text-gray-900 font-medium">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} size="sm" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          {getStatusMessage()}
        </p>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !allQuestionsAnswered}
          isLoading={submitting}
        >
          {submitting ? (
            'Submitting...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitted ? 'Update Submission' : 'Submit Response'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
