export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  chapterCount: number;
  totalDurationSeconds: number;
}

export interface CourseDocument {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  chapterCount: number;
  totalDurationSeconds: number;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  videoUrl: string | null;
  videoPath: string | null; // Storage path for generating signed URLs
  durationSeconds: number;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterDocument {
  title: string;
  description: string;
  order: number;
  videoUrl: string | null;
  videoPath: string | null;
  durationSeconds: number;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseWithChapters extends Course {
  chapters: Chapter[];
}
