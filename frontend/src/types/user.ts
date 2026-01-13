export type UserRole = 'student' | 'instructor' | 'admin';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument {
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
