'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { CertificatePDF, CertificateData } from './CertificatePDF';
import { Certificate } from '@/types/certificate';
import {
  generateQRCode,
  getVerificationUrl,
  formatCertificateDate,
  uploadCertificatePdf,
  updateCertificatePdfUrl,
} from '@/lib/services/certificates';
import { Button } from '@/components/ui/Button';
import { Download, Loader2, Eye } from 'lucide-react';

interface CertificateGeneratorProps {
  certificate: Certificate;
  onGenerated?: (pdfUrl: string) => void;
}

/**
 * Component to generate and download a certificate PDF
 */
export function CertificateGenerator({
  certificate,
  onGenerated,
}: CertificateGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = async (): Promise<Blob> => {
    // Generate QR code
    const verificationUrl = getVerificationUrl(certificate.verificationCode);
    const qrCodeDataUrl = await generateQRCode(verificationUrl);

    // Prepare certificate data
    const certificateData: CertificateData = {
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      issuedDate: formatCertificateDate(certificate.issuedAt),
      verificationCode: certificate.verificationCode,
      qrCodeDataUrl,
      issuerName: certificate.issuerName,
    };

    // Generate PDF blob
    const pdfDoc = <CertificatePDF data={certificateData} />;
    const blob = await pdf(pdfDoc).toBlob();

    return blob;
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let pdfUrl = certificate.pdfUrl;

      // If no PDF URL exists, generate and upload
      if (!pdfUrl) {
        const blob = await generatePdf();

        // Upload to Firebase Storage
        pdfUrl = await uploadCertificatePdf(certificate.id, blob);

        // Update certificate record with PDF URL
        await updateCertificatePdfUrl(certificate.id, pdfUrl);

        onGenerated?.(pdfUrl);
      }

      // Download the PDF
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${certificate.courseName.replace(/\s+/g, '_')}_Certificate.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating certificate:', err);
      setError('Failed to generate certificate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const blob = await generatePdf();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error previewing certificate:', err);
      setError('Failed to preview certificate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          className="flex-1"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? 'Generating...' : 'Download Certificate'}
        </Button>

        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={isGenerating}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Programmatically generate a certificate PDF and return the blob
 */
export async function generateCertificateBlob(
  certificate: Certificate
): Promise<Blob> {
  const verificationUrl = getVerificationUrl(certificate.verificationCode);
  const qrCodeDataUrl = await generateQRCode(verificationUrl);

  const certificateData: CertificateData = {
    studentName: certificate.studentName,
    courseName: certificate.courseName,
    issuedDate: formatCertificateDate(certificate.issuedAt),
    verificationCode: certificate.verificationCode,
    qrCodeDataUrl,
    issuerName: certificate.issuerName,
  };

  const pdfDoc = <CertificatePDF data={certificateData} />;
  const blob = await pdf(pdfDoc).toBlob();

  return blob;
}
