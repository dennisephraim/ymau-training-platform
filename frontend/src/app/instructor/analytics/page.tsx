'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">
          View student progress and completion rates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Analytics will be available in Phase 6
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            In this section, you will be able to:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-500 list-disc list-inside">
            <li>View overall course completion rates</li>
            <li>Track individual student progress</li>
            <li>See which chapters have the lowest completion rates</li>
            <li>Export progress reports</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
