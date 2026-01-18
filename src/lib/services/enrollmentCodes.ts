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

// ============ ENROLLMENT CODES ============

export async function getEnrollmentCodes(courseId: string): Promise<EnrollmentCode[]> {
  if (!db) throw new Error('Firestore not initialized');

  const codesRef = collection(db, 'enrollmentCodes');
  const q = query(
    codesRef,
    where('courseId', '==', courseId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as EnrollmentCodeDocument;
    return {
      id: docSnap.id,
      ...data,
      createdAt: toDate(data.createdAt as any) || new Date(),
      expiresAt: toDate(data.expiresAt as any),
    };
  });
}

export async function getEnrollmentCode(codeId: string): Promise<EnrollmentCode | null> {
  if (!db) throw new Error('Firestore not initialized');

  const codeRef = doc(db, 'enrollmentCodes', codeId);
  const snapshot = await getDoc(codeRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as EnrollmentCodeDocument;
  return {
    id: snapshot.id,
    ...data,
    createdAt: toDate(data.createdAt as any) || new Date(),
    expiresAt: toDate(data.expiresAt as any),
  };
}

export async function getEnrollmentCodeByCode(code: string): Promise<EnrollmentCode | null> {
  if (!db) throw new Error('Firestore not initialized');

  const codesRef = collection(db, 'enrollmentCodes');
  const q = query(codesRef, where('code', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as EnrollmentCodeDocument;
  return {
    id: docSnap.id,
    ...data,
    createdAt: toDate(data.createdAt as any) || new Date(),
    expiresAt: toDate(data.expiresAt as any),
  };
}

export async function createEnrollmentCode(
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
  const codeData: EnrollmentCodeDocument = {
    code,
    courseId,
    createdBy,
    createdAt: new Date(),
    expiresAt: options?.expiresAt || null,
    maxUses: options?.maxUses || null,
    useCount: 0,
    isActive: true,
  };

  const docRef = await addDoc(codesRef, {
    ...codeData,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...codeData,
  };
}

export async function updateEnrollmentCode(
  codeId: string,
  data: Partial<Pick<EnrollmentCodeDocument, 'isActive' | 'expiresAt' | 'maxUses'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const codeRef = doc(db, 'enrollmentCodes', codeId);
  await updateDoc(codeRef, data);
}

export async function deleteEnrollmentCode(codeId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const codeRef = doc(db, 'enrollmentCodes', codeId);
  await deleteDoc(codeRef);
}

export async function deactivateEnrollmentCode(codeId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const codeRef = doc(db, 'enrollmentCodes', codeId);
  await updateDoc(codeRef, { isActive: false });
}
