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
import {
  Course,
  CourseDocument,
  Chapter,
  ChapterDocument,
  CourseWithChapters,
} from '@/types/course';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ COURSES ============

export async function getCourses(): Promise<Course[]> {
  if (!db) throw new Error('Firestore not initialized');

  const coursesRef = collection(db, 'courses');
  const q = query(coursesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as CourseDocument;
    return {
      id: doc.id,
      ...data,
      instructorIds: data.instructorIds || [],
      createdAt: toDate(data.createdAt as any),
      updatedAt: toDate(data.updatedAt as any),
    };
  });
}

export async function getCourse(courseId: string): Promise<Course | null> {
  if (!db) throw new Error('Firestore not initialized');

  const courseRef = doc(db, 'courses', courseId);
  const snapshot = await getDoc(courseRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as CourseDocument;
  return {
    id: snapshot.id,
    ...data,
    instructorIds: data.instructorIds || [],
    createdAt: toDate(data.createdAt as any),
    updatedAt: toDate(data.updatedAt as any),
  };
}

/**
 * Get courses where user is creator OR in instructorIds array
 */
export async function getInstructorCourses(instructorId: string): Promise<Course[]> {
  if (!db) throw new Error('Firestore not initialized');

  const coursesRef = collection(db, 'courses');
  
  // Query for courses where user is the creator
  const creatorQuery = query(
    coursesRef,
    where('createdBy', '==', instructorId),
    orderBy('createdAt', 'desc')
  );
  
  // Query for courses where user is in instructorIds
  const instructorQuery = query(
    coursesRef,
    where('instructorIds', 'array-contains', instructorId),
    orderBy('createdAt', 'desc')
  );

  const [creatorSnapshot, instructorSnapshot] = await Promise.all([
    getDocs(creatorQuery),
    getDocs(instructorQuery),
  ]);

  // Merge and deduplicate results
  const courseMap = new Map<string, Course>();
  
  const processDocs = (docs: typeof creatorSnapshot.docs) => {
    docs.forEach((doc) => {
      if (!courseMap.has(doc.id)) {
        const data = doc.data() as CourseDocument;
        courseMap.set(doc.id, {
          id: doc.id,
          ...data,
          instructorIds: data.instructorIds || [],
          createdAt: toDate(data.createdAt as any),
          updatedAt: toDate(data.updatedAt as any),
        });
      }
    });
  };

  processDocs(creatorSnapshot.docs);
  processDocs(instructorSnapshot.docs);

  // Sort by createdAt descending
  return Array.from(courseMap.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * Check if a user has instructor access to a course
 */
export function hasInstructorAccess(course: Course, userId: string): boolean {
  return course.createdBy === userId || course.instructorIds.includes(userId);
}

export async function getCourseWithChapters(courseId: string): Promise<CourseWithChapters | null> {
  if (!db) throw new Error('Firestore not initialized');

  const course = await getCourse(courseId);
  if (!course) return null;

  const chapters = await getChapters(courseId);

  return {
    ...course,
    chapters,
  };
}

export async function createCourse(
  data: Omit<CourseDocument, 'createdAt' | 'updatedAt' | 'chapterCount' | 'totalDurationSeconds' | 'enrolledCount'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const coursesRef = collection(db, 'courses');
  const docRef = await addDoc(coursesRef, {
    ...data,
    instructorIds: data.instructorIds || [],
    chapterCount: 0,
    totalDurationSeconds: 0,
    enrolledCount: 0,
    enrollmentOpen: data.enrollmentOpen ?? false,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    maxStudents: data.maxStudents ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateCourse(
  courseId: string,
  data: Partial<Omit<CourseDocument, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const courseRef = doc(db, 'courses', courseId);
  await updateDoc(courseRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCourse(courseId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const batch = writeBatch(db);

  // Delete all chapters first
  const chapters = await getChapters(courseId);
  for (const chapter of chapters) {
    const chapterRef = doc(db, 'courses', courseId, 'chapters', chapter.id);
    batch.delete(chapterRef);
  }

  // Delete all enrollments for this course
  const enrollmentsRef = collection(db, 'enrollments');
  const enrollmentsQuery = query(enrollmentsRef, where('courseId', '==', courseId));
  const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
  for (const enrollmentDoc of enrollmentsSnapshot.docs) {
    batch.delete(enrollmentDoc.ref);
  }

  // Delete all enrollment codes for this course
  const codesRef = collection(db, 'enrollmentCodes');
  const codesQuery = query(codesRef, where('courseId', '==', courseId));
  const codesSnapshot = await getDocs(codesQuery);
  for (const codeDoc of codesSnapshot.docs) {
    batch.delete(codeDoc.ref);
  }

  // Delete all progress records for this course
  const progressRef = collection(db, 'progress');
  const progressQuery = query(progressRef, where('courseId', '==', courseId));
  const progressSnapshot = await getDocs(progressQuery);
  for (const progressDoc of progressSnapshot.docs) {
    batch.delete(progressDoc.ref);
  }

  // Delete the course itself
  const courseRef = doc(db, 'courses', courseId);
  batch.delete(courseRef);

  await batch.commit();
}

// ============ CHAPTERS ============

export async function getChapters(courseId: string): Promise<Chapter[]> {
  if (!db) throw new Error('Firestore not initialized');

  const chaptersRef = collection(db, 'courses', courseId, 'chapters');
  const q = query(chaptersRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as ChapterDocument;
    return {
      id: doc.id,
      courseId,
      ...data,
      createdAt: toDate(data.createdAt as any),
      updatedAt: toDate(data.updatedAt as any),
    };
  });
}

export async function getChapter(courseId: string, chapterId: string): Promise<Chapter | null> {
  if (!db) throw new Error('Firestore not initialized');

  const chapterRef = doc(db, 'courses', courseId, 'chapters', chapterId);
  const snapshot = await getDoc(chapterRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as ChapterDocument;
  return {
    id: snapshot.id,
    courseId,
    ...data,
    createdAt: toDate(data.createdAt as any),
    updatedAt: toDate(data.updatedAt as any),
  };
}

export async function createChapter(
  courseId: string,
  data: Omit<ChapterDocument, 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const chaptersRef = collection(db, 'courses', courseId, 'chapters');
  const docRef = await addDoc(chaptersRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update course chapter count and total duration
  await updateCourseStats(courseId);

  return docRef.id;
}

export async function updateChapter(
  courseId: string,
  chapterId: string,
  data: Partial<Omit<ChapterDocument, 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const chapterRef = doc(db, 'courses', courseId, 'chapters', chapterId);
  await updateDoc(chapterRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  // Update course stats if duration changed
  if ('durationSeconds' in data) {
    await updateCourseStats(courseId);
  }
}

export async function deleteChapter(courseId: string, chapterId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const chapterRef = doc(db, 'courses', courseId, 'chapters', chapterId);
  await deleteDoc(chapterRef);

  // Update course chapter count
  await updateCourseStats(courseId);
}

export async function reorderChapters(
  courseId: string,
  chapterIds: string[]
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const firestore = db; // TypeScript narrowing
  const batch = writeBatch(firestore);

  chapterIds.forEach((chapterId, index) => {
    const chapterRef = doc(firestore, 'courses', courseId, 'chapters', chapterId);
    batch.update(chapterRef, {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

// Helper to update course stats
async function updateCourseStats(courseId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const chapters = await getChapters(courseId);
  const chapterCount = chapters.length;
  const totalDurationSeconds = chapters.reduce((sum, ch) => sum + ch.durationSeconds, 0);

  const courseRef = doc(db, 'courses', courseId);
  await updateDoc(courseRef, {
    chapterCount,
    totalDurationSeconds,
    updatedAt: serverTimestamp(),
  });
}

// ============ COURSE DUPLICATION ============

export async function duplicateCourse(
  courseId: string,
  newTitle: string,
  createdBy: string
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  // Get the original course
  const originalCourse = await getCourse(courseId);
  if (!originalCourse) throw new Error('Course not found');

  // Get original chapters
  const originalChapters = await getChapters(courseId);

  // Create the new course (with fresh enrollment data)
  const newCourseId = await createCourse({
    title: newTitle,
    description: originalCourse.description,
    thumbnailUrl: originalCourse.thumbnailUrl,
    createdBy,
    instructorIds: [], // Start with no co-instructors
    isPublished: false, // Start unpublished
    enrollmentOpen: false,
    startDate: null,
    endDate: null,
    maxStudents: null,
  });

  // Duplicate chapters
  const batch = writeBatch(db);
  for (const chapter of originalChapters) {
    const newChapterRef = doc(collection(db, 'courses', newCourseId, 'chapters'));
    batch.set(newChapterRef, {
      title: chapter.title,
      description: chapter.description,
      order: chapter.order,
      videoUrl: chapter.videoUrl, // Reference same video
      videoPath: chapter.videoPath,
      durationSeconds: chapter.durationSeconds,
      thumbnailUrl: chapter.thumbnailUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();

  // Update new course stats
  await updateCourseStats(newCourseId);

  return newCourseId;
}
