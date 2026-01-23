/**
 * Quiz types for chapter-end assessments
 */

export type QuestionType = 'multiple-choice' | 'true-false' | 'multiple-select';

/**
 * Option for multiple choice questions
 */
export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

/**
 * A single quiz question
 */
export interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  order: number;
  explanation?: string; // Optional explanation shown after answering
}

/**
 * Quiz settings for a chapter
 */
export interface ChapterQuizSettings {
  enabled: boolean;
  passingScore: number; // Percentage (0-100)
  questionsPerAttempt: number; // Number of questions to sample from the pool
  maxAttempts: number | null; // null = unlimited attempts
  shuffleOptions: boolean; // Whether to shuffle answer options
  showCorrectAnswers: boolean; // Show correct answers after submission
  timeLimit: number | null; // Time limit in minutes, null = no limit
}

/**
 * Quiz configuration for a chapter (stored in Firestore)
 */
export interface ChapterQuiz {
  id: string;
  chapterId: string;
  courseId: string;
  questions: QuizQuestion[];
  settings: ChapterQuizSettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterQuizDocument {
  chapterId: string;
  courseId: string;
  questions: QuizQuestion[];
  settings: ChapterQuizSettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A student's answer to a quiz question
 */
export interface QuizAnswer {
  questionId: string;
  selectedOptionIds: string[]; // Array to support multiple-select
  isCorrect: boolean;
}

/**
 * A student's quiz attempt
 */
export interface QuizAttempt {
  id: string;
  quizId: string;
  chapterId: string;
  courseId: string;
  enrollmentId: string;
  studentId: string;
  questions: QuizQuestion[]; // The specific questions shown (sampled from pool)
  answers: QuizAnswer[];
  score: number; // Percentage (0-100)
  passed: boolean;
  startedAt: Date;
  completedAt: Date | null;
  timeSpentSeconds: number;
}

export interface QuizAttemptDocument {
  quizId: string;
  chapterId: string;
  courseId: string;
  enrollmentId: string;
  studentId: string;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  score: number;
  passed: boolean;
  startedAt: Date;
  completedAt: Date | null;
  timeSpentSeconds: number;
}

/**
 * Summary of quiz progress for a chapter
 */
export interface QuizProgress {
  chapterId: string;
  totalAttempts: number;
  bestScore: number;
  passed: boolean;
  lastAttemptAt: Date | null;
}

/**
 * Default quiz settings
 */
export const DEFAULT_QUIZ_SETTINGS: ChapterQuizSettings = {
  enabled: true,
  passingScore: 70,
  questionsPerAttempt: 5,
  maxAttempts: null,
  shuffleOptions: true,
  showCorrectAnswers: true,
  timeLimit: null,
};
