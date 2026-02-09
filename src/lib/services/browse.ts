import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Course, CourseDocument } from '@/types/course';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

export type BrowsableCourse = Course;

/**
 * Get all published courses with open enrollment
 */
export async function getPublishedCourses(): Promise<BrowsableCourse[]> {
  if (!db) throw new Error('Firestore not initialized');

  // Get published courses with enrollment open
  const coursesRef = collection(db, 'courses');
  const coursesQuery = query(
    coursesRef,
    where('isPublished', '==', true),
    where('enrollmentOpen', '==', true),
    orderBy('createdAt', 'desc')
  );
  const coursesSnapshot = await getDocs(coursesQuery);

  const courses: BrowsableCourse[] = coursesSnapshot.docs.map((courseDoc) => {
    const courseData = courseDoc.data() as CourseDocument;
    return {
      id: courseDoc.id,
      ...courseData,
      createdAt: toDate(courseData.createdAt as Timestamp | Date) || new Date(),
      updatedAt: toDate(courseData.updatedAt as Timestamp | Date) || new Date(),
      startDate: toDate(courseData.startDate as Timestamp | Date),
      endDate: toDate(courseData.endDate as Timestamp | Date),
    };
  });

  return courses;
}

/**
 * Get all published courses (regardless of enrollment status)
 */
export async function getAllPublishedCourses(): Promise<BrowsableCourse[]> {
  if (!db) throw new Error('Firestore not initialized');

  const coursesRef = collection(db, 'courses');
  const coursesQuery = query(
    coursesRef,
    where('isPublished', '==', true),
    orderBy('createdAt', 'desc')
  );
  const coursesSnapshot = await getDocs(coursesQuery);

  const courses: BrowsableCourse[] = coursesSnapshot.docs.map((courseDoc) => {
    const courseData = courseDoc.data() as CourseDocument;
    return {
      id: courseDoc.id,
      ...courseData,
      createdAt: toDate(courseData.createdAt as Timestamp | Date) || new Date(),
      updatedAt: toDate(courseData.updatedAt as Timestamp | Date) || new Date(),
      startDate: toDate(courseData.startDate as Timestamp | Date),
      endDate: toDate(courseData.endDate as Timestamp | Date),
    };
  });

  return courses;
}
