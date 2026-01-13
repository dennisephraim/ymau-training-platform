'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';

export default function SettingsPage() {
  const { user } = useAuth();

  const roleLabels = {
    student: 'Student',
    instructor: 'Instructor',
    admin: 'Administrator',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar
              src={user?.photoURL}
              fallback={user?.displayName || user?.email}
              size="lg"
            />
            <div>
              <p className="font-medium text-gray-900">{user?.displayName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Role</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {user && roleLabels[user.role]}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Account Status</dt>
                <dd className="text-sm font-medium text-green-600">
                  {user?.isActive ? 'Active' : 'Inactive'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Member Since</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {user?.createdAt.toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Account management options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Account settings are managed through your Google account. Contact an administrator if you need to change your role or account status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
