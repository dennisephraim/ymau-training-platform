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
import { CourseIteration, CourseIterationDocument } from '@/types/enrollment';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

export interface BrowsableCourse extends Course {
  iterations: CourseIteration[];
}

/**
 * Get all published courses with their open iterations
 */
export async function getPublishedCourses(): Promise<BrowsableCourse[]> {
  if (!db) throw new Error('Firestore not initialized');

  // Get published courses
  const coursesRef = collection(db, 'courses');
  const coursesQuery = query(
    coursesRef,
    where('isPublished', '==', true),
    orderBy('createdAt', 'desc')
  );
  const coursesSnapshot = await getDocs(coursesQuery);

  const courses: BrowsableCourse[] = [];

  for (const courseDoc of coursesSnapshot.docs) {
    const courseData = courseDoc.data() as CourseDocument;

    // Get active iterations with open enrollment for this course
    const iterationsRef = collection(db, 'courseIterations');
    const iterationsQuery = query(
      iterationsRef,
      where('courseId', '==', courseDoc.id),
      where('isActive', '==', true),
      where('enrollmentOpen', '==', true)
    );
    const iterationsSnapshot = await getDocs(iterationsQuery);

    const iterations: CourseIteration[] = iterationsSnapshot.docs.map((iterDoc) => {
      const iterData = iterDoc.data() as CourseIterationDocument;
      return {
        id: iterDoc.id,
        ...iterData,
        startDate: toDate(iterData.startDate as any),
        endDate: toDate(iterData.endDate as any),
        createdAt: toDate(iterData.createdAt as any) || new Date(),
        updatedAt: toDate(iterData.updatedAt as any) || new Date(),
      };
    });

    // Only include courses that have at least one open iteration
    if (iterations.length > 0) {
      courses.push({
        id: courseDoc.id,
        ...courseData,
        createdAt: toDate(courseData.createdAt as any) || new Date(),
        updatedAt: toDate(courseData.updatedAt as any) || new Date(),
        iterations,
      });
    }
  }

  return courses;
}
