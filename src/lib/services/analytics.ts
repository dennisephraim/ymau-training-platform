import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Course } from '@/types/course';
import { Enrollment } from '@/types/enrollment';
import { ChapterProgress } from '@/types/progress';
import { Certificate } from '@/types/certificate';
import * as courseService from './courses';
import * as progressService from './progress';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ INSTRUCTOR ANALYTICS ============

export interface CourseAnalytics {
  course: Course;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  averageProgress: number;
  certificatesIssued: number;
}

export interface IterationAnalytics {
  iterationId: string;
  iterationName: string;
  courseId: string;
  courseName: string;
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  averageProgress: number;
  chapterStats: ChapterStat[];
}

export interface ChapterStat {
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  completedCount: number;
  averageProgress: number;
}

export interface StudentProgressSummary {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseName: string;
  iterationName: string;
  enrolledAt: Date;
  overallProgress: number;
  completedChapters: number;
  totalChapters: number;
  isCompleted: boolean;
  completedAt: Date | null;
  hasCertificate: boolean;
}

/**
 * Get analytics for all courses owned by an instructor
 */
export async function getInstructorCourseAnalytics(
  instructorId: string
): Promise<CourseAnalytics[]> {
  if (!db) throw new Error('Firestore not initialized');

  // Get all courses by instructor
  const courses = await courseService.getInstructorCourses(instructorId);

  const analytics: CourseAnalytics[] = [];

  for (const course of courses) {
    // Get enrollments for this course
    const enrollmentsRef = collection(db, 'enrollments');
    const enrollmentsQuery = query(
      enrollmentsRef,
      where('courseId', '==', course.id)
    );
    const enrollmentsSnap = await getDocs(enrollmentsQuery);

    const totalEnrollments = enrollmentsSnap.size;
    let activeEnrollments = 0;
    let completedEnrollments = 0;
    let totalProgress = 0;

    for (const doc of enrollmentsSnap.docs) {
      const enrollment = doc.data();
      if (enrollment.status === 'active') activeEnrollments++;
      if (enrollment.status === 'completed') completedEnrollments++;

      // Get progress for this enrollment
      const progress = await progressService.getCourseProgress(doc.id, course.id);
      totalProgress += progress.overallPercentage;
    }

    // Get certificates count
    const certificatesRef = collection(db, 'certificates');
    const certificatesQuery = query(
      certificatesRef,
      where('courseId', '==', course.id)
    );
    const certificatesSnap = await getDocs(certificatesQuery);

    analytics.push({
      course,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      averageProgress: totalEnrollments > 0 ? totalProgress / totalEnrollments : 0,
      certificatesIssued: certificatesSnap.size,
    });
  }

  return analytics;
}

/**
 * Get detailed analytics for a specific iteration
 */
export async function getIterationAnalytics(
  iterationId: string
): Promise<IterationAnalytics | null> {
  if (!db) throw new Error('Firestore not initialized');

  // Get iteration details
  const { getIteration } = await import('./iterations');
  const iteration = await getIteration(iterationId);
  if (!iteration) return null;

  // Get course details
  const course = await courseService.getCourse(iteration.courseId);
  if (!course) return null;

  // Get chapters
  const chapters = await courseService.getChapters(iteration.courseId);

  // Get enrollments for this iteration
  const enrollmentsRef = collection(db, 'enrollments');
  const enrollmentsQuery = query(
    enrollmentsRef,
    where('iterationId', '==', iterationId)
  );
  const enrollmentsSnap = await getDocs(enrollmentsQuery);

  let activeStudents = 0;
  let completedStudents = 0;
  let totalProgress = 0;

  // Initialize chapter stats
  const chapterStatsMap = new Map<string, { completed: number; totalProgress: number; count: number }>();
  chapters.forEach(ch => {
    chapterStatsMap.set(ch.id, { completed: 0, totalProgress: 0, count: 0 });
  });

  // Process each enrollment
  for (const doc of enrollmentsSnap.docs) {
    const enrollment = doc.data();
    if (enrollment.status === 'active') activeStudents++;
    if (enrollment.status === 'completed') completedStudents++;

    // Get progress for this enrollment
    const progress = await progressService.getCourseProgress(doc.id, iteration.courseId);
    totalProgress += progress.overallPercentage;

    // Update chapter stats
    for (const chapterProgress of progress.chapterProgress) {
      const stats = chapterStatsMap.get(chapterProgress.chapterId);
      if (stats) {
        if (chapterProgress.isCompleted) stats.completed++;
        const chapter = chapters.find(c => c.id === chapterProgress.chapterId);
        if (chapter) {
          const percentage = progressService.calculateWatchedPercentage(
            chapterProgress.watchedSegments,
            chapter.durationSeconds
          );
          stats.totalProgress += percentage;
          stats.count++;
        }
      }
    }
  }

  const totalStudents = enrollmentsSnap.size;

  // Build chapter stats array
  const chapterStats: ChapterStat[] = chapters.map(chapter => {
    const stats = chapterStatsMap.get(chapter.id) || { completed: 0, totalProgress: 0, count: 0 };
    return {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterOrder: chapter.order,
      completedCount: stats.completed,
      averageProgress: stats.count > 0 ? stats.totalProgress / stats.count : 0,
    };
  }).sort((a, b) => a.chapterOrder - b.chapterOrder);

  return {
    iterationId,
    iterationName: iteration.name,
    courseId: course.id,
    courseName: course.title,
    totalStudents,
    activeStudents,
    completedStudents,
    averageProgress: totalStudents > 0 ? totalProgress / totalStudents : 0,
    chapterStats,
  };
}

