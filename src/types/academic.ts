/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PriorityLevel = 'high' | 'medium' | 'low' | 'none';

export type ChapterStatus = 'completed' | 'in_progress' | 'pending' | 'skipped';

export interface AcademicTask {
  id: string;
  trackId?: string;
  programId?: string;
  subjectId: string;
  chapterId?: string;
  title: string;
  completed: boolean;
  priority?: PriorityLevel;
  dueDate?: string;
  createdAt: string;
}

export interface Track {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface Program {
  id: string;
  trackId: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface Subject {
  id: string;
  trackId: string;
  programId: string;
  name: string;
  priority?: PriorityLevel;
  order: number;
  createdAt: string;
}

export interface Chapter {
  id: string;
  trackId: string;
  programId: string;
  subjectId: string;
  chapterNumber: string; // e.g., "1" or "Chapter 1"
  title: string;         // Topic Name (defaults to "Chapter <no>")
  topicName?: string;    // Topic Name (defaults to "Chapter <no>")
  priority?: PriorityLevel;
  status?: ChapterStatus;
  completed?: boolean;
  isSkipped?: boolean;
  order: number;
  createdAt: string;
}

export interface ChapterCompletionRecord {
  id: string;
  chapterId: string;
  trackId: string;
  programId: string;
  subjectId: string;
  chapterNumber: string;
  chapterTitle: string;
  topicName?: string;
  completedAt: string; // ISO 8601 string
  updatedAt?: string;
}

export interface AcademicHierarchyData {
  tracks: Track[];
  programs: Program[];
  subjects: Subject[];
  chapters: Chapter[];
  tasks?: AcademicTask[];
  completionRecords?: ChapterCompletionRecord[];
  lastModified?: string;
  version?: number;
}
