'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, UserPlus, Check, X, Clock, Search, Copy, Plus, Trash2, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useAuth } from '@/components/auth/AuthContext';
import { Enrollment, EnrollmentRequest, EnrollmentCode } from '@/types/enrollment';
import { User } from '@/types/user';
import { Course } from '@/types/course';
import * as enrollmentService from '@/lib/services/enrollments';
import * as enrollmentCodeService from '@/lib/services/enrollmentCodes';
import * as courseService from '@/lib/services/courses';
import * as userService from '@/lib/services/users';
import { formatRelativeTime } from '@/lib/utils/formatters';

export default function StudentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<(Enrollment & { user?: User })[]>([]);
  const [requests, setRequests] = useState<(EnrollmentRequest & { user?: User })[]>([]);
  const [enrollmentCodes, setEnrollmentCodes] = useState<EnrollmentCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('students');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch course details
      const courseData = await courseService.getCourse(courseId);
      setCourse(courseData);

      // Fetch enrollments
      const enrollmentsData = await enrollmentService.getCourseEnrollments(courseId);

      // Fetch pending requests
      const requestsData = await enrollmentService.getCourseRequests(courseId);

      // Fetch enrollment codes
      const codesData = await enrollmentCodeService.getEnrollmentCodes(courseId);
      setEnrollmentCodes(codesData);

      // Get all user IDs
      const userIds = new Set<string>();
      enrollmentsData.forEach((e) => userIds.add(e.studentId));
      requestsData.forEach((r) => userIds.add(r.studentId));

      // Fetch user details
      const users = await userService.getUsersByIds(Array.from(userIds));

      // Enrich enrollments with user data
      const enrichedEnrollments = enrollmentsData.map((enrollment) => ({
        ...enrollment,
        user: users.get(enrollment.studentId),
      }));

      // Enrich requests with user data
      const enrichedRequests = requestsData.map((request) => ({
        ...request,
        user: users.get(request.studentId),
      }));

      setEnrollments(enrichedEnrollments);
      setRequests(enrichedRequests);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    try {
      await enrollmentService.approveRequest(requestId, user.id);
      fetchData();
    } catch (err) {
      console.error('Error approving request:', err);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    const reason = prompt('Rejection reason (optional):');
    try {
      await enrollmentService.rejectRequest(requestId, user.id, reason || undefined);
      fetchData();
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const handleCreateCode = async () => {
    if (!user) return;
    try {
      await enrollmentCodeService.createEnrollmentCode(courseId, user.id);
      fetchData();
    } catch (err) {
      console.error('Error creating code:', err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleDeactivateCode = async (codeId: string) => {
    try {
      await enrollmentCodeService.deactivateEnrollmentCode(codeId);
      fetchData();
    } catch (err) {
      console.error('Error deactivating code:', err);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this enrollment code?')) return;
    try {
      await enrollmentCodeService.deleteEnrollmentCode(codeId);
      fetchData();
    } catch (err) {
      console.error('Error deleting code:', err);
    }
  };

  const handleRemoveStudent = async (enrollment: Enrollment & { user?: User }) => {
    const studentName = enrollment.user?.displayName || enrollment.user?.email || 'this student';
    if (!confirm(`Are you sure you want to remove ${studentName} from this course? This will delete all their progress, quiz attempts, and certificate (if any). This action cannot be undone.`)) {
      return;
    }
    try {
      await enrollmentService.removeStudentFromCourse(enrollment.id, courseId, enrollment.studentId);
      fetchData();
    } catch (err) {
      console.error('Error removing student:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-48 mt-2 animate-pulse"></div>
        </div>
        <Card className="animate-pulse">
          <CardContent className="py-8">
            <div className="h-40 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/instructor/courses" title="Back to Courses">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" aria-label="Back to Courses">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {course?.title || 'Students'}
          </h1>
          <p className="text-gray-600 mt-1">
            Manage enrolled students and enrollment settings
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-500 truncate">Total Students</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{enrollments.length}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-ymau-dark-red shrink-0" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-500 truncate">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {enrollments.filter(e => e.status === 'active').length}
                </p>
              </div>
              <Check className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 shrink-0" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-500 truncate">Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {enrollments.filter(e => e.status === 'completed').length}
                </p>
              </div>
              <Badge variant="success" className="h-6 sm:h-8 px-2 sm:px-3 shrink-0">Done</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-500 truncate">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{requests.length}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 shrink-0" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Students and Enrollment Codes */}
      <Tabs defaultValue="students" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="students">
            <Users className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Students</span>
          </TabsTrigger>
          <TabsTrigger value="codes">
            <Key className="h-4 w-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Enrollment Codes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          {/* Pending Requests */}
          {requests.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-yellow-500" aria-hidden="true" />
                      Pending Requests ({requests.length})
                    </CardTitle>
                    <CardDescription>
                      Students waiting for enrollment approval
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={request.user?.photoURL}
                          fallback={request.user?.displayName || request.user?.email}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {request.user?.displayName || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{request.user?.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Requested {formatRelativeTime(request.requestedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                        >
                          <Check className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                          <span className="sm:inline">Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50 flex-1 sm:flex-none"
                        >
                          <X className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                          <span className="sm:inline">Reject</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enrolled Students */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" aria-hidden="true" />
                    Enrolled Students ({enrollments.length})
                  </CardTitle>
                  <CardDescription>
                    Students currently enrolled in this course
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Students Yet</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Add students directly or share enrollment codes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={enrollment.user?.photoURL}
                          fallback={enrollment.user?.displayName || enrollment.user?.email}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {enrollment.user?.displayName || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{enrollment.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <div className="text-left sm:text-right text-sm min-w-0">
                          <p className="text-gray-500 truncate">
                            Enrolled {formatRelativeTime(enrollment.enrolledAt)}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            via {enrollment.enrollmentMethod}
                          </p>
                        </div>
                        <Badge
                          variant={
                            enrollment.status === 'completed'
                              ? 'success'
                              : enrollment.status === 'active'
                              ? 'default'
                              : 'warning'
                          }
                          className="shrink-0"
                        >
                          {enrollment.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStudent(enrollment)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                          aria-label="Remove student"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Key className="h-5 w-5 mr-2" aria-hidden="true" />
                    Enrollment Codes
                  </CardTitle>
                  <CardDescription>
                    Create and manage enrollment codes for students to join this course
                  </CardDescription>
                </div>
                <Button onClick={handleCreateCode} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Create Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrollmentCodes.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Enrollment Codes</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Create a code to allow students to self-enroll in this course.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollmentCodes.map((code) => (
                    <div
                      key={code.id}
                      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border ${
                        code.isActive ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="font-mono text-lg font-bold tracking-wider text-ymau-dark-red">
                          {code.code}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyCode(code.code)}
                          aria-label="Copy code"
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <div className="text-left sm:text-right text-sm min-w-0">
                          <p className="text-gray-500">
                            Used {code.useCount}{code.maxUses ? ` / ${code.maxUses}` : ''} times
                          </p>
                          <p className="text-xs text-gray-400">
                            Created {formatRelativeTime(code.createdAt)}
                          </p>
                        </div>
                        <Badge variant={code.isActive ? 'success' : 'default'} className="shrink-0">
                          {code.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <div className="flex gap-1 shrink-0">
                          {code.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeactivateCode(code.id)}
                              className="text-gray-500 hover:text-gray-700"
                              aria-label="Deactivate code"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCode(code.id)}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Delete code"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          courseId={courseId}
          enrolledBy={user?.id || ''}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function AddStudentModal({
  courseId,
  enrolledBy,
  onClose,
  onAdded,
}: {
  courseId: string;
  enrolledBy: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const results = await userService.searchUsersByEmail(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleAddStudent = async (studentId: string) => {
    setAdding(studentId);
    setError(null);

    try {
      await enrollmentService.createDirectEnrollment(courseId, studentId, enrolledBy);
      onAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to add student');
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg">
        <CardHeader>
          <CardTitle>Add Student</CardTitle>
          <CardDescription>
            Search for a user by email to directly enroll them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching} aria-label="Search">
              <Search className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-60 overflow-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={user.photoURL}
                      fallback={user.displayName || user.email}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddStudent(user.id)}
                    disabled={adding === user.id}
                    isLoading={adding === user.id}
                    className="shrink-0"
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="text-sm text-gray-500 text-center py-4">
              No users found. They must sign in first before they can be enrolled.
            </p>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
