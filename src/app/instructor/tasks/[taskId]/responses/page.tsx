'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ArrowLeft,
  ClipboardList,
  User,
  Calendar,
  FileText,
  Download,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Task, TaskResponse } from '@/types/task';
import * as taskService from '@/lib/services/tasks';
import * as userService from '@/lib/services/users';

interface ResponseWithUser extends TaskResponse {
  userName: string;
  userEmail: string;
}

export default function TaskResponsesPage() {
  const params = useParams();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [responses, setResponses] = useState<ResponseWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [taskData, responsesData] = await Promise.all([
        taskService.getTask(taskId),
        taskService.getTaskResponses(taskId),
      ]);

      if (!taskData) {
        return;
      }

      setTask(taskData);

      // Fetch user info for each response
      const responsesWithUsers = await Promise.all(
        responsesData.map(async (response) => {
          try {
            const user = await userService.getUser(response.userId);
            return {
              ...response,
              userName: user?.displayName || 'Unknown User',
              userEmail: user?.email || '',
            };
          } catch {
            return {
              ...response,
              userName: 'Unknown User',
              userEmail: '',
            };
          }
        })
      );

      setResponses(responsesWithUsers);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const toggleExpand = (responseId: string) => {
    setExpandedResponse(expandedResponse === responseId ? null : responseId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ymau-dark-red" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">Task not found</p>
        <Link href="/instructor/tasks">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/instructor/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" size="sm">
              {responses.length} response{responses.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
          <p className="text-gray-500">{task.description}</p>
        </div>
      </div>

      {/* Questions Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-ymau-orange" />
            Questions ({task.questions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            {task.questions
              .sort((a, b) => a.order - b.order)
              .map((q) => (
                <li key={q.id}>{q.text}</li>
              ))}
          </ol>
        </CardContent>
      </Card>

      {/* Responses */}
      {responses.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
          <CardContent className="py-12">
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No Responses Yet"
              description="No one has submitted a response to this task yet."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
          
          {responses.map((response) => (
            <Card key={response.id} className="overflow-hidden">
              <button
                onClick={() => toggleExpand(response.id)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{response.userName}</p>
                    <p className="text-sm text-gray-500">{response.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-gray-500">
                    <p className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(response.submittedAt)}
                    </p>
                    {response.fileUrl && (
                      <p className="flex items-center gap-1 text-ymau-dark-red">
                        <FileText className="h-4 w-4" />
                        Attachment
                      </p>
                    )}
                  </div>
                  {expandedResponse === response.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedResponse === response.id && (
                <div className="border-t border-gray-200 p-5 bg-gray-50 space-y-4">
                  {/* Answers */}
                  {task.questions
                    .sort((a, b) => a.order - b.order)
                    .map((question, index) => {
                      const answer = response.answers.find(
                        (a) => a.questionId === question.id
                      );
                      return (
                        <div key={question.id} className="space-y-1">
                          <p className="text-sm font-medium text-gray-700">
                            {index + 1}. {question.text}
                          </p>
                          <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                            {answer?.answer || <span className="text-gray-400 italic">No answer provided</span>}
                          </p>
                        </div>
                      );
                    })}

                  {/* File Attachment */}
                  {response.fileUrl && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Attached File
                      </p>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {response.fileName || 'Attachment'}
                          </span>
                        </div>
                        <a
                          href={response.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
