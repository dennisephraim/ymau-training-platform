'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  ArrowLeft,
  ClipboardList,
  Calendar,
  FileText,
  Download,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Filter,
} from 'lucide-react';
import { Task, TaskResponse } from '@/types/task';
import { Committee } from '@/types/committee';
import * as taskService from '@/lib/services/tasks';
import * as userService from '@/lib/services/users';
import * as committeeService from '@/lib/services/committees';
import { useBulkDownload } from '@/lib/hooks/useBulkDownload';
import { FileToDownload } from '@/lib/utils/bulkDownload';

interface ResponseWithUser extends TaskResponse {
  userName: string;
  userEmail: string;
  committeeId: string | null;
  committeeName: string;
}

export default function TaskResponsesPage() {
  const params = useParams();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [responses, setResponses] = useState<ResponseWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Committee filter state
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [committeeFilterId, setCommitteeFilterId] = useState<string>('');

  const { downloadState, startDownload, cancelDownload, resetState } = useBulkDownload();

  // Apply committee filter to responses
  const filteredResponses = useMemo(() => {
    if (!committeeFilterId) return responses;
    return responses.filter((r) => r.committeeId === committeeFilterId);
  }, [responses, committeeFilterId]);

  // Filter responses that have file attachments (uses filtered responses)
  const responsesWithFiles = useMemo(() => {
    return filteredResponses.filter(r => r.fileUrl && r.fileName);
  }, [filteredResponses]);

  // Build files array for bulk download
  const filesToDownload: FileToDownload[] = useMemo(() => {
    return responsesWithFiles.map(r => ({
      url: r.fileUrl!,
      fileName: r.fileName!,
      studentName: r.userName,
    }));
  }, [responsesWithFiles]);

  const handleBulkDownload = async () => {
    if (!task || filesToDownload.length === 0) return;
    setShowDownloadModal(true);
    await startDownload(filesToDownload, task.title);
  };

  const handleCloseModal = () => {
    if (downloadState.state === 'fetching' || downloadState.state === 'zipping') {
      cancelDownload();
    }
    setShowDownloadModal(false);
    resetState();
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [taskData, responsesData, committeesData] = await Promise.all([
        taskService.getTask(taskId),
        taskService.getTaskResponses(taskId),
        committeeService.getAllCommittees(),
      ]);

      if (!taskData) {
        return;
      }

      setTask(taskData);
      setCommittees(committeesData);

      // Build committee lookup
      const committeeMap = new Map(committeesData.map((c) => [c.id, c.name]));

      // Fetch user info for each response
      const responsesWithUsers = await Promise.all(
        responsesData.map(async (response) => {
          try {
            const user = await userService.getUser(response.userId);
            return {
              ...response,
              userName: user?.displayName || 'Unknown User',
              userEmail: user?.email || '',
              committeeId: user?.committeeId || null,
              committeeName: user?.committeeId
                ? committeeMap.get(user.committeeId) || 'Unknown'
                : 'No committee',
            };
          } catch {
            return {
              ...response,
              userName: 'Unknown User',
              userEmail: '',
              committeeId: null,
              committeeName: 'No committee',
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
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
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
              {committeeFilterId
                ? `${filteredResponses.length} of ${responses.length} response${responses.length !== 1 ? 's' : ''}`
                : `${responses.length} response${responses.length !== 1 ? 's' : ''}`
              }
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
          <p className="text-gray-500">{task.description}</p>
        </div>
        {responsesWithFiles.length > 0 && (
          <Button
            variant="outline"
            onClick={handleBulkDownload}
            disabled={downloadState.state === 'fetching' || downloadState.state === 'zipping'}
          >
            <Download className="h-4 w-4 mr-2" />
            {committeeFilterId
              ? `Download Filtered (${responsesWithFiles.length})`
              : `Download All (${responsesWithFiles.length})`
            }
          </Button>
        )}
      </div>

      {/* Committee Filter */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <Filter className="h-4 w-4 text-gray-500" />
        <label className="text-sm font-medium text-gray-700">Committee:</label>
        <select
          value={committeeFilterId}
          onChange={(e) => setCommitteeFilterId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-ymau-dark-red focus:outline-none focus:ring-1 focus:ring-ymau-dark-red"
        >
          <option value="">All Submissions</option>
          {committees.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {committees.length === 0 && (
          <Link
            href="/instructor/committees"
            className="text-xs text-gray-400 hover:text-ymau-dark-red transition-colors"
          >
            No committees yet &mdash; manage committees
          </Link>
        )}
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
      {filteredResponses.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
          <CardContent className="py-12">
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title={committeeFilterId ? "No Matching Responses" : "No Responses Yet"}
              description={committeeFilterId
                ? "No submissions from this committee."
                : "No one has submitted a response to this task yet."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>

          {filteredResponses.map((response) => (
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
                    <p className={`text-xs mt-0.5 ${response.committeeId ? 'text-gray-400' : 'text-gray-400 italic'}`}>
                      {response.committeeName}
                    </p>
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

      {/* Bulk Download Progress Modal */}
      <Modal
        isOpen={showDownloadModal}
        onClose={handleCloseModal}
        title="Downloading Attachments"
        size="sm"
        closeOnOverlayClick={false}
        closeOnEscape={downloadState.state === 'complete' || downloadState.state === 'error' || downloadState.state === 'cancelled'}
      >
        <div className="space-y-4">
          {(downloadState.state === 'fetching' || downloadState.state === 'zipping') && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    {downloadState.state === 'zipping'
                      ? 'Creating ZIP file...'
                      : `Downloading file ${downloadState.currentFile} of ${downloadState.totalFiles}`}
                  </span>
                  <span>
                    {Math.round((downloadState.currentFile / downloadState.totalFiles) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ymau-dark-red transition-all duration-300"
                    style={{
                      width: `${(downloadState.currentFile / downloadState.totalFiles) * 100}%`,
                    }}
                  />
                </div>
                {downloadState.currentFileName && downloadState.state === 'fetching' && (
                  <p className="text-xs text-gray-500 truncate">
                    {downloadState.currentFileName}
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={cancelDownload}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          )}

          {downloadState.state === 'complete' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-emerald-600">
                <CheckCircle className="h-6 w-6" />
                <span className="font-medium">Download complete</span>
              </div>
              {downloadState.failedFiles.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        {downloadState.failedFiles.length} file{downloadState.failedFiles.length !== 1 ? 's' : ''} failed to download
                      </p>
                      <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                        {downloadState.failedFiles.map((file, i) => (
                          <li key={i} className="truncate">{file}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-amber-600">
                        You can download these files individually.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleCloseModal}>Close</Button>
              </div>
            </div>
          )}

          {downloadState.state === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <span className="font-medium">Download failed</span>
              </div>
              {downloadState.failedFiles.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    Could not download any files. Please try again later.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseModal}>
                  Close
                </Button>
                <Button onClick={handleBulkDownload}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {downloadState.state === 'cancelled' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <X className="h-6 w-6" />
                <span className="font-medium">Download cancelled</span>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCloseModal}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
