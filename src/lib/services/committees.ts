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
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Committee, CommitteeDocument } from '@/types/committee';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

/**
 * Get all committees ordered by name
 */
export async function getAllCommittees(): Promise<Committee[]> {
  if (!db) throw new Error('Firestore not initialized');

  const committeesRef = collection(db, 'committees');
  const q = query(committeesRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as CommitteeDocument;
    return {
      id: doc.id,
      name: data.name,
      description: data.description || '',
      chairperson: data.chairperson || '',
      languageLevel: data.languageLevel || '',
      createdAt: toDate(data.createdAt as Timestamp | Date),
      updatedAt: toDate(data.updatedAt as Timestamp | Date),
    };
  });
}

/**
 * Get a single committee by ID
 */
export async function getCommittee(id: string): Promise<Committee | null> {
  if (!db) throw new Error('Firestore not initialized');

  const committeeRef = doc(db, 'committees', id);
  const snapshot = await getDoc(committeeRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as CommitteeDocument;
  return {
    id: snapshot.id,
    name: data.name,
    description: data.description || '',
    chairperson: data.chairperson || '',
    languageLevel: data.languageLevel || '',
    createdAt: toDate(data.createdAt as Timestamp | Date),
    updatedAt: toDate(data.updatedAt as Timestamp | Date),
  };
}

/**
 * Create a new committee
 */
export async function createCommittee(fields: {
  name: string;
  description?: string;
  chairperson?: string;
  languageLevel?: string;
}): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const committeesRef = collection(db, 'committees');
  const docRef = await addDoc(committeesRef, {
    name: fields.name,
    description: fields.description || '',
    chairperson: fields.chairperson || '',
    languageLevel: fields.languageLevel || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a committee
 */
export async function updateCommittee(
  id: string,
  updates: { name?: string; description?: string; chairperson?: string; languageLevel?: string }
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const committeeRef = doc(db, 'committees', id);
  await updateDoc(committeeRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a committee and clear committeeId on any assigned users
 */
export async function deleteCommittee(id: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  // Find all users assigned to this committee
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('committeeId', '==', id));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);

  // Clear committeeId on all assigned users
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { committeeId: null });
  });

  // Delete the committee
  const committeeRef = doc(db, 'committees', id);
  batch.delete(committeeRef);

  await batch.commit();
}
