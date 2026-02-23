import { UserRole } from './user';

export interface Resource {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  folderId: string | null;
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
  folderId: string | null;
  visibleToRoles: UserRole[];
  uploadedBy: string;
  uploadedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceFolder {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  visibleToRoles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceFolderDocument {
  name: string;
  description: string;
  createdBy: string;
  visibleToRoles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}
