'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Award,
  Download,
  ExternalLink,
  Calendar,
  BookOpen,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/auth/AuthContext';
import { CertificateGenerator } from '@/components/certificates';
import { Certificate } from '@/types/certificate';
import * as certificateService from '@/lib/services/certificates';

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCertificates = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const certs = await certificateService.getStudentCertificates(user.id);
      setCertificates(certs);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
          <p className="text-gray-600 mt-1">
            View and download your earned certificates
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-8">
                <div className="h-32 bg-gray-200 rounded"></div>
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
        <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        <p className="text-gray-600 mt-1">
          View and download your earned certificates
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-gray-400" />
              No Certificates Yet
            </CardTitle>
            <CardDescription>
              Complete courses to earn certificates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">To earn a certificate:</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-500 list-disc list-inside">
              <li>Enroll in a course</li>
              <li>Watch all chapters completely (no skipping)</li>
              <li>Reach 95% or more watch completion on each chapter</li>
              <li>Your certificate will be automatically generated</li>
            </ul>
            <div className="mt-6">
              <Link href="/dashboard/courses">
                <Button>View My Courses</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((certificate) => (
            <CertificateCard
              key={certificate.id}
              certificate={certificate}
              onUpdate={fetchCertificates}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CertificateCard({
  certificate,
  onUpdate,
}: {
  certificate: Certificate;
  onUpdate: () => void;
}) {
  const verificationUrl = certificateService.getVerificationUrl(
    certificate.verificationCode
  );

  return (
    <Card className="overflow-hidden">
      {/* Certificate Preview Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
        <div className="flex items-center justify-between">
          <Award className="h-10 w-10" />
          <span className="text-xs uppercase tracking-wider opacity-75">
            Certificate of Completion
          </span>
        </div>
        <h3 className="text-lg font-bold mt-4">{certificate.courseName}</h3>
        <p className="text-sm opacity-75">
          Issued by {certificate.issuerName}
        </p>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Details */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            Issued: {certificateService.formatCertificateDate(certificate.issuedAt)}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Shield className="h-4 w-4 mr-2" />
            <span className="font-mono text-xs">
              {certificate.verificationCode}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <CertificateGenerator
            certificate={certificate}
            onGenerated={onUpdate}
          />

          <Link href={`/verify/${certificate.verificationCode}`} target="_blank">
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Verification Page
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
