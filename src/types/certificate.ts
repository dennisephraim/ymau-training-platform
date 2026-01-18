/**
 * Certificate issued upon course completion
 */
export interface Certificate {
  id: string;

  // References
  enrollmentId: string;
  courseId: string;
  studentId: string;

  // Certificate details
  studentName: string;
  courseName: string;

  // Verification
  verificationCode: string; // Unique code for public verification

  // Template
  templateId: string | null; // null = use auto-generated template

  // URLs
  pdfUrl: string | null; // Firebase Storage URL

  // Timestamps
  issuedAt: Date;
  expiresAt: Date | null; // null = never expires

  // Metadata
  issuerName: string; // Instructor who approved/issued
  issuerId: string;
}

export interface CertificateDocument {
  enrollmentId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  courseName: string;
  verificationCode: string;
  templateId: string | null;
  pdfUrl: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  issuerName: string;
  issuerId: string;
}

/**
 * Custom certificate template uploaded by instructor
 */
export interface CertificateTemplate {
  id: string;
  courseId: string;
  name: string;
  description: string | null;

  // Template file
  templateUrl: string; // Background image URL
  templateType: 'image'; // Currently only image support

  // Placeholder positions (percentage-based for responsive sizing)
  placeholders: {
    studentName: PlaceholderPosition;
    courseName: PlaceholderPosition;
    date: PlaceholderPosition;
    verificationCode: PlaceholderPosition;
    qrCode: PlaceholderPosition;
  };

  // Styling
  fontFamily: string;
  primaryColor: string;

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PlaceholderPosition {
  x: number; // Percentage from left (0-100)
  y: number; // Percentage from top (0-100)
  fontSize: number; // Font size in points
  textAlign: 'left' | 'center' | 'right';
  color: string; // Hex color
}

export interface CertificateTemplateDocument {
  courseId: string;
  name: string;
  description: string | null;
  templateUrl: string;
  templateType: 'image';
  placeholders: {
    studentName: PlaceholderPosition;
    courseName: PlaceholderPosition;
    date: PlaceholderPosition;
    verificationCode: PlaceholderPosition;
    qrCode: PlaceholderPosition;
  };
  fontFamily: string;
  primaryColor: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Public verification result
 */
export interface VerificationResult {
  isValid: boolean;
  certificate: Certificate | null;
  errorMessage?: string;
}
