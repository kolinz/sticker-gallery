export type StickerType  = 'practical' | 'lecture';
export type StickerLevel = '実践' | '知識';
export type UserRole     = 'admin' | 'user';

export interface User {
  id:            string;
  username:      string;
  displayName?:  string;
  role:          UserRole;
  stickerCount?: number;
  createdAt?:    string;
}

export interface CurrentUser {
  id:           string;
  username:     string;
  displayName?: string;
  role:         UserRole;
}

export interface JwtPayload {
  sub:      string;
  username: string;
  role:     UserRole;
  iat:      number;
  exp:      number;
}

export interface Course {
  id:             string;
  stickerId:      string;
  name:           string;
  code?:          string;
  type?:          StickerType;
  hours?:         number;
  curriculumYear: number;
  contentNote?:   string;
  sortOrder?:     number;
}

export interface StickerCategory {
  id:       string;
  name:     string;
  areaCode: string;
  color:    string;
}

export interface Sticker {
  id:                string;
  primaryCategoryId: string;
  categories:        StickerCategory[];
  createdBy:         { id: string; displayName: string } | null;
  name:              string;
  nameEn?:           string;
  type:              StickerType;
  color:             string;
  emoji:             string;
  imageKey:          string | null;
  imageUrl:          string | null;
  description:       string;
  skills:            string[];
  level:             StickerLevel;
  version:           string;
  sortOrder?:        number;
  courses:           Course[];
  createdAt?:        string;
  updatedAt?:        string;
}

export interface Category {
  id:             string;
  name:           string;
  nameEn?:        string;
  areaCode:       string;
  emoji:          string;
  color:          string;
  imageKey:       string | null;
  imageUrl:       string | null;
  description:    string;
  targetRoles:    string[];
  recruitMessage?: string;
  sortOrder?:     number;
  stickerCount?:  number;
  createdAt?:     string;
  updatedAt?:     string;
}
