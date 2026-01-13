/**
 * Represents a watched segment of video
 * Segments are tracked to ensure the user actually watched the content
 */
export interface WatchedSegment {
  start: number; // Start time in seconds
  end: number;   // End time in seconds
}

/**
 * Progress tracking for a single chapter
 */
export interface ChapterProgress {
  id: string;
  enrollmentId: string;
  chapterId: string;
  courseId: string;
  studentId: string;
  watchedSegments: WatchedSegment[];
  totalWatchedSeconds: number;
  lastPosition: number;
  isCompleted: boolean;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface ChapterProgressDocument {
  enrollmentId: string;
  chapterId: string;
  courseId: string;
  studentId: string;
  watchedSegments: WatchedSegment[];
  totalWatchedSeconds: number;
  lastPosition: number;
  isCompleted: boolean;
  completedAt: Date | null;
  updatedAt: Date;
}

/**
 * Course-level progress summary
 */
export interface CourseProgress {
  enrollmentId: string;
  courseId: string;
  totalChapters: number;
  completedChapters: number;
  overallPercentage: number;
  chapterProgress: ChapterProgress[];
}
