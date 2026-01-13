import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  ChapterProgress,
  ChapterProgressDocument,
  WatchedSegment,
  CourseProgress,
} from '@/types/progress';
import { getChapters } from './courses';

// Helper to convert Firestore timestamps to Date
function toDate(timestamp: Timestamp | Date | null): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// ============ SEGMENT UTILITIES ============

/**
 * Merge overlapping or adjacent segments
 * This is critical for accurate progress tracking
 */
export function mergeSegments(segments: WatchedSegment[]): WatchedSegment[] {
  if (segments.length === 0) return [];

  // Sort by start time
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: WatchedSegment[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // Allow 2-second gap for tolerance (buffering, etc.)
    if (current.start <= last.end + 2) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Calculate total watched seconds from segments
 */
export function calculateTotalWatched(segments: WatchedSegment[]): number {
  const merged = mergeSegments(segments);
  return merged.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
}

/**
 * Calculate watched percentage
 */
export function calculateWatchedPercentage(
  segments: WatchedSegment[],
  totalDuration: number
): number {
  if (totalDuration <= 0) return 0;
  const totalWatched = calculateTotalWatched(segments);
  return Math.min((totalWatched / totalDuration) * 100, 100);
}

/**
 * Check if a position has been watched
 */
export function isPositionWatched(segments: WatchedSegment[], position: number): boolean {
  return segments.some((seg) => position >= seg.start && position <= seg.end);
}

/**
 * Get the furthest watched position
 */
export function getMaxWatchedPosition(segments: WatchedSegment[]): number {
  if (segments.length === 0) return 0;
  return Math.max(...segments.map((seg) => seg.end));
}

// ============ PROGRESS PERSISTENCE ============

/**
 * Generate a unique progress document ID
 */
function getProgressId(enrollmentId: string, chapterId: string): string {
  return `${enrollmentId}_${chapterId}`;
}

/**
 * Get progress for a specific chapter
 */
export async function getChapterProgress(
  enrollmentId: string,
  chapterId: string
): Promise<ChapterProgress | null> {
  if (!db) throw new Error('Firestore not initialized');

  const progressId = getProgressId(enrollmentId, chapterId);
  const progressRef = doc(db, 'progress', progressId);
  const snapshot = await getDoc(progressRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data() as ChapterProgressDocument;
  return {
    id: snapshot.id,
    ...data,
    completedAt: toDate(data.completedAt as any),
    updatedAt: toDate(data.updatedAt as any) || new Date(),
  };
}

/**
 * Get all progress for an enrollment
 */
export async function getEnrollmentProgress(enrollmentId: string): Promise<ChapterProgress[]> {
  if (!db) throw new Error('Firestore not initialized');

  const progressRef = collection(db, 'progress');
  const q = query(progressRef, where('enrollmentId', '==', enrollmentId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data() as ChapterProgressDocument;
    return {
      id: doc.id,
      ...data,
      completedAt: toDate(data.completedAt as any),
      updatedAt: toDate(data.updatedAt as any) || new Date(),
    };
  });
}

/**
 * Save/update chapter progress
 */
export async function saveChapterProgress(
  enrollmentId: string,
  chapterId: string,
  courseId: string,
  studentId: string,
  segments: WatchedSegment[],
  lastPosition: number,
  chapterDuration: number
): Promise<ChapterProgress> {
  if (!db) throw new Error('Firestore not initialized');

  const progressId = getProgressId(enrollmentId, chapterId);
  const progressRef = doc(db, 'progress', progressId);

  // Get existing progress
  const existing = await getChapterProgress(enrollmentId, chapterId);

  // Merge with existing segments
  const allSegments = existing
    ? mergeSegments([...existing.watchedSegments, ...segments])
    : mergeSegments(segments);

  const totalWatchedSeconds = calculateTotalWatched(allSegments);
  const watchedPercentage = calculateWatchedPercentage(allSegments, chapterDuration);

  // Check if chapter is completed (95% threshold)
  const isCompleted = watchedPercentage >= 95;
  const completedAt = isCompleted && !existing?.isCompleted ? new Date() : existing?.completedAt || null;

  const progressData: ChapterProgressDocument = {
    enrollmentId,
    chapterId,
    courseId,
    studentId,
    watchedSegments: allSegments,
    totalWatchedSeconds,
    lastPosition: Math.max(lastPosition, existing?.lastPosition || 0),
    isCompleted,
    completedAt,
    updatedAt: new Date(),
  };

  await setDoc(progressRef, {
    ...progressData,
    completedAt: completedAt ? completedAt : null,
    updatedAt: serverTimestamp(),
  });

  return {
    id: progressId,
    ...progressData,
  };
}

/**
 * Get course-level progress summary
 */
export async function getCourseProgress(
  enrollmentId: string,
  courseId: string
): Promise<CourseProgress> {
  // Get all chapters for the course
  const chapters = await getChapters(courseId);
  const totalChapters = chapters.length;

  // Get progress for all chapters
  const chapterProgress = await getEnrollmentProgress(enrollmentId);

  // Count completed chapters
  const completedChapters = chapterProgress.filter((p) => p.isCompleted).length;

  // Calculate overall percentage
  let overallPercentage = 0;
  if (totalChapters > 0) {
    // Weight each chapter by its duration
    const totalDuration = chapters.reduce((sum, ch) => sum + ch.durationSeconds, 0);

    if (totalDuration > 0) {
      let watchedDuration = 0;
      for (const progress of chapterProgress) {
        const chapter = chapters.find((ch) => ch.id === progress.chapterId);
        if (chapter) {
          const percentage = calculateWatchedPercentage(
            progress.watchedSegments,
            chapter.durationSeconds
          );
          watchedDuration += (percentage / 100) * chapter.durationSeconds;
        }
      }
      overallPercentage = (watchedDuration / totalDuration) * 100;
    }
  }

  return {
    enrollmentId,
    courseId,
    totalChapters,
    completedChapters,
    overallPercentage,
    chapterProgress,
  };
}

/**
 * Check if course is completed (all chapters at 95%+)
 */
export async function isCourseCompleted(
  enrollmentId: string,
  courseId: string
): Promise<boolean> {
  const progress = await getCourseProgress(enrollmentId, courseId);
  return progress.completedChapters === progress.totalChapters && progress.totalChapters > 0;
}

// ============ LOCAL STORAGE HELPERS ============

const PROGRESS_STORAGE_KEY = 'ymau_progress_';

/**
 * Save progress to local storage (for offline/backup)
 */
export function saveProgressToLocalStorage(
  chapterId: string,
  segments: WatchedSegment[],
  lastPosition: number
): void {
  if (typeof window === 'undefined') return;

  const key = PROGRESS_STORAGE_KEY + chapterId;
  const data = {
    segments,
    lastPosition,
    savedAt: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Load progress from local storage
 */
export function loadProgressFromLocalStorage(
  chapterId: string
): { segments: WatchedSegment[]; lastPosition: number } | null {
  if (typeof window === 'undefined') return null;

  const key = PROGRESS_STORAGE_KEY + chapterId;
  const stored = localStorage.getItem(key);

  if (!stored) return null;

  try {
    const data = JSON.parse(stored);
    return {
      segments: data.segments || [],
      lastPosition: data.lastPosition || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Clear local progress after successful sync
 */
export function clearLocalProgress(chapterId: string): void {
  if (typeof window === 'undefined') return;

  const key = PROGRESS_STORAGE_KEY + chapterId;
  localStorage.removeItem(key);
}
