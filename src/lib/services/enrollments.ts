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
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Enrollment,
  EnrollmentDocument,
  EnrollmentRequest,
  EnrollmentRequestDocument,
  EnrollmentCode,
} from '@/types/enrollment';
import { getEnrollmentCodeByCode } from './iterations';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ ENROLLMENTS ============

export async function getEnrollment(enrollmentId: string): Promise<Enrollment | null> {
  if (!db) throw new Error('Firestore not initialized');

  const enrollmentRef = doc(db, 'enrollments', enrollmentId);
  const snapshot = await getDoc(enrollmentRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as EnrollmentDocument;
  return {
    id: snapshot.id,
    ...data,
    enrolledAt: toDate(data.enrolledAt as any) || new Date(),
    completedAt: toDate(data.completedAt as any),
  };
}

export async function markEnrollmentCompleted(
  enrollmentId: string,
  certificateId: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const enrollmentRef = doc(db, 'enrollments', enrollmentId);
  await updateDoc(enrollmentRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
    certificateId,
  });
}

export async function getUserEnrollments(userId: string): Promise<Enrollment[]> {
  if (!db) throw new Error('Firestore not initialized');

  const enrollmentsRef = collection(db, 'enrollments');
  const q = query(
    enrollmentsRef,
    where('studentId', '==', userId),
    orderBy('enrolledAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as EnrollmentDocument;
    return {
      id: doc.id,
      ...data,
      enrolledAt: toDate(data.enrolledAt as any) || new Date(),
      completedAt: toDate(data.completedAt as any),
    };
  });
}

export async function getIterationEnrollments(iterationId: string): Promise<Enrollment[]> {
  if (!db) throw new Error('Firestore not initialized');

  const enrollmentsRef = collection(db, 'enrollments');
  const q = query(
    enrollmentsRef,
    where('iterationId', '==', iterationId),
    orderBy('enrolledAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as EnrollmentDocument;
    return {
      id: doc.id,
      ...data,
      enrolledAt: toDate(data.enrolledAt as any) || new Date(),
      completedAt: toDate(data.completedAt as any),
    };
  });
}