/**
 * Get student progress details for an iteration
 */
export async function getIterationStudentProgress(
  iterationId: string
): Promise<StudentProgressSummary[]> {
  if (!db) throw new Error('Firestore not initialized');

  // Get iteration and course details
  const { getIteration } = await import('./iterations');
  const iteration = await getIteration(iterationId);
  if (!iteration) return [];

  const course = await courseService.getCourse(iteration.courseId);
  if (!course) return [];

  const chapters = await courseService.getChapters(iteration.courseId);

  // Get enrollments
  const enrollmentsRef = collection(db, 'enrollments');
  const enrollmentsQuery = query(
    enrollmentsRef,
    where('iterationId', '==', iterationId),
    orderBy('enrolledAt', 'desc')
  );
  const enrollmentsSnap = await getDocs(enrollmentsQuery);

  // Get user details
  const { getUsersByIds } = await import('./users');
  const studentIds = enrollmentsSnap.docs.map(d => d.data().studentId);
  const users = await getUsersByIds(studentIds);

  // Get certificates
  const certificatesRef = collection(db, 'certificates');
  const certificatesQuery = query(
    certificatesRef,
    where('iterationId', '==', iterationId)
  );
  const certificatesSnap = await getDocs(certificatesQuery);
  const certificateEnrollmentIds = new Set(
    certificatesSnap.docs.map(d => d.data().enrollmentId)
  );

  const summaries: StudentProgressSummary[] = [];

  for (const doc of enrollmentsSnap.docs) {
    const enrollment = doc.data();
    const user = users.get(enrollment.studentId);

    // Get progress
    const progress = await progressService.getCourseProgress(doc.id, iteration.courseId);

    summaries.push({
      enrollmentId: doc.id,
      studentId: enrollment.studentId,
      studentName: user?.displayName || 'Unknown',
      studentEmail: user?.email || '',
      courseId: course.id,
      courseName: course.title,
      iterationName: iteration.name,
      enrolledAt: toDate(enrollment.enrolledAt),
      overallProgress: progress.overallPercentage,
      completedChapters: progress.completedChapters,
      totalChapters: chapters.length,
      isCompleted: enrollment.status === 'completed',
      completedAt: enrollment.completedAt ? toDate(enrollment.completedAt) : null,
      hasCertificate: certificateEnrollmentIds.has(doc.id),
    });
  }

  return summaries;
}

// ============ ADMIN ANALYTICS ============

export interface PlatformStats {
  totalUsers: number;
  studentCount: number;
  instructorCount: number;
  adminCount: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  certificatesIssued: number;
}

/**
 * Get platform-wide statistics (admin only)
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  if (!db) throw new Error('Firestore not initialized');

  // Count users by role
  const usersRef = collection(db, 'users');
  const usersSnap = await getDocs(usersRef);

  let studentCount = 0;
  let instructorCount = 0;
  let adminCount = 0;

  usersSnap.forEach(doc => {
    const role = doc.data().role;
    if (role === 'student') studentCount++;
    else if (role === 'instructor') instructorCount++;
    else if (role === 'admin') adminCount++;
  });

  // Count courses
  const coursesRef = collection(db, 'courses');
  const coursesSnap = await getDocs(coursesRef);
  let publishedCourses = 0;
  coursesSnap.forEach(doc => {
    if (doc.data().isPublished) publishedCourses++;
  });

  // Count enrollments
  const enrollmentsRef = collection(db, 'enrollments');
  const enrollmentsSnap = await getDocs(enrollmentsRef);
  let activeEnrollments = 0;
  let completedEnrollments = 0;
  enrollmentsSnap.forEach(doc => {
    const status = doc.data().status;
    if (status === 'active') activeEnrollments++;
    else if (status === 'completed') completedEnrollments++;
  });

  // Count certificates
  const certificatesRef = collection(db, 'certificates');
  const certificatesSnap = await getDocs(certificatesRef);

  return {
    totalUsers: usersSnap.size,
    studentCount,
    instructorCount,
    adminCount,
    totalCourses: coursesSnap.size,
    publishedCourses,
    totalEnrollments: enrollmentsSnap.size,
    activeEnrollments,
    completedEnrollments,
    certificatesIssued: certificatesSnap.size,
  };
}
