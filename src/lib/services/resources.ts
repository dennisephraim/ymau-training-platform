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
import { Resource, ResourceDocument } from '@/types/resource';
import { UserRole } from '@/types/user';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResource(doc: { id: string; data: () => any }): Resource {
  const data = doc.data() as ResourceDocument;
  return {
    id: doc.id,
    ...data,
    committeeIds: Array.isArray(data.committeeIds) ? data.committeeIds : [],
    createdAt: toDate(data.createdAt as Timestamp | Date),
    updatedAt: toDate(data.updatedAt as Timestamp | Date),
  };
}

/**
 * Get all resources (for admin/instructor)
 */
export async function getAllResources(): Promise<Resource[]> {
  if (!db) throw new Error('Firestore not initialized');

  const resourcesRef = collection(db, 'resources');
  const q = query(resourcesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(mapResource);
}

/**
 * Get resources visible to a specific role
 */
export async function getResourcesByRole(role: UserRole): Promise<Resource[]> {
  if (!db) throw new Error('Firestore not initialized');

  const resourcesRef = collection(db, 'resources');
  const q = query(
    resourcesRef,
    where('visibleToRoles', 'array-contains', role),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(mapResource);
}

/**
 * Get resources visible to a student, filtered by their committee.
 * Returns resources where committeeIds is empty (general) or includes the student's committee.
 */
export async function getResourcesForStudent(
  role: UserRole,
  committeeId: string | null
): Promise<Resource[]> {
  const resources = await getResourcesByRole(role);
  return resources.filter(
    (r) => r.committeeIds.length === 0 || (committeeId && r.committeeIds.includes(committeeId))
  );
}

/**
 * Get a single resource by ID
 */
export async function getResource(resourceId: string): Promise<Resource | null> {
  if (!db) throw new Error('Firestore not initialized');

  const resourceRef = doc(db, 'resources', resourceId);
  const snapshot = await getDoc(resourceRef);

  if (!snapshot.exists()) return null;

  return mapResource(snapshot);
}

/**
 * Create a new resource
 */
export async function createResource(
  resource: Omit<ResourceDocument, 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const resourcesRef = collection(db, 'resources');
  const docRef = await addDoc(resourcesRef, {
    ...resource,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an existing resource
 */
export async function updateResource(
  resourceId: string,
  updates: Partial<Omit<ResourceDocument, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const resourceRef = doc(db, 'resources', resourceId);
  await updateDoc(resourceRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a resource
 */
export async function deleteResource(resourceId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const resourceRef = doc(db, 'resources', resourceId);
  await deleteDoc(resourceRef);
}
