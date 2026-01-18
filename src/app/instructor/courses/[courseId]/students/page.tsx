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
import { formatDate, formatRelativeTime } from '@/lib/utils/formatters';

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
      <div>
        <Link
          href={`/instructor/courses`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Courses
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {course?.title || 'Students'}
        </h1>
        <p className="text-gray-600 mt-1">
          Manage enrolled students and enrollment settings
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{enrollments.length}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {enrollments.filter(e => e.status === 'active').length}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {enrollments.filter(e => e.status === 'completed').length}
                </p>
              </div>
              <Badge variant="success" className="h-8 px-3">Done</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-600">{requests.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Students and Enrollment Codes */}
      <Tabs defaultValue="students" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-2" />
            Students
          </TabsTrigger>
          <TabsTrigger value="codes">
            <Key className="h-4 w-4 mr-2" />
            Enrollment Codes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          {/* Pending Requests */}
          {requests.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-yellow-500" />
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
                      className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={request.user?.photoURL}
                          fallback={request.user?.displayName || request.user?.email}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {request.user?.displayName || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500">{request.user?.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Requested {formatRelativeTime(request.requestedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Enrolled Students ({enrollments.length})
                  </CardTitle>
                  <CardDescription>
                    Students currently enrolled in this course
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
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
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={enrollment.user?.photoURL}
                          fallback={enrollment.user?.displayName || enrollment.user?.email}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {enrollment.user?.displayName || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500">{enrollment.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right text-sm">
                          <p className="text-gray-500">
                            Enrolled {formatRelativeTime(enrollment.enrolledAt)}
                          </p>
                          <p className="text-xs text-gray-400">
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
                        >
                          {enrollment.status}
                        </Badge>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Key className="h-5 w-5 mr-2" />
                    Enrollment Codes
                  </CardTitle>
                  <CardDescription>
                    Create and manage enrollment codes for students to join this course
                  </CardDescription>
                </div>
                <Button onClick={handleCreateCode}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Code
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrollmentCodes.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="mx-auto h-12 w-12 text-gray-400" />
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
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        code.isActive ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="font-mono text-lg font-bold tracking-wider text-indigo-600">
                          {code.code}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(code.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right text-sm">
                          <p className="text-gray-500">
                            Used {code.useCount}{code.maxUses ? ` / ${code.maxUses}` : ''} times
                          </p>
                          <p className="text-xs text-gray-400">
                            Created {formatRelativeTime(code.createdAt)}
                          </p>
                        </div>
                        <Badge variant={code.isActive ? 'success' : 'default'}>
                          {code.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <div className="flex space-x-1">
                          {code.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateCode(code.id)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCode(code.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg mx-4">
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

          <div className="flex space-x-2">
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-60 overflow-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={user.photoURL}
                      fallback={user.displayName || user.email}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddStudent(user.id)}
                    disabled={adding === user.id}
                    isLoading={adding === user.id}
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
