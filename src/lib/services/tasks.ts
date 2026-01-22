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
  Task,
  TaskDocument,
  TaskQuestion,
  TaskResponse,
  TaskResponseDocument,
  TaskResponseAnswer,
  TaskWithStatus,
} from '@/types/task';
import { UserRole } from '@/types/user';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ TASKS ============

/**
 * Get all tasks (for admin/instructor)
 */
export async function getAllTasks(): Promise<Task[]> {
  if (!db) throw new Error('Firestore not initialized');

  const tasksRef = collection(db, 'tasks');
  const q = query(tasksRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as TaskDocument;
    return {
      id: doc.id,
      ...data,
      instructorIds: data.instructorIds || [],
      dueDate: data.dueDate ? toDate(data.dueDate as any) : null,
      createdAt: toDate(data.createdAt as any),
      updatedAt: toDate(data.updatedAt as any),
    };
  });
}

/**
 * Get tasks assigned to a specific role
 */
export async function getTasksByRole(role: UserRole): Promise<Task[]> {
  if (!db) throw new Error('Firestore not initialized');

  const tasksRef = collection(db, 'tasks');
  const q = query(
    tasksRef,
    where('isPublished', '==', true),
    where('assignedRoles', 'array-contains', role),
    orderBy('dueDate', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as TaskDocument;
    return {
      id: doc.id,
      ...data,
      instructorIds: data.instructorIds || [],
      dueDate: data.dueDate ? toDate(data.dueDate as any) : null,
      createdAt: toDate(data.createdAt as any),
      updatedAt: toDate(data.updatedAt as any),
    };
  });
}

/**
 * Get tasks with submission status for a user
 */
export async function getTasksWithStatus(
  userId: string,
  role: UserRole
): Promise<TaskWithStatus[]> {
  const tasks = await getTasksByRole(role);
  const responses = await getUserTaskResponses(userId);
  const responseMap = new Map(responses.map((r) => [r.taskId, r]));
  const now = new Date();

  return tasks.map((task) => {
    const response = responseMap.get(task.id);
    const isOverdue = task.dueDate ? task.dueDate < now && !response : false;

    return {
      ...task,
      isSubmitted: !!response,
      isOverdue,
      response,
    };
  });
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<Task | null> {
  if (!db) throw new Error('Firestore not initialized');

  const taskRef = doc(db, 'tasks', taskId);
  const snapshot = await getDoc(taskRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as TaskDocument;
  return {
    id: snapshot.id,
    ...data,
    instructorIds: data.instructorIds || [],
    dueDate: data.dueDate ? toDate(data.dueDate as any) : null,
    createdAt: toDate(data.createdAt as any),
    updatedAt: toDate(data.updatedAt as any),
  };
}

/**
 * Create a new task
 */
export async function createTask(
  task: Omit<TaskDocument, 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const tasksRef = collection(db, 'tasks');
  const docRef = await addDoc(tasksRef, {
    ...task,
    instructorIds: task.instructorIds || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Get tasks where user is creator OR in instructorIds array
 */
export async function getInstructorTasks(instructorId: string): Promise<Task[]> {
  if (!db) throw new Error('Firestore not initialized');

  const tasksRef = collection(db, 'tasks');
  
  // Query for tasks where user is the creator
  const creatorQuery = query(
    tasksRef,
    where('createdBy', '==', instructorId),
    orderBy('createdAt', 'desc')
  );
  
  // Query for tasks where user is in instructorIds
  const instructorQuery = query(
    tasksRef,
    where('instructorIds', 'array-contains', instructorId),
    orderBy('createdAt', 'desc')
  );

  const [creatorSnapshot, instructorSnapshot] = await Promise.all([
    getDocs(creatorQuery),
    getDocs(instructorQuery),
  ]);

  // Merge and deduplicate results
  const taskMap = new Map<string, Task>();
  
  const processDocs = (docs: typeof creatorSnapshot.docs) => {
    docs.forEach((doc) => {
      if (!taskMap.has(doc.id)) {
        const data = doc.data() as TaskDocument;
        taskMap.set(doc.id, {
          id: doc.id,
          ...data,
          instructorIds: data.instructorIds || [],
          dueDate: data.dueDate ? toDate(data.dueDate as any) : null,
          createdAt: toDate(data.createdAt as any),
          updatedAt: toDate(data.updatedAt as any),
        });
      }
    });
  };

  processDocs(creatorSnapshot.docs);
  processDocs(instructorSnapshot.docs);

  // Sort by createdAt descending
  return Array.from(taskMap.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * Check if a user has instructor access to a task
 */
export function hasInstructorAccess(task: Task, userId: string): boolean {
  return task.createdBy === userId || task.instructorIds.includes(userId);
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<TaskDocument, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const taskRef = doc(db, 'tasks', taskId);
  await deleteDoc(taskRef);
}

// ============ TASK RESPONSES ============

/**
 * Get all responses for a specific task (for instructor)
 */
export async function getTaskResponses(taskId: string): Promise<TaskResponse[]> {
  if (!db) throw new Error('Firestore not initialized');

  const responsesRef = collection(db, 'taskResponses');
  const q = query(
    responsesRef,
    where('taskId', '==', taskId),
    orderBy('submittedAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as TaskResponseDocument;
    return {
      id: doc.id,
      ...data,
      submittedAt: toDate(data.submittedAt as any),
    };
  });
}

/**
 * Get all task responses for a user
 */
export async function getUserTaskResponses(userId: string): Promise<TaskResponse[]> {
  if (!db) throw new Error('Firestore not initialized');

  const responsesRef = collection(db, 'taskResponses');
  const q = query(responsesRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as TaskResponseDocument;
    return {
      id: doc.id,
      ...data,
      submittedAt: toDate(data.submittedAt as any),
    };
  });
}

/**
 * Get a user's response to a specific task
 */
export async function getUserTaskResponse(
  taskId: string,
  userId: string
): Promise<TaskResponse | null> {
  if (!db) throw new Error('Firestore not initialized');

  const responsesRef = collection(db, 'taskResponses');
  const q = query(
    responsesRef,
    where('taskId', '==', taskId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as TaskResponseDocument;
  return {
    id: doc.id,
    ...data,
    submittedAt: toDate(data.submittedAt as any),
  };
}

/**
 * Submit a response to a task
 */
export async function submitTaskResponse(
  taskId: string,
  userId: string,
  answers: TaskResponseAnswer[],
  fileUrl: string | null = null,
  fileName: string | null = null
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  // Check for existing response
  const existing = await getUserTaskResponse(taskId, userId);
  
  if (existing) {
    // Update existing response
    const responseRef = doc(db, 'taskResponses', existing.id);
    await updateDoc(responseRef, {
      answers,
      fileUrl,
      fileName,
      submittedAt: serverTimestamp(),
    });
    return existing.id;
  }

  // Create new response
  const responsesRef = collection(db, 'taskResponses');
  const docRef = await addDoc(responsesRef, {
    taskId,
    userId,
    answers,
    fileUrl,
    fileName,
    submittedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Delete a task response
 */
export async function deleteTaskResponse(responseId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const responseRef = doc(db, 'taskResponses', responseId);
  await deleteDoc(responseRef);
}
