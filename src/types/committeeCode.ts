export interface CommitteeCode {
  id: string;
  code: string;
  committeeId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  maxUses: number | null; // null = unlimited
  useCount: number;
  isActive: boolean;
}

export interface CommitteeCodeDocument {
  code: string;
  committeeId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
  isActive: boolean;
}
