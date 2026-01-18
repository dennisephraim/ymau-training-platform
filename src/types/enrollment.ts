export type EnrollmentStatus = 'active' | 'completed' | 'withdrawn';
export type EnrollmentMethod = 'code' | 'request' | 'direct';

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: Date;
  enrolledBy: string; // userId of instructor or self
  enrollmentMethod: EnrollmentMethod;
  status: EnrollmentStatus;
  completedAt: Date | null;
  certificateId: string | null;
}

export interface EnrollmentDocument {
  courseId: string;
  studentId: string;
  enrolledAt: Date;
  enrolledBy: string;
  enrollmentMethod: EnrollmentMethod;
  status: EnrollmentStatus;
  completedAt: Date | null;
  certificateId: string | null;
}

export interface EnrollmentCode {
  id: string;
  code: string;
  courseId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  maxUses: number | null; // null = unlimited
  useCount: number;
  isActive: boolean;
}

export interface EnrollmentCodeDocument {
  code: string;
  courseId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
  isActive: boolean;
}

export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface EnrollmentRequest {
  id: string;
  courseId: string;
  studentId: string;
  requestedAt: Date;
  status: EnrollmentRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}

export interface EnrollmentRequestDocument {
  courseId: string;
  studentId: string;
  requestedAt: Date;
  status: EnrollmentRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}
