import { UserRole } from './user';

export interface Resource {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  visibleToRoles: UserRole[];
  uploadedBy: string;
  uploadedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceDocument {
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  visibleToRoles: UserRole[];
  uploadedBy: string;
  uploadedByName: string;
  createdAt: Date;
  updatedAt: Date;
}
