'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  Award,
  Calendar,
  User,
  BookOpen,
  Shield,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { verifyCertificate, formatCertificateDate } from '@/lib/services/certificates';
import { VerificationResult } from '@/types/certificate';

export default function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      try {
        setLoading(true);
        const verificationResult = await verifyCertificate(code);
        setResult(verificationResult);
      } catch (error) {
        console.error('Verification error:', error);
        setResult({
          isValid: false,
          certificate: null,
          errorMessage: 'An error occurred while verifying the certificate.',
        });
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      verify();
    }
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Verifying certificate...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Certificate Verification
          </h1>
          <p className="text-gray-600 mt-1">
            Yale Model African Union Training Platform
          </p>
        </div>

        {/* Result Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center">
              {result?.isValid ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-8 w-8" />
                  <CardTitle className="text-xl text-green-600">
                    Valid Certificate
                  </CardTitle>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-600">
                  <XCircle className="h-8 w-8" />
                  <CardTitle className="text-xl text-red-600">
                    Invalid Certificate
                  </CardTitle>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {result?.isValid && result.certificate ? (
              <div className="space-y-6">
                {/* Certificate Details */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-center mb-4">
                    <Award className="h-16 w-16 text-green-600" />
                  </div>
                  <p className="text-center text-sm text-green-800 mb-2">
                    This certificate is authentic and was issued by YMAU.
                  </p>
                </div>

                {/* Details Grid */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Awarded To</p>
                      <p className="font-medium text-gray-900">
                        {result.certificate.studentName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <BookOpen className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Course</p>
                      <p className="font-medium text-gray-900">
                        {result.certificate.courseName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {result.certificate.iterationName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Date of Issue</p>
                      <p className="font-medium text-gray-900">
                        {formatCertificateDate(result.certificate.issuedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Verification Code</p>
                      <p className="font-mono font-medium text-gray-900">
                        {result.certificate.verificationCode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Issued By */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center">
                    Issued by {result.certificate.issuerName}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-center text-red-800">
                    {result?.errorMessage ||
                      'This certificate could not be verified.'}
                  </p>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>Verification code checked:</p>
                  <p className="font-mono font-medium">{code}</p>
                </div>

                <div className="text-center text-sm text-gray-500">
                  <p>
                    If you believe this is an error, please contact YMAU
                    administration.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2">
          <Link href="/">
            <Button variant="outline">Go to YMAU Training Platform</Button>
          </Link>
          <p className="text-xs text-gray-500">
            Yale Model African Union - Training Platform
          </p>
        </div>
      </div>
    </div>
  );
}
