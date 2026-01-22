import { UserRole } from './user';

export type QuestionResponseType = 'text' | 'file' | 'either';

export interface TaskQuestion {
  id: string;
  text: string;
  order: number;
  responseType: QuestionResponseType; // What kind of response is expected
}

export interface Task {
  id: string;
  title: string;
  description: string;
  questions: TaskQuestion[];
  assignedRoles: UserRole[];
  dueDate: Date | null;
  allowsFileUpload: boolean;
  isPublished: boolean;
  createdBy: string;
  instructorIds: string[]; // Additional instructors with full access
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDocument {
  title: string;
  description: string;
  questions: TaskQuestion[];
  assignedRoles: UserRole[];
  dueDate: Date | null;
  allowsFileUpload: boolean;
  isPublished: boolean;
  createdBy: string;
  instructorIds: string[]; // Additional instructors with full access
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskResponseAnswer {
  questionId: string;
  answer: string;
}

export interface TaskResponse {
  id: string;
  taskId: string;
  userId: string;
  answers: TaskResponseAnswer[];
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: Date;
}

export interface TaskResponseDocument {
  taskId: string;
  userId: string;
  answers: TaskResponseAnswer[];
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: Date;
}

// Helper type for task with submission status
export interface TaskWithStatus extends Task {
  isSubmitted: boolean;
  isOverdue: boolean;
  response?: TaskResponse;
}