export async function checkExistingEnrollment(
  iterationId: string,
  studentId: string
): Promise<Enrollment | null> {
  if (!db) throw new Error('Firestore not initialized');

  const enrollmentsRef = collection(db, 'enrollments');
  const q = query(
    enrollmentsRef,
    where('iterationId', '==', iterationId),
    where('studentId', '==', studentId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as EnrollmentDocument;
  return {
    id: doc.id,
    ...data,
    enrolledAt: toDate(data.enrolledAt as any) || new Date(),
    completedAt: toDate(data.completedAt as any),
  };
}

export async function enrollWithCode(
  code: string,
  studentId: string
): Promise<{ success: boolean; error?: string; enrollment?: Enrollment }> {
  if (!db) throw new Error('Firestore not initialized');

  // Find the enrollment code
  const enrollmentCode = await getEnrollmentCodeByCode(code);

  if (!enrollmentCode) {
    return { success: false, error: 'Invalid enrollment code' };
  }

  if (!enrollmentCode.isActive) {
    return { success: false, error: 'This code is no longer active' };
  }

  if (enrollmentCode.expiresAt && enrollmentCode.expiresAt < new Date()) {
    return { success: false, error: 'This code has expired' };
  }

  if (enrollmentCode.maxUses && enrollmentCode.useCount >= enrollmentCode.maxUses) {
    return { success: false, error: 'This code has reached its maximum uses' };
  }

  // Check if already enrolled
  const existing = await checkExistingEnrollment(enrollmentCode.iterationId, studentId);
  if (existing) {
    return { success: false, error: 'You are already enrolled in this course' };
  }

  // Create enrollment
  const enrollmentsRef = collection(db, 'enrollments');
  const enrollmentData: EnrollmentDocument = {
    iterationId: enrollmentCode.iterationId,
    courseId: enrollmentCode.courseId,
    studentId,
    enrolledAt: new Date(),
    enrolledBy: studentId,
    enrollmentMethod: 'code',
    status: 'active',
    completedAt: null,
    certificateId: null,
  };

  const docRef = await addDoc(enrollmentsRef, {
    ...enrollmentData,
    enrolledAt: serverTimestamp(),
  });

  // Increment code use count
  const codeRef = doc(db, 'enrollmentCodes', enrollmentCode.id);
  await updateDoc(codeRef, {
    useCount: increment(1),
  });

  return {
    success: true,
    enrollment: {
      id: docRef.id,
      ...enrollmentData,
    },
  };
}

export async function createDirectEnrollment(
  iterationId: string,
  courseId: string,
  studentId: string,
  enrolledBy: string
): Promise<Enrollment> {
  if (!db) throw new Error('Firestore not initialized');

  // Check if already enrolled
  const existing = await checkExistingEnrollment(iterationId, studentId);
  if (existing) {
    throw new Error('Student is already enrolled');
  }

  const enrollmentsRef = collection(db, 'enrollments');
  const enrollmentData: EnrollmentDocument = {
    iterationId,
    courseId,
    studentId,
    enrolledAt: new Date(),
    enrolledBy,
    enrollmentMethod: 'direct',
    status: 'active',
    completedAt: null,
    certificateId: null,
  };

  const docRef = await addDoc(enrollmentsRef, {
    ...enrollmentData,
    enrolledAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...enrollmentData,
  };
}

// ============ ENROLLMENT REQUESTS ============

export async function createEnrollmentRequest(
  iterationId: string,
  courseId: string,
  studentId: string
): Promise<EnrollmentRequest> {
  if (!db) throw new Error('Firestore not initialized');

  // Check if already enrolled
  const existing = await checkExistingEnrollment(iterationId, studentId);
  if (existing) {
    throw new Error('You are already enrolled in this course');
  }

  // Check if request already exists
  const existingRequest = await getPendingRequest(iterationId, studentId);
  if (existingRequest) {
    throw new Error('You already have a pending request for this course');
  }

  const requestsRef = collection(db, 'enrollmentRequests');
  const requestData: EnrollmentRequestDocument = {
    iterationId,
    courseId,
    studentId,
    requestedAt: new Date(),
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
  };

  const docRef = await addDoc(requestsRef, {
    ...requestData,
    requestedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...requestData,
  };
}

export async function getPendingRequest(
  iterationId: string,
  studentId: string
): Promise<EnrollmentRequest | null> {
  if (!db) throw new Error('Firestore not initialized');

  const requestsRef = collection(db, 'enrollmentRequests');
  const q = query(
    requestsRef,
    where('iterationId', '==', iterationId),
    where('studentId', '==', studentId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as EnrollmentRequestDocument;
  return {
    id: doc.id,
    ...data,
    requestedAt: toDate(data.requestedAt as any) || new Date(),
    reviewedAt: toDate(data.reviewedAt as any),
  };
}

export async function getIterationRequests(iterationId: string): Promise<EnrollmentRequest[]> {
  if (!db) throw new Error('Firestore not initialized');

  const requestsRef = collection(db, 'enrollmentRequests');
  const q = query(
    requestsRef,
    where('iterationId', '==', iterationId),
    where('status', '==', 'pending'),
    orderBy('requestedAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as EnrollmentRequestDocument;
    return {
      id: doc.id,
      ...data,
      requestedAt: toDate(data.requestedAt as any) || new Date(),
      reviewedAt: toDate(data.reviewedAt as any),
    };
  });
}

export async function approveRequest(
  requestId: string,
  reviewedBy: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const requestRef = doc(db, 'enrollmentRequests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    throw new Error('Request not found');
  }

  const request = requestSnap.data() as EnrollmentRequestDocument;

  // Create enrollment
  await createDirectEnrollment(
    request.iterationId,
    request.courseId,
    request.studentId,
    reviewedBy
  );

  // Update request status
  await updateDoc(requestRef, {
    status: 'approved',
    reviewedBy,
    reviewedAt: serverTimestamp(),
  });
}

export async function rejectRequest(
  requestId: string,
  reviewedBy: string,
  reason?: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const requestRef = doc(db, 'enrollmentRequests', requestId);
  await updateDoc(requestRef, {
    status: 'rejected',
    reviewedBy,
    reviewedAt: serverTimestamp(),
    rejectionReason: reason || null,
  });
}
