export interface Committee {
  id: string;
  name: string;
  description: string;
  chairperson: string;
  languageLevel: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommitteeDocument {
  name: string;
  description: string;
  chairperson: string;
  languageLevel: string;
  createdAt: Date;
  updatedAt: Date;
}
