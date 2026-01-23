export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  createdBy: string;
  instructorIds: string[]; // Additional instructors with full access
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  chapterCount: number;
  totalDurationSeconds: number;
  // Enrollment settings (moved from iteration concept)
  enrollmentOpen: boolean;
  startDate: Date | null;
  endDate: Date | null;
  maxStudents: number | null; // null = unlimited
  enrolledCount: number;
}

export interface CourseDocument {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  createdBy: string;
  instructorIds: string[]; // Additional instructors with full access
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  chapterCount: number;
  totalDurationSeconds: number;
  // Enrollment settings
  enrollmentOpen: boolean;
  startDate: Date | null;
  endDate: Date | null;
  maxStudents: number | null;
  enrolledCount: number;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  contentType: 'video' | 'text'; // Type of chapter content
  videoUrl: string | null;
  videoPath: string | null; // Storage path for generating signed URLs
  textContent: string | null; // Rich text content for text chapters
  durationSeconds: number; // For video chapters; estimated read time for text
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterDocument {
  title: string;
  description: string;
  order: number;
  contentType: 'video' | 'text';
  videoUrl: string | null;
  videoPath: string | null;
  textContent: string | null;
  durationSeconds: number;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseWithChapters extends Course {
  chapters: Chapter[];
}
