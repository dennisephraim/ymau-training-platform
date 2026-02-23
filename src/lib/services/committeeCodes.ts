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
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  CommitteeCode,
  CommitteeCodeDocument,
} from '@/types/committeeCode';
import { nanoid } from 'nanoid';
import { assignUserCommittee } from './users';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ COMMITTEE CODES ============

export async function getCommitteeCodes(committeeId: string): Promise<CommitteeCode[]> {
  if (!db) throw new Error('Firestore not initialized');

  const codesRef = collection(db, 'committeeCodes');
  const q = query(
    codesRef,
    where('committeeId', '==', committeeId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as CommitteeCodeDocument;
    return {
      id: docSnap.id,
      ...data,
      createdAt: toDate(data.createdAt as Timestamp | Date) || new Date(),
      expiresAt: toDate(data.expiresAt as Timestamp | Date),
    };
  });
}

export async function getCommitteeCodeByCode(code: string): Promise<CommitteeCode | null> {
  if (!db) throw new Error('Firestore not initialized');

  const codesRef = collection(db, 'committeeCodes');
  const q = query(codesRef, where('code', '==', code.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as CommitteeCodeDocument;
  return {
    id: docSnap.id,
    ...data,
    createdAt: toDate(data.createdAt as Timestamp | Date) || new Date(),
    expiresAt: toDate(data.expiresAt as Timestamp | Date),
  };
}

export async function createCommitteeCode(
  committeeId: string,
  createdBy: string,
  options?: {
    expiresAt?: Date | null;
    maxUses?: number | null;
  }
): Promise<CommitteeCode> {
  if (!db) throw new Error('Firestore not initialized');

  const code = nanoid(8).toUpperCase();

  const codesRef = collection(db, 'committeeCodes');
  const codeData: CommitteeCodeDocument = {
    code,
    committeeId,
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

export async function deactivateCommitteeCode(codeId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const codeRef = doc(db, 'committeeCodes', codeId);
  await updateDoc(codeRef, { isActive: false });
}

export async function deleteCommitteeCode(codeId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const codeRef = doc(db, 'committeeCodes', codeId);
  await deleteDoc(codeRef);
}

// ============ JOIN WITH CODE ============

export async function joinCommitteeWithCode(
  code: string,
  studentId: string
): Promise<{ success: boolean; error?: string; committeeName?: string }> {
  if (!db) throw new Error('Firestore not initialized');

  // Find the committee code
  const committeeCode = await getCommitteeCodeByCode(code);

  if (!committeeCode) {
    return { success: false, error: 'Invalid committee code' };
  }

  if (!committeeCode.isActive) {
    return { success: false, error: 'This code is no longer active' };
  }

  if (committeeCode.expiresAt && committeeCode.expiresAt < new Date()) {
    return { success: false, error: 'This code has expired' };
  }

  if (committeeCode.maxUses && committeeCode.useCount >= committeeCode.maxUses) {
    return { success: false, error: 'This code has reached its maximum uses' };
  }

  // Check if already in this specific committee
  const userRef = doc(db, 'users', studentId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.committeeId === committeeCode.committeeId) {
      return { success: false, error: 'You are already in this committee' };
    }
    // If in a different committee, silently switch (no error)
  }

  // Assign user to committee
  await assignUserCommittee(studentId, committeeCode.committeeId);

  // Increment code use count
  const codeRef = doc(db, 'committeeCodes', committeeCode.id);
  await updateDoc(codeRef, {
    useCount: increment(1),
  });

  // Fetch committee name
  const committeeRef = doc(db, 'committees', committeeCode.committeeId);
  const committeeSnap = await getDoc(committeeRef);
  const committeeName = committeeSnap.exists() ? committeeSnap.data().name : 'the committee';

  return {
    success: true,
    committeeName,
  };
}
