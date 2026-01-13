'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ManageUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-600 mt-1">
          View and manage user roles and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            User management will be available in Phase 6
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            In this section, you will be able to:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-500 list-disc list-inside">
            <li>View all registered users</li>
            <li>Promote students to instructor role</li>
            <li>Demote instructors to student role</li>
            <li>Activate/deactivate user accounts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
