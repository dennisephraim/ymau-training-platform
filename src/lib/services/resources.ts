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
import { Resource, ResourceDocument, ResourceFolder, ResourceFolderDocument } from '@/types/resource';
import { UserRole } from '@/types/user';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ RESOURCE FOLDERS ============

/**
 * Get all resource folders
 */
export async function getAllFolders(): Promise<ResourceFolder[]> {
  if (!db) throw new Error('Firestore not initialized');

  const foldersRef = collection(db, 'resourceFolders');
  const q = query(foldersRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as ResourceFolderDocument;
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt as Timestamp | Date),
      updatedAt: toDate(data.updatedAt as Timestamp | Date),
    };
  });
}

/**
 * Get folders visible to a specific role
 */
export async function getFoldersByRole(role: UserRole): Promise<ResourceFolder[]> {
  if (!db) throw new Error('Firestore not initialized');

  const foldersRef = collection(db, 'resourceFolders');
  const q = query(
    foldersRef,
    where('visibleToRoles', 'array-contains', role),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as ResourceFolderDocument;
    return {
      id: doc.id,
      ...data,
      createdAt: toDate(data.createdAt as Timestamp | Date),
      updatedAt: toDate(data.updatedAt as Timestamp | Date),
    };
  });
}

/**
 * Create a new resource folder
 */
export async function createFolder(
  folder: Omit<ResourceFolderDocument, 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const foldersRef = collection(db, 'resourceFolders');
  const docRef = await addDoc(foldersRef, {
    ...folder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an existing resource folder
 */
export async function updateFolder(
  folderId: string,
  updates: Partial<Omit<ResourceFolderDocument, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const folderRef = doc(db, 'resourceFolders', folderId);
  await updateDoc(folderRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a folder: move all resources in it to root, then delete the folder
 */
export async function deleteFolder(folderId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  // Find all resources in this folder
  const resourcesRef = collection(db, 'resources');
  const q = query(resourcesRef, where('folderId', '==', folderId));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);

  // Move all resources to root (folderId: null)
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { folderId: null, updatedAt: serverTimestamp() });
  });

  // Delete the folder
  const folderRef = doc(db, 'resourceFolders', folderId);
  batch.delete(folderRef);

  await batch.commit();
}

// ============ RESOURCES ============

/**
 * Get all resources (for admin/instructor)
 */
export async function getAllResources(): Promise<Resource[]> {
  if (!db) throw new Error('Firestore not initialized');

  const resourcesRef = collection(db, 'resources');
  const q = query(resourcesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as ResourceDocument;
    return {
      id: doc.id,
      ...data,
      folderId: data.folderId || null,
      createdAt: toDate(data.createdAt as Timestamp | Date),
      updatedAt: toDate(data.updatedAt as Timestamp | Date),
    };
  });
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

  return snapshot.docs.map((doc) => {
    const data = doc.data() as ResourceDocument;
    return {
      id: doc.id,
      ...data,
      folderId: data.folderId || null,
      createdAt: toDate(data.createdAt as Timestamp | Date),
      updatedAt: toDate(data.updatedAt as Timestamp | Date),
    };
  });
}

/**
 * Get a single resource by ID
 */
export async function getResource(resourceId: string): Promise<Resource | null> {
  if (!db) throw new Error('Firestore not initialized');

  const resourceRef = doc(db, 'resources', resourceId);
  const snapshot = await getDoc(resourceRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as ResourceDocument;
  return {
    id: snapshot.id,
    ...data,
    folderId: data.folderId || null,
    createdAt: toDate(data.createdAt as Timestamp | Date),
    updatedAt: toDate(data.updatedAt as Timestamp | Date),
  };
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
