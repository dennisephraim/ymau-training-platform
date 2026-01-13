'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        <p className="text-gray-600 mt-1">
          View and download your earned certificates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Certificates Yet</CardTitle>
          <CardDescription>
            Complete courses to earn certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            To earn a certificate:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-500 list-disc list-inside">
            <li>Enroll in a course</li>
            <li>Watch all chapters completely (no skipping)</li>
            <li>Reach 95% or more watch completion</li>
            <li>Download your certificate of completion</li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            Certificate generation will be available in Phase 5.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
