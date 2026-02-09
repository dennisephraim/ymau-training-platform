import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import {
  Certificate,
  CertificateDocument,
  CertificateTemplate,
  CertificateTemplateDocument,
  VerificationResult,
} from '@/types/certificate';
import QRCode from 'qrcode';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ VERIFICATION CODE ============

/**
 * Generate a unique verification code
 * Format: YMAU-XXXX-XXXX (easy to read and type)
 */
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  let code = 'YMAU-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============ QR CODE ============

/**
 * Generate a QR code data URL for verification
 */
export async function generateQRCode(verificationUrl: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Get the verification URL for a certificate
 */
export function getVerificationUrl(verificationCode: string): string {
  const baseUrl = 'https://ymau--ymau-delegate-hub.us-central1.hosted.app';
  return `${baseUrl}/verify/${verificationCode}`;
}

// ============ CERTIFICATES ============

/**
 * Create a new certificate
 */
export async function createCertificate(
  enrollmentId: string,
  courseId: string,
  studentId: string,
  studentName: string,
  courseName: string,
  issuerId: string,
  issuerName: string,
  templateId?: string | null
): Promise<Certificate> {
  if (!db) throw new Error('Firestore not initialized');

  // Check if certificate already exists for this enrollment
  const existing = await getCertificateByEnrollment(enrollmentId);
  if (existing) {
    return existing;
  }

  const verificationCode = generateVerificationCode();

  const certificateData: CertificateDocument = {
    enrollmentId,
    courseId,
    studentId,
    studentName,
    courseName,
    verificationCode,
    templateId: templateId || null,
    pdfUrl: null, // Will be set after PDF is generated
    issuedAt: new Date(),
    expiresAt: null,
    issuerName,
    issuerId,
  };

  const certificatesRef = collection(db, 'certificates');
  const docRef = await addDoc(certificatesRef, {
    ...certificateData,
    issuedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...certificateData,
  };
}

/**
 * Update certificate with PDF URL after generation
 */
export async function updateCertificatePdfUrl(
  certificateId: string,
  pdfUrl: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const certRef = doc(db, 'certificates', certificateId);
  await updateDoc(certRef, { pdfUrl });
}

/**
 * Get certificate by ID
 */
export async function getCertificate(certificateId: string): Promise<Certificate | null> {
  if (!db) throw new Error('Firestore not initialized');

  const certRef = doc(db, 'certificates', certificateId);
  const snapshot = await getDoc(certRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as CertificateDocument;
  return {
    id: snapshot.id,
    ...data,
    issuedAt: toDate(data.issuedAt as Timestamp | Date),
    expiresAt: data.expiresAt ? toDate(data.expiresAt as Timestamp | Date) : null,
  };
}

/**
 * Get certificate by enrollment ID
 */
export async function getCertificateByEnrollment(
  enrollmentId: string
): Promise<Certificate | null> {
  if (!db) throw new Error('Firestore not initialized');

  const certificatesRef = collection(db, 'certificates');
  const q = query(certificatesRef, where('enrollmentId', '==', enrollmentId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as CertificateDocument;
  return {
    id: doc.id,
    ...data,
    issuedAt: toDate(data.issuedAt as Timestamp | Date),
    expiresAt: data.expiresAt ? toDate(data.expiresAt as Timestamp | Date) : null,
  };
}

/**
 * Get all certificates for a student
 */
export async function getStudentCertificates(studentId: string): Promise<Certificate[]> {
  if (!db) throw new Error('Firestore not initialized');

  const certificatesRef = collection(db, 'certificates');
  const q = query(
    certificatesRef,
    where('studentId', '==', studentId),
    orderBy('issuedAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as CertificateDocument;
    return {
      id: doc.id,
      ...data,
      issuedAt: toDate(data.issuedAt as Timestamp | Date),
      expiresAt: data.expiresAt ? toDate(data.expiresAt as Timestamp | Date) : null,
    };
  });
}

/**
 * Get all certificates for a course
 */
export async function getCourseCertificates(courseId: string): Promise<Certificate[]> {
  if (!db) throw new Error('Firestore not initialized');

  const certificatesRef = collection(db, 'certificates');
  const q = query(
    certificatesRef,
    where('courseId', '==', courseId),
    orderBy('issuedAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as CertificateDocument;
    return {
      id: doc.id,
      ...data,
      issuedAt: toDate(data.issuedAt as Timestamp | Date),
      expiresAt: data.expiresAt ? toDate(data.expiresAt as Timestamp | Date) : null,
    };
  });
}

// ============ VERIFICATION ============

/**
 * Verify a certificate by its code
 */
export async function verifyCertificate(
  verificationCode: string
): Promise<VerificationResult> {
  if (!db) throw new Error('Firestore not initialized');

  try {
    const certificatesRef = collection(db, 'certificates');
    const q = query(certificatesRef, where('verificationCode', '==', verificationCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return {
        isValid: false,
        certificate: null,
        errorMessage: 'Certificate not found. Please check the verification code.',
      };
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as CertificateDocument;
    const certificate: Certificate = {
      id: doc.id,
      ...data,
      issuedAt: toDate(data.issuedAt as Timestamp | Date),
      expiresAt: data.expiresAt ? toDate(data.expiresAt as Timestamp | Date) : null,
    };

    // Check if certificate has expired
    if (certificate.expiresAt && certificate.expiresAt < new Date()) {
      return {
        isValid: false,
        certificate,
        errorMessage: 'This certificate has expired.',
      };
    }

    return {
      isValid: true,
      certificate,
    };
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return {
      isValid: false,
      certificate: null,
      errorMessage: 'An error occurred while verifying the certificate.',
    };
  }
}

// ============ CERTIFICATE TEMPLATES ============

/**
 * Get certificate template for a course
 */
export async function getCourseTemplate(
  courseId: string
): Promise<CertificateTemplate | null> {
  if (!db) throw new Error('Firestore not initialized');

  const templatesRef = collection(db, 'certificateTemplates');
  const q = query(
    templatesRef,
    where('courseId', '==', courseId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as CertificateTemplateDocument;
  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt as Timestamp | Date),
    updatedAt: toDate(data.updatedAt as Timestamp | Date),
  };
}

/**
 * Upload certificate PDF to storage
 */
export async function uploadCertificatePdf(
  certificateId: string,
  pdfBlob: Blob
): Promise<string> {
  if (!storage) throw new Error('Firebase Storage not initialized');

  const fileName = `certificates/${certificateId}.pdf`;
  const storageRef = ref(storage, fileName);

  await uploadBytes(storageRef, pdfBlob, {
    contentType: 'application/pdf',
  });

  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

// ============ FORMATTING HELPERS ============

/**
 * Format date for certificate display
 */
export function formatCertificateDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
