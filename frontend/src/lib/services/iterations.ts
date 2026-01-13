import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  CourseIteration,
  CourseIterationDocument,
  EnrollmentCode,
  EnrollmentCodeDocument,
} from '@/types/enrollment';
import { nanoid } from 'nanoid';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ COURSE ITERATIONS ============

export async function getIterations(courseId: string): Promise<CourseIteration[]> {
  if (!db) throw new Error('Firestore not initialized');

  const iterationsRef = collection(db, 'courseIterations');
  const q = query(
    iterationsRef,
    where('courseId', '==', courseId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as CourseIterationDocument;
    return {
      id: doc.id,
      ...data,
      startDate: toDate(data.startDate as any),
      endDate: toDate(data.endDate as any),
      createdAt: toDate(data.createdAt as any) || new Date(),
      updatedAt: toDate(data.updatedAt as any) || new Date(),
    };
  });
}

export async function getIteration(iterationId: string): Promise<CourseIteration | null> {
  if (!db) throw new Error('Firestore not initialized');

  const iterationRef = doc(db, 'courseIterations', iterationId);
  const snapshot = await getDoc(iterationRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as CourseIterationDocument;
  return {
    id: snapshot.id,
    ...data,
    startDate: toDate(data.startDate as any),
    endDate: toDate(data.endDate as any),
    createdAt: toDate(data.createdAt as any) || new Date(),
    updatedAt: toDate(data.updatedAt as any) || new Date(),
  };
}

export async function createIteration(
  data: Omit<CourseIterationDocument, 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const iterationsRef = collection(db, 'courseIterations');
  const docRef = await addDoc(iterationsRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateIteration(
  iterationId: string,
  data: Partial<Omit<CourseIterationDocument, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const iterationRef = doc(db, 'courseIterations', iterationId);
  await updateDoc(iterationRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteIteration(iterationId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const iterationRef = doc(db, 'courseIterations', iterationId);
  await deleteDoc(iterationRef);
}

// ============ ENROLLMENT CODES ============

export async function getEnrollmentCodes(iterationId: string): Promise<EnrollmentCode[]> {
  if (!db) throw new Error('Firestore not initialized');

  const codesRef = collection(db, 'enrollmentCodes');
  const q = query(
    codesRef,
    where('iterationId', '==', iterationId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as EnrollmentCodeDocument;
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt as any) || new Date(),
      expiresAt: toDate(data.expiresAt as any),
    };
  });
}

export async function createEnrollmentCode(
  iterationId: string,
  courseId: string,
  createdBy: string,
  options?: {
    expiresAt?: Date | null;
    maxUses?: number | null;
  }
): Promise<EnrollmentCode> {
  if (!db) throw new Error('Firestore not initialized');

  const code = nanoid(8).toUpperCase(); // Generate 8-character code

  const codesRef = collection(db, 'enrollmentCodes');
  const docRef = await addDoc(codesRef, {
    code,
    iterationId,
    courseId,
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt: options?.expiresAt || null,
    maxUses: options?.maxUses || null,
    useCount: 0,
    isActive: true,
  });

  return {
    id: docRef.id,
    code,
    iterationId,
    courseId,
    createdBy,
    createdAt: new Date(),
    expiresAt: options?.expiresAt || null,
    maxUses: options?.maxUses || null,
    useCount: 0,
    isActive: true,
  };
}

export async function deactivateEnrollmentCode(codeId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const codeRef = doc(db, 'enrollmentCodes', codeId);
  await updateDoc(codeRef, {
    isActive: false,
  });
}

export async function getEnrollmentCodeByCode(code: string): Promise<EnrollmentCode | null> {
  if (!db) throw new Error('Firestore not initialized');

  const codesRef = collection(db, 'enrollmentCodes');
  const q = query(codesRef, where('code', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as EnrollmentCodeDocument;

  return {
    id: doc.id,
    ...data,
    createdAt: toDate(data.createdAt as any) || new Date(),
    expiresAt: toDate(data.expiresAt as any),
  };
}
