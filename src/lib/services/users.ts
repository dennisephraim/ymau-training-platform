import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User, UserDocument, UserRole } from '@/types/user';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

/**
 * Get a user by their ID
 */
export async function getUser(userId: string): Promise<User | null> {
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as UserDocument;
  return {
    id: snapshot.id,
    ...data,
    createdAt: toDate(data.createdAt as any),
    updatedAt: toDate(data.updatedAt as any),
  };
}

/**
 * Get multiple users by their IDs
 */
export async function getUsersByIds(userIds: string[]): Promise<Map<string, User>> {
  if (!db) throw new Error('Firestore not initialized');

  const users = new Map<string, User>();

  // Fetch users in parallel (batch of 10 to avoid hitting Firestore limits)
  const batches = [];
  for (let i = 0; i < userIds.length; i += 10) {
    const batch = userIds.slice(i, i + 10);
    batches.push(batch);
  }

  for (const batch of batches) {
    const promises = batch.map((id) => getUser(id));
    const results = await Promise.all(promises);
    results.forEach((user) => {
      if (user) {
        users.set(user.id, user);
      }
    });
  }

  return users;
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  if (!db) throw new Error('Firestore not initialized');

  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as UserDocument;
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt as any),
      updatedAt: toDate(data.updatedAt as any),
    };
  });
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { role });
}

/**
 * Update user active status (admin only)
 */
export async function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isActive });
}

/**
 * Search users by email
 */
export async function searchUsersByEmail(emailQuery: string): Promise<User[]> {
  if (!db) throw new Error('Firestore not initialized');

  // Firestore doesn't support LIKE queries, so we do a prefix match
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('email', '>=', emailQuery.toLowerCase()),
    where('email', '<=', emailQuery.toLowerCase() + '\uf8ff'),
    orderBy('email')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as UserDocument;
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt as any),
      updatedAt: toDate(data.updatedAt as any),
    };
  });
}

/**
 * Update user profile (photoURL and/or displayName)
 */
export async function updateUserProfile(
  userId: string,
  updates: { photoURL?: string; displayName?: string }
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date(),
  });
}
