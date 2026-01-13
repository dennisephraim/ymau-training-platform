'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function MyProgressPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <p className="text-gray-600 mt-1">
          Track your learning progress across all courses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Progress Yet</CardTitle>
          <CardDescription>
            Start watching course videos to track your progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Once you&apos;re enrolled in courses, you&apos;ll see:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-500 list-disc list-inside">
            <li>Overall completion percentage for each course</li>
            <li>Chapter-by-chapter progress</li>
            <li>Time spent watching videos</li>
            <li>Chapters you need to complete</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
