'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  MoreVertical,
  GraduationCap,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/components/auth/AuthContext';
import { User, UserRole } from '@/types/user';
import * as userService from '@/lib/services/users';
import { getPlatformStats, PlatformStats } from '@/lib/services/analytics';
import { formatRelativeTime } from '@/lib/utils/formatters';

export default function ManageUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, statsData] = await Promise.all([
        userService.getAllUsers(),
        getPlatformStats(),
      ]);
      setUsers(usersData);
      setFilteredUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter users based on search and role
  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (userId === currentUser.id) {
      alert('You cannot change your own role');
      return;
    }

    setActionLoading(userId);
    try {
      await userService.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (userId === currentUser.id) {
      alert('You cannot deactivate your own account');
      return;
    }

    setActionLoading(userId);
    try {
      await userService.updateUserStatus(userId, isActive);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive } : u))
      );
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-600 mt-1">
            View and manage user roles and permissions
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-600 mt-1">
          View and manage user roles and permissions
        </p>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Students</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.studentCount}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Instructors</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.instructorCount}
                  </p>
                </div>
                <div className="p-3 bg-ymau-orange/20 rounded-full">
                  <BookOpen className="h-6 w-6 text-ymau-orange" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Admins</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.adminCount}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <ShieldCheck className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {filteredUsers.length} users found
              </CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="instructor">Instructors</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found matching your criteria.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  currentUserId={currentUser?.id || ''}
                  isLoading={actionLoading === user.id}
                  onRoleChange={handleRoleChange}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({
  user,
  currentUserId,
  isLoading,
  onRoleChange,
  onStatusChange,
}: {
  user: User;
  currentUserId: string;
  isLoading: boolean;
  onRoleChange: (userId: string, role: UserRole) => void;
  onStatusChange: (userId: string, isActive: boolean) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isCurrentUser = user.id === currentUserId;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Admin
          </span>
        );
      case 'instructor':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-ymau-orange/20 text-ymau-orange">
            <BookOpen className="h-3 w-3 mr-1" />
            Instructor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <GraduationCap className="h-3 w-3 mr-1" />
            Student
          </span>
        );
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border ${
        !user.isActive
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : 'border-gray-200 hover:border-gray-300'
      } transition-colors`}
    >
      <div className="flex items-center space-x-4">
        <Avatar
          src={user.photoURL}
          fallback={user.displayName || user.email}
          size="md"
        />
        <div>
          <div className="flex items-center space-x-2">
            <p className="font-medium text-gray-900">
              {user.displayName || 'No Name'}
            </p>
            {isCurrentUser && (
              <span className="text-xs text-blue-600 font-medium">(You)</span>
            )}
            {!user.isActive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="text-xs text-gray-400 mt-1">
            Joined {formatRelativeTime(user.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {getRoleBadge(user.role)}

        {/* Actions Menu */}
        {!isCurrentUser && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              disabled={isLoading}
              isLoading={isLoading}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="py-1">
                    <p className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      Change Role
                    </p>
                    {user.role !== 'student' && (
                      <button
                        onClick={() => {
                          onRoleChange(user.id, 'student');
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Make Student
                      </button>
                    )}
                    {user.role !== 'instructor' && (
                      <button
                        onClick={() => {
                          onRoleChange(user.id, 'instructor');
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Make Instructor
                      </button>
                    )}
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => {
                          onRoleChange(user.id, 'admin');
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Make Admin
                      </button>
                    )}

                    <div className="border-t border-gray-200 my-1" />

                    <p className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                      Account Status
                    </p>
                    {user.isActive ? (
                      <button
                        onClick={() => {
                          onStatusChange(user.id, false);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Deactivate Account
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onStatusChange(user.id, true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Activate Account
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
