/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Track, 
  Program, 
  Subject, 
  Chapter, 
  PriorityLevel, 
  ChapterStatus,
  AcademicTask,
  ChapterCompletionRecord,
  AcademicHierarchyData 
} from '../types/academic';
import { useAuthSync } from './AuthSyncContext';
import { 
  getActiveUserId, 
  recordDeletion, 
  recordDeletions, 
  isItemDeleted, 
  filterDeletedItems 
} from '../lib/tombstones';

export function parseChapterNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') {
    return isNaN(val) || val <= 0 ? 0 : Math.floor(val);
  }
  const str = String(val).trim();
  if (!str) return 0;

  // Negative numbers are invalid
  if (str.startsWith('-')) return 0;

  // Direct number check
  const directNum = Number(str);
  if (!isNaN(directNum)) {
    return Number.isInteger(directNum) && directNum > 0 ? directNum : 0;
  }

  // Extract first contiguous sequence of digits
  const match = str.match(/\d+/);
  if (match) {
    const parsed = parseInt(match[0], 10);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }
  return 0;
}

export function sortChaptersNumerically<T extends { chapterNumber?: string; chapterNo?: number | string; subjectId?: string; id?: string }>(chaptersList: T[]): T[] {
  return [...chaptersList].sort((a, b) => {
    // If chapters belong to different subjects, group by subjectId
    if (a.subjectId && b.subjectId && a.subjectId !== b.subjectId) {
      return a.subjectId.localeCompare(b.subjectId);
    }
    const valA = a.chapterNumber !== undefined ? a.chapterNumber : a.chapterNo;
    const valB = b.chapterNumber !== undefined ? b.chapterNumber : b.chapterNo;
    const numA = parseChapterNumber(valA);
    const numB = parseChapterNumber(valB);
    if (numA !== numB) {
      return numA - numB;
    }
    return (a.id || '').localeCompare(b.id || '');
  });
}

export function getNextAvailableChapterNumber(chaptersInSubject: Chapter[]): number {
  const existingNumbers = new Set(
    chaptersInSubject.map(c => parseChapterNumber(c.chapterNumber)).filter(n => n > 0)
  );
  let candidate = 1;
  while (existingNumbers.has(candidate)) {
    candidate++;
  }
  return candidate;
}

/**
 * Resolves the display topic name for a chapter.
 * If user gave a custom topic name, displays it.
 * If default/empty/named "Chapter <no>", returns "Topic <no>" (e.g. Chapter 1 -> Topic 1, Chapter 2 -> Topic 2).
 */
export function getChapterTopicDisplay(chap: { chapterNumber?: string | number; title?: string; topicName?: string }): string {
  const num = chap.chapterNumber !== undefined ? String(chap.chapterNumber) : '';
  const customTopic = (chap.topicName || chap.title || '').trim();
  if (
    !customTopic ||
    customTopic.toLowerCase() === `chapter ${num}`.toLowerCase() ||
    customTopic.toLowerCase() === `ch ${num}`.toLowerCase() ||
    customTopic.toLowerCase() === `ch. ${num}`.toLowerCase()
  ) {
    return `Topic ${num}`;
  }
  return customTopic;
}

export function normalizeChapterTopic(chap: Chapter): Chapter {
  const num = chap.chapterNumber;
  const rawTitle = (chap.title || '').trim();
  const rawTopic = (chap.topicName || '').trim();

  const isDefaultChapterPattern = (val: string) =>
    !val ||
    val.toLowerCase() === `chapter ${num}`.toLowerCase() ||
    val.toLowerCase() === `ch ${num}`.toLowerCase() ||
    val.toLowerCase() === `ch. ${num}`.toLowerCase();

  const finalTitle = isDefaultChapterPattern(rawTitle) ? `Topic ${num}` : rawTitle;
  const finalTopic = isDefaultChapterPattern(rawTopic) ? finalTitle : rawTopic;

  return {
    ...chap,
    title: finalTitle,
    topicName: finalTopic,
  };
}

const STORAGE_KEY = 'x29_academic_hierarchy';

export function createEmptyHierarchy(): AcademicHierarchyData {
  return {
    tracks: [],
    programs: [],
    subjects: [],
    chapters: [],
    tasks: [],
    completionRecords: [],
    lastModified: new Date().toISOString(),
    version: 1,
  };
}

interface AcademicHierarchyContextType {
  tracks: Track[];
  programs: Program[];
  subjects: Subject[];
  chapters: Chapter[];
  tasks: AcademicTask[];
  completionRecords: ChapterCompletionRecord[];
  
  // Track operations
  createTrack: (name: string) => { success: boolean; error?: string; track?: Track };
  renameTrack: (id: string, newName: string) => { success: boolean; error?: string };
  deleteTrack: (id: string) => { success: boolean };
  reorderTracks: (orderedTracks: Track[]) => void;
  
  // Program operations
  createProgram: (trackId: string, name: string) => { success: boolean; error?: string; program?: Program };
  renameProgram: (id: string, newName: string) => { success: boolean; error?: string };
  deleteProgram: (id: string) => { success: boolean };
  
  // Subject operations
  createSubject: (trackId: string, programId: string, name: string, priority?: PriorityLevel) => { success: boolean; error?: string; subject?: Subject };
  createSubjectWithChapters: (
    trackId: string,
    programId: string,
    name: string,
    chaptersList: Array<{
      chapterNumber?: string;
      title: string;
      topicName?: string;
      priority?: PriorityLevel;
    }>,
    priority?: PriorityLevel
  ) => { success: boolean; error?: string; subject?: Subject; createdChapters?: Chapter[]; chaptersCount?: number };
  renameSubject: (id: string, newName: string) => { success: boolean; error?: string };
  updateSubject: (
    id: string,
    updates: {
      name?: string;
      trackId?: string;
      programId?: string;
      priority?: PriorityLevel;
    }
  ) => { success: boolean; error?: string; subject?: Subject };
  setSubjectPriority: (id: string, priority: PriorityLevel) => void;
  deleteSubject: (id: string) => { success: boolean };
  
  // Chapter operations
  createChapter: (
    trackId: string, 
    programId: string, 
    subjectId: string, 
    chapterNumber: string, 
    title?: string, 
    topicName?: string,
    priority?: PriorityLevel
  ) => { success: boolean; error?: string; chapter?: Chapter };
  renameChapter: (id: string, chapterNumber: string, title: string) => { success: boolean; error?: string };
  updateChapter: (
    id: string,
    updates: {
      chapterNumber?: string;
      title?: string;
      topicName?: string;
      priority?: PriorityLevel;
      status?: ChapterStatus;
      completed?: boolean;
      isSkipped?: boolean;
      targetSubjectId?: string;
    }
  ) => { success: boolean; error?: string };
  toggleChapterSkip: (id: string) => { success: boolean; error?: string };
  setChapterPriority: (id: string, priority: PriorityLevel) => void;
  deleteChapter: (id: string) => { success: boolean };
  setChapterStatus: (id: string, status: ChapterStatus) => void;
  setChaptersStatus: (ids: string[], status: ChapterStatus) => void;
  toggleChapterCompletion: (id: string) => void;
  toggleSubjectCompletion: (subjectId: string, markComplete?: boolean) => { success: boolean; completed?: boolean; affectedCount?: number; error?: string };
  updateCompletionRecord: (recordId: string, completedAt: string) => { success: boolean; error?: string };
  
  // Subject Pass/Freeze Chapter Auto-Completion Operations
  freezeSubjectChapters: (subjectId: string) => string[];
  unfreezeSubjectChapters: (subjectId: string, autoCompletedChapterIds?: string[]) => void;
  freezeSubjectsBatch: (subjectIds: string[]) => Record<string, string[]>;
  unfreezeSubjectsBatch: (records: Record<string, string[]>) => void;
  
  // Topic Name operation (belongs directly to a Chapter)
  updateTopicName: (chapterId: string, topicName: string) => { success: boolean; error?: string };
  
  // Associated Task operations
  createTask: (
    subjectId: string,
    title: string,
    options?: { chapterId?: string; priority?: PriorityLevel; dueDate?: string }
  ) => { success: boolean; error?: string; task?: AcademicTask };
  toggleTaskCompletion: (id: string) => void;
  deleteTask: (id: string) => void;
  getTasksBySubject: (subjectId: string) => AcademicTask[];

  // Hierarchy Management
  resetHierarchy: () => void;
  exportHierarchy: () => string;
  importHierarchy: (jsonString: string) => { success: boolean; error?: string };
  
  // Filter helpers
  getProgramsByTrack: (trackId: string) => Program[];
  getSubjectsByProgram: (programId: string) => Subject[];
  getChaptersBySubject: (subjectId: string) => Chapter[];
  getChapterById: (chapterId: string) => Chapter | undefined;
}

const AcademicHierarchyContext = createContext<AcademicHierarchyContextType | null>(null);

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

export function getHierarchyStorageKey(userId?: string | null): string {
  return userId ? `x29_academic_hierarchy_${userId}` : 'x29_academic_hierarchy';
}

export function updateGlobalAppState(partial: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { AppState: Record<string, unknown> };
    w.AppState = {
      ...(w.AppState || {}),
      ...partial,
      updatedAt: new Date().toISOString(),
    };
  }
}

function getStoredLocalData(userId?: string | null): AcademicHierarchyData {
  const effectiveUid = userId !== undefined ? userId : getActiveUserId();
  try {
    const key = getHierarchyStorageKey(effectiveUid);
    let raw = localStorage.getItem(key);
    if (!raw && effectiveUid) {
      // Fallback to legacy un-scoped key if user key is empty
      raw = localStorage.getItem('x29_academic_hierarchy');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tracks) && Array.isArray(parsed.programs) && Array.isArray(parsed.subjects) && Array.isArray(parsed.chapters)) {
        // Sanitize existing items through tombstone registry
        const sanitizedTracks = filterDeletedItems<Track>(parsed.tracks, effectiveUid);
        const validTrackIds = new Set(sanitizedTracks.map((t: Track) => t.id));

        const sanitizedPrograms = filterDeletedItems<Program>(parsed.programs, effectiveUid)
          .filter((p: Program) => validTrackIds.has(p.trackId));
        const validProgramIds = new Set(sanitizedPrograms.map((p: Program) => p.id));

        const sanitizedSubjects = filterDeletedItems<Subject>(parsed.subjects, effectiveUid)
          .filter((s: Subject) => validProgramIds.has(s.programId));
        const validSubjectIds = new Set(sanitizedSubjects.map((s: Subject) => s.id));

        const sanitizedChapters = filterDeletedItems<Chapter>(parsed.chapters, effectiveUid)
          .filter((c: Chapter) => validSubjectIds.has(c.subjectId));
        const validChapterIds = new Set(sanitizedChapters.map((c: Chapter) => c.id));

        const sanitizedTasks = filterDeletedItems<AcademicTask>(Array.isArray(parsed.tasks) ? parsed.tasks : [], effectiveUid)
          .filter((t: AcademicTask) => validSubjectIds.has(t.subjectId) && (!t.chapterId || validChapterIds.has(t.chapterId)));

        const rawRecords: ChapterCompletionRecord[] = filterDeletedItems<ChapterCompletionRecord>(Array.isArray(parsed.completionRecords) ? parsed.completionRecords : [], effectiveUid)
          .filter((r: ChapterCompletionRecord) => validChapterIds.has(r.chapterId) && !isItemDeleted(r.chapterId, effectiveUid));
        const recordChapterIds = new Set(rawRecords.map((r: ChapterCompletionRecord) => r.chapterId));
        const missingRecords: ChapterCompletionRecord[] = [];

        sanitizedChapters.forEach((c: Chapter) => {
          if (!c.isSkipped && c.status !== 'skipped' && (c.completed || c.status === 'completed') && !recordChapterIds.has(c.id) && !isItemDeleted(c.id, effectiveUid)) {
            missingRecords.push({
              id: generateId(),
              chapterId: c.id,
              trackId: c.trackId,
              programId: c.programId,
              subjectId: c.subjectId,
              chapterNumber: String(c.chapterNumber || ''),
              chapterTitle: c.title || `Chapter ${c.chapterNumber}`,
              topicName: getChapterTopicDisplay(c),
              completedAt: c.createdAt || new Date().toISOString(),
            });
            recordChapterIds.add(c.id);
          }
        });

        return {
          ...parsed,
          tracks: sanitizedTracks,
          programs: sanitizedPrograms,
          subjects: sanitizedSubjects,
          chapters: sortChaptersNumerically(sanitizedChapters.map(normalizeChapterTopic)),
          tasks: sanitizedTasks,
          completionRecords: [...rawRecords, ...missingRecords],
        };
      }
    }
  } catch {
    // Ignore parse error
  }

  // No stored data — return empty hierarchy
  return createEmptyHierarchy();
}

export const AcademicHierarchyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, appData, updateAppData, isCloudLoaded } = useAuthSync();
  const [data, setData] = useState<AcademicHierarchyData>(() => getStoredLocalData(user?.uid || getActiveUserId()));
  const dataRef = useRef<AcademicHierarchyData>(data);
  const lastPushedJsonRef = useRef<string>('');

  // Keep dataRef constantly synchronized
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // On user change/auth resolution: hydrate from user-scoped storage
  useEffect(() => {
    const effectiveUid = user?.uid || getActiveUserId();
    const userLocal = getStoredLocalData(effectiveUid);
    setData(userLocal);
    dataRef.current = userLocal;
  }, [user?.uid]);

  // Sync state to localStorage and cloud on every change
  const persistState = useCallback((nextData: AcademicHierarchyData, isImmediate: boolean = false) => {
    const effectiveUid = user?.uid || getActiveUserId();
    dataRef.current = nextData;
    setData(nextData);
    updateGlobalAppState({
      tracks: nextData.tracks,
      programs: nextData.programs,
      subjects: nextData.subjects,
      chapters: nextData.chapters,
      tasks: nextData.tasks || [],
      completionRecords: nextData.completionRecords || [],
      lastModified: nextData.lastModified,
    });

    try {
      const key = getHierarchyStorageKey(effectiveUid);
      localStorage.setItem(key, JSON.stringify(nextData));
      // Also update unscoped fallback so stale deleted records are never kept
      localStorage.setItem('x29_academic_hierarchy', JSON.stringify(nextData));
    } catch {
      // Ignore quota error
    }

    // If authenticated, also persist to Firestore cloud sync
    if (user || effectiveUid) {
      const nextJson = JSON.stringify(nextData);
      if (nextJson !== lastPushedJsonRef.current) {
        lastPushedJsonRef.current = nextJson;
        updateAppData({ academicHierarchy: nextData }, { immediate: isImmediate, section: 'academicHierarchy' });
      }
    }
  }, [user, updateAppData]);

  // Ensure window.AppState is set on mount / data change
  useEffect(() => {
    updateGlobalAppState({
      tracks: data.tracks,
      programs: data.programs,
      subjects: data.subjects,
      chapters: data.chapters,
      tasks: data.tasks || [],
      completionRecords: data.completionRecords || [],
      lastModified: data.lastModified,
    });
  }, [data]);

  // When remote cloud data changes (e.g., from Firestore on another device or initial login)
  useEffect(() => {
    if (appData?.academicHierarchy) {
      const effectiveUid = user?.uid || getActiveUserId();
      const remote = appData.academicHierarchy;
      if (
        Array.isArray(remote.tracks) &&
        Array.isArray(remote.programs) &&
        Array.isArray(remote.subjects) &&
        Array.isArray(remote.chapters)
      ) {
        const sortedData: AcademicHierarchyData = {
          ...remote,
          tracks: filterDeletedItems<Track>(remote.tracks, effectiveUid),
          programs: filterDeletedItems<Program>(remote.programs, effectiveUid),
          subjects: filterDeletedItems<Subject>(remote.subjects, effectiveUid),
          chapters: sortChaptersNumerically(filterDeletedItems<Chapter>(remote.chapters, effectiveUid).map(normalizeChapterTopic)),
          tasks: filterDeletedItems<AcademicTask>(Array.isArray(remote.tasks) ? remote.tasks : [], effectiveUid),
          completionRecords: filterDeletedItems<ChapterCompletionRecord>(Array.isArray(remote.completionRecords) ? remote.completionRecords : [], effectiveUid),
        };
        const remoteJson = JSON.stringify(sortedData);
        // Ignore echo of what we just pushed
        if (remoteJson === lastPushedJsonRef.current) {
          return;
        }

        lastPushedJsonRef.current = remoteJson;
        setData(sortedData);
        updateGlobalAppState({
          tracks: sortedData.tracks,
          programs: sortedData.programs,
          subjects: sortedData.subjects,
          chapters: sortedData.chapters,
          tasks: sortedData.tasks || [],
          completionRecords: sortedData.completionRecords || [],
          lastModified: sortedData.lastModified,
        });

        try {
          const key = getHierarchyStorageKey(effectiveUid);
          localStorage.setItem(key, JSON.stringify(sortedData));
          localStorage.setItem('x29_academic_hierarchy', JSON.stringify(sortedData));
        } catch {
          // Ignore
        }
      }
    }
  }, [appData?.academicHierarchy, user?.uid]);

  // ==================== TRACK OPERATIONS ====================
  const createTrack = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Track name cannot be empty.' };
    }
    // Check if track name already exists (case-insensitive)
    const exists = data.tracks.some(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: false, error: 'A track with this name already exists.' };
    }

    const newTrack: Track = {
      id: generateId(),
      name: trimmed,
      order: data.tracks.length,
      createdAt: new Date().toISOString(),
    };

    const nextData: AcademicHierarchyData = {
      ...data,
      tracks: [...data.tracks, newTrack],
      lastModified: new Date().toISOString(),
    };
    persistState(nextData);
    return { success: true, track: newTrack };
  }, [data, persistState]);

  const renameTrack = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { success: false, error: 'Track name cannot be empty.' };
    }
    const duplicate = data.tracks.some(t => t.id !== id && t.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      return { success: false, error: 'Another track with this name already exists.' };
    }

    const nextTracks = data.tracks.map(t => t.id === id ? { ...t, name: trimmed } : t);
    const nextData: AcademicHierarchyData = {
      ...data,
      tracks: nextTracks,
      lastModified: new Date().toISOString(),
    };
    persistState(nextData);
    return { success: true };
  }, [data, persistState]);

  const deleteTrack = useCallback((id: string) => {
    const effectiveUid = user?.uid || getActiveUserId();
    recordDeletion(id, 'track', effectiveUid);

    // Cascading deletion: remove Track, and all Programs, Subjects, Chapters belonging to it
    const nextTracks = data.tracks.filter(t => t.id !== id);
    const affectedProgIds = data.programs.filter(p => p.trackId === id).map(p => p.id);
    recordDeletions(affectedProgIds, 'program', effectiveUid);

    const nextPrograms = data.programs.filter(p => p.trackId !== id);
    const affectedSubjIds = data.subjects.filter(s => s.trackId === id || affectedProgIds.includes(s.programId)).map(s => s.id);
    recordDeletions(affectedSubjIds, 'subject', effectiveUid);

    const nextSubjects = data.subjects.filter(s => s.trackId !== id && !affectedProgIds.includes(s.programId));
    const affectedChapIds = data.chapters.filter(c => c.trackId === id || affectedSubjIds.includes(c.subjectId)).map(c => c.id);
    recordDeletions(affectedChapIds, 'chapter', effectiveUid);

    const nextChapters = data.chapters.filter(c => c.trackId !== id && !affectedSubjIds.includes(c.subjectId));
    const nextRecords = (data.completionRecords || []).filter(r => r.trackId !== id && !affectedSubjIds.includes(r.subjectId));
    const nextTasks = (data.tasks || []).filter(t => t.trackId !== id && !affectedSubjIds.includes(t.subjectId));

    const nextData: AcademicHierarchyData = {
      ...data,
      tracks: nextTracks,
      programs: nextPrograms,
      subjects: nextSubjects,
      chapters: nextChapters,
      tasks: nextTasks,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    };
    persistState(nextData, true);
    return { success: true };
  }, [data, persistState, user?.uid]);

  const reorderTracks = useCallback((orderedTracks: Track[]) => {
    const updated = orderedTracks.map((t, idx) => ({ ...t, order: idx }));
    persistState({
      ...data,
      tracks: updated,
      lastModified: new Date().toISOString(),
    });
  }, [data, persistState]);

  // ==================== PROGRAM OPERATIONS ====================
  const createProgram = useCallback((trackId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Program name cannot be empty.' };
    }
    const trackExists = data.tracks.some(t => t.id === trackId);
    if (!trackExists) {
      return { success: false, error: 'Selected Track does not exist.' };
    }
    // Check duplicate program name in same track
    const exists = data.programs.some(p => p.trackId === trackId && p.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: false, error: 'A program with this name already exists in this track.' };
    }

    const newProgram: Program = {
      id: generateId(),
      trackId,
      name: trimmed,
      order: data.programs.filter(p => p.trackId === trackId).length,
      createdAt: new Date().toISOString(),
    };

    const nextData: AcademicHierarchyData = {
      ...data,
      programs: [...data.programs, newProgram],
      lastModified: new Date().toISOString(),
    };
    persistState(nextData);
    return { success: true, program: newProgram };
  }, [data, persistState]);

  const renameProgram = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { success: false, error: 'Program name cannot be empty.' };
    }
    const prog = data.programs.find(p => p.id === id);
    if (!prog) return { success: false, error: 'Program not found.' };

    const duplicate = data.programs.some(p => p.id !== id && p.trackId === prog.trackId && p.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      return { success: false, error: 'Another program with this name already exists in this track.' };
    }

    const nextPrograms = data.programs.map(p => p.id === id ? { ...p, name: trimmed } : p);
    persistState({
      ...data,
      programs: nextPrograms,
      lastModified: new Date().toISOString(),
    });
    return { success: true };
  }, [data, persistState]);

  const deleteProgram = useCallback((id: string) => {
    const effectiveUid = user?.uid || getActiveUserId();
    recordDeletion(id, 'program', effectiveUid);

    // Cascading deletion: remove Program, and all Subjects, Chapters under it
    const nextPrograms = data.programs.filter(p => p.id !== id);
    const affectedSubjIds = data.subjects.filter(s => s.programId === id).map(s => s.id);
    recordDeletions(affectedSubjIds, 'subject', effectiveUid);

    const nextSubjects = data.subjects.filter(s => s.programId !== id);
    const affectedChapIds = data.chapters.filter(c => c.programId === id || affectedSubjIds.includes(c.subjectId)).map(c => c.id);
    recordDeletions(affectedChapIds, 'chapter', effectiveUid);

    const nextChapters = data.chapters.filter(c => c.programId !== id && !affectedSubjIds.includes(c.subjectId));
    const nextRecords = (data.completionRecords || []).filter(r => r.programId !== id && !affectedSubjIds.includes(r.subjectId));
    const nextTasks = (data.tasks || []).filter(t => t.programId !== id && !affectedSubjIds.includes(t.subjectId));

    persistState({
      ...data,
      programs: nextPrograms,
      subjects: nextSubjects,
      chapters: nextChapters,
      tasks: nextTasks,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    }, true);
    return { success: true };
  }, [data, persistState, user?.uid]);

  // ==================== SUBJECT OPERATIONS ====================
  const createSubject = useCallback((trackId: string, programId: string, name: string, priority: PriorityLevel = 'none') => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Subject name cannot be empty.' };
    }
    const prog = data.programs.find(p => p.id === programId && p.trackId === trackId);
    if (!prog) {
      return { success: false, error: 'Selected Track/Program combination does not exist.' };
    }

    // Check duplicate in same program
    const exists = data.subjects.some(s => s.programId === programId && s.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: false, error: 'A subject with this name already exists in this program.' };
    }

    const newSubject: Subject = {
      id: generateId(),
      trackId,
      programId,
      name: trimmed,
      priority,
      order: data.subjects.filter(s => s.programId === programId).length,
      createdAt: new Date().toISOString(),
    };

    persistState({
      ...data,
      subjects: [...data.subjects, newSubject],
      lastModified: new Date().toISOString(),
    });
    return { success: true, subject: newSubject };
  }, [data, persistState]);

  const createSubjectWithChapters = useCallback((
    trackId: string,
    programId: string,
    name: string,
    chaptersList: Array<{
      chapterNumber?: string;
      title: string;
      topicName?: string;
      priority?: PriorityLevel;
    }> = [],
    priority: PriorityLevel = 'none'
  ) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Subject name cannot be empty.' };
    }
    const prog = data.programs.find(p => p.id === programId && p.trackId === trackId);
    if (!prog) {
      return { success: false, error: 'Selected Track/Program combination does not exist.' };
    }

    // Check duplicate in same program
    const exists = data.subjects.some(s => s.programId === programId && s.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return { success: false, error: 'A subject with this name already exists in this program.' };
    }

    const newSubjectId = generateId();
    const newSubject: Subject = {
      id: newSubjectId,
      trackId,
      programId,
      name: trimmed,
      priority,
      order: data.subjects.filter(s => s.programId === programId).length,
      createdAt: new Date().toISOString(),
    };

    // Filter and prepare valid chapters
    const validChapters: Chapter[] = [];
    const usedNumbers = new Set<number>();

    chaptersList.forEach((chap, idx) => {
      let parsedNum = parseChapterNumber(chap.chapterNumber);
      if (parsedNum <= 0) {
        parsedNum = idx + 1;
      }
      // Ensure unique positive chapter number within this subject
      while (usedNumbers.has(parsedNum)) {
        parsedNum++;
      }
      usedNumbers.add(parsedNum);

      const userTopic = (chap.topicName || chap.title || '').trim();
      const finalTopic = (!userTopic || userTopic.toLowerCase() === `chapter ${parsedNum}`.toLowerCase() || userTopic.toLowerCase() === `ch ${parsedNum}`.toLowerCase())
        ? `Topic ${parsedNum}`
        : userTopic;

      validChapters.push({
        id: generateId(),
        trackId,
        programId,
        subjectId: newSubjectId,
        chapterNumber: String(parsedNum),
        title: finalTopic,
        topicName: finalTopic,
        priority: chap.priority || 'none',
        order: parsedNum,
        createdAt: new Date().toISOString(),
      });
    });

    const nextChapters = sortChaptersNumerically([...data.chapters, ...validChapters]);

    const nextData: AcademicHierarchyData = {
      ...data,
      subjects: [...data.subjects, newSubject],
      chapters: nextChapters,
      lastModified: new Date().toISOString(),
    };

    persistState(nextData);
    return { 
      success: true, 
      subject: newSubject, 
      createdChapters: validChapters,
      chaptersCount: validChapters.length 
    };
  }, [data, persistState]);

  const renameSubject = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { success: false, error: 'Subject name cannot be empty.' };
    }
    const subj = data.subjects.find(s => s.id === id);
    if (!subj) return { success: false, error: 'Subject not found.' };

    const duplicate = data.subjects.some(s => s.id !== id && s.programId === subj.programId && s.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      return { success: false, error: 'Another subject with this name already exists in this program.' };
    }

    const nextSubjects = data.subjects.map(s => s.id === id ? { ...s, name: trimmed } : s);
    persistState({
      ...data,
      subjects: nextSubjects,
      lastModified: new Date().toISOString(),
    });
    return { success: true };
  }, [data, persistState]);

  const updateSubject = useCallback((
    id: string,
    updates: {
      name?: string;
      trackId?: string;
      programId?: string;
      priority?: PriorityLevel;
    }
  ) => {
    const subj = data.subjects.find(s => s.id === id);
    if (!subj) return { success: false, error: 'Subject not found.' };

    const trimmedName = updates.name !== undefined ? updates.name.trim() : subj.name;
    if (!trimmedName) {
      return { success: false, error: 'Subject name cannot be empty.' };
    }

    const targetTrackId = updates.trackId || subj.trackId;
    const targetProgramId = updates.programId || subj.programId;

    const trackExists = data.tracks.some(t => t.id === targetTrackId);
    if (!trackExists) {
      return { success: false, error: 'Selected track does not exist.' };
    }

    const programExists = data.programs.some(p => p.id === targetProgramId && p.trackId === targetTrackId);
    if (!programExists) {
      return { success: false, error: 'Selected program does not belong to the selected track.' };
    }

    const duplicate = data.subjects.some(
      s => s.id !== id && s.programId === targetProgramId && s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: 'A subject with this name already exists in the selected program.' };
    }

    const targetPriority = updates.priority !== undefined ? updates.priority : subj.priority;

    const updatedSubject: Subject = {
      ...subj,
      name: trimmedName,
      trackId: targetTrackId,
      programId: targetProgramId,
      priority: targetPriority,
    };

    const nextSubjects = data.subjects.map(s => s.id === id ? updatedSubject : s);

    const isRelocated = targetTrackId !== subj.trackId || targetProgramId !== subj.programId;

    const nextChapters = isRelocated
      ? data.chapters.map(c => c.subjectId === id ? { ...c, trackId: targetTrackId, programId: targetProgramId } : c)
      : data.chapters;

    const nextTasks = isRelocated && data.tasks
      ? data.tasks.map(t => t.subjectId === id ? { ...t, trackId: targetTrackId, programId: targetProgramId } : t)
      : data.tasks;

    const nextRecords = isRelocated && data.completionRecords
      ? data.completionRecords.map(r => r.subjectId === id ? { ...r, trackId: targetTrackId, programId: targetProgramId } : r)
      : data.completionRecords;

    persistState({
      ...data,
      subjects: nextSubjects,
      chapters: nextChapters,
      tasks: nextTasks,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    });

    return { success: true, subject: updatedSubject };
  }, [data, persistState]);

  const setSubjectPriority = useCallback((id: string, priority: PriorityLevel) => {
    const nextSubjects = data.subjects.map(s => s.id === id ? { ...s, priority } : s);
    persistState({
      ...data,
      subjects: nextSubjects,
      lastModified: new Date().toISOString(),
    });
  }, [data, persistState]);

  const deleteSubject = useCallback((id: string) => {
    const effectiveUid = user?.uid || getActiveUserId();
    recordDeletion(id, 'subject', effectiveUid);

    // Cascading deletion: remove Subject, its Chapters, and its Tasks
    const nextSubjects = data.subjects.filter(s => s.id !== id);
    const affectedChapIds = data.chapters.filter(c => c.subjectId === id).map(c => c.id);
    recordDeletions(affectedChapIds, 'chapter', effectiveUid);

    const nextChapters = data.chapters.filter(c => c.subjectId !== id);
    const nextTasks = (data.tasks || []).filter(t => t.subjectId !== id);
    const nextRecords = (data.completionRecords || []).filter(r => r.subjectId !== id);

    persistState({
      ...data,
      subjects: nextSubjects,
      chapters: nextChapters,
      tasks: nextTasks,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    }, true);
    return { success: true };
  }, [data, persistState, user?.uid]);

  // ==================== CHAPTER OPERATIONS ====================
  const createChapter = useCallback((
    trackId: string, 
    programId: string, 
    subjectId: string, 
    chapterNumber: string, 
    title: string = '', 
    topicName: string = '',
    priority: PriorityLevel = 'none'
  ) => {
    const rawNumber = String(chapterNumber ?? '').trim();
    if (!rawNumber) {
      return { success: false, error: 'Chapter number is required.' };
    }

    const parsedNum = parseChapterNumber(rawNumber);
    if (isNaN(parsedNum) || parsedNum <= 0) {
      return { success: false, error: 'Chapter number must be a valid positive number.' };
    }

    const subj = data.subjects.find(s => s.id === subjectId && s.programId === programId && s.trackId === trackId);
    if (!subj) {
      return { success: false, error: 'Selected Track/Program/Subject does not exist.' };
    }

    // Duplicate chapter number validation within the same subject (numeric comparison)
    const duplicate = data.chapters.some(
      c => c.subjectId === subjectId && parseChapterNumber(c.chapterNumber) === parsedNum
    );
    if (duplicate) {
      return { success: false, error: `Chapter ${parsedNum} already exists in this subject.` };
    }

    const normalizedNumber = String(parsedNum);
    // Topic name defaults to Topic <no> (e.g. Topic 1, Topic 2) if not specified
    const userTopic = (topicName || title || '').trim();
    const finalTopic = (!userTopic || userTopic.toLowerCase() === `chapter ${normalizedNumber}`.toLowerCase() || userTopic.toLowerCase() === `ch ${normalizedNumber}`.toLowerCase())
      ? `Topic ${normalizedNumber}`
      : userTopic;

    const newChapter: Chapter = {
      id: generateId(),
      trackId,
      programId,
      subjectId,
      chapterNumber: normalizedNumber,
      title: finalTopic,
      topicName: finalTopic,
      priority,
      order: parsedNum,
      createdAt: new Date().toISOString(),
    };

    const nextChapters = sortChaptersNumerically([...data.chapters, newChapter]);

    persistState({
      ...data,
      chapters: nextChapters,
      lastModified: new Date().toISOString(),
    });
    return { success: true, chapter: newChapter };
  }, [data, persistState]);

  const renameChapter = useCallback((id: string, chapterNumber: string, title: string) => {
    const rawNumber = String(chapterNumber ?? '').trim();
    if (!rawNumber) {
      return { success: false, error: 'Chapter number cannot be empty.' };
    }

    const parsedNum = parseChapterNumber(rawNumber);
    if (isNaN(parsedNum) || parsedNum <= 0) {
      return { success: false, error: 'Chapter number must be a valid positive number.' };
    }

    const chap = data.chapters.find(c => c.id === id);
    if (!chap) return { success: false, error: 'Chapter not found.' };

    // Duplicate check must exclude current chapter record itself (c.id !== id)
    const duplicate = data.chapters.some(
      c => c.id !== id && c.subjectId === chap.subjectId && parseChapterNumber(c.chapterNumber) === parsedNum
    );
    if (duplicate) {
      return { success: false, error: `Chapter ${parsedNum} already exists in this subject.` };
    }

    const normalizedNumber = String(parsedNum);
    const userTopic = title.trim();
    const finalTopic = (!userTopic || userTopic.toLowerCase() === `chapter ${normalizedNumber}`.toLowerCase() || userTopic.toLowerCase() === `ch ${normalizedNumber}`.toLowerCase())
      ? `Topic ${normalizedNumber}`
      : userTopic;

    const nextChapters = sortChaptersNumerically(
      data.chapters.map(c => 
        c.id === id ? { ...c, chapterNumber: normalizedNumber, title: finalTopic, topicName: finalTopic, order: parsedNum } : c
      )
    );
    const nextRecords = (data.completionRecords || []).map(r =>
      r.chapterId === id
        ? { ...r, chapterNumber: normalizedNumber, chapterTitle: finalTopic, topicName: finalTopic }
        : r
    );
    persistState({
      ...data,
      chapters: nextChapters,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    });
    return { success: true };
  }, [data, persistState]);

  const updateChapter = useCallback((
    id: string,
    updates: {
      chapterNumber?: string;
      title?: string;
      topicName?: string;
      priority?: PriorityLevel;
      status?: ChapterStatus;
      completed?: boolean;
      isSkipped?: boolean;
      targetSubjectId?: string;
    }
  ) => {
    const currentData = dataRef.current;
    const chap = currentData.chapters.find(c => c.id === id);
    if (!chap) return { success: false, error: 'Chapter not found.' };

    const targetSubjectId = updates.targetSubjectId || chap.subjectId;
    const targetSubject = currentData.subjects.find(s => s.id === targetSubjectId);
    if (!targetSubject) {
      return { success: false, error: 'Target subject not found.' };
    }

    // Determine target chapter number
    let finalChapterNumber = chap.chapterNumber;
    let finalOrder = chap.order;
    if (updates.chapterNumber !== undefined) {
      const rawNumber = String(updates.chapterNumber).trim();
      if (!rawNumber) {
        return { success: false, error: 'Chapter number cannot be empty.' };
      }
      const parsedNum = parseChapterNumber(rawNumber);
      if (isNaN(parsedNum) || parsedNum <= 0) {
        return { success: false, error: 'Chapter number must be a valid positive number.' };
      }

      // Check duplicate in target subject (excluding this chapter)
      const duplicate = data.chapters.some(
        c => c.id !== id && c.subjectId === targetSubjectId && parseChapterNumber(c.chapterNumber) === parsedNum
      );
      if (duplicate) {
        return { success: false, error: `Chapter ${parsedNum} already exists in ${targetSubject.name}.` };
      }
      finalChapterNumber = String(parsedNum);
      finalOrder = parsedNum;
    } else if (targetSubjectId !== chap.subjectId) {
      // If moved to another subject without explicit number, avoid collision
      const currentParsed = parseChapterNumber(chap.chapterNumber);
      const duplicateInTarget = data.chapters.some(
        c => c.id !== id && c.subjectId === targetSubjectId && parseChapterNumber(c.chapterNumber) === currentParsed
      );
      if (duplicateInTarget) {
        const targetChapters = data.chapters.filter(c => c.subjectId === targetSubjectId);
        const nextNum = getNextAvailableChapterNumber(targetChapters);
        finalChapterNumber = String(nextNum);
        finalOrder = nextNum;
      }
    }

    // Determine title / topic name
    let finalTitle = chap.title;
    let finalTopic = chap.topicName || chap.title;
    if (updates.title !== undefined || updates.topicName !== undefined) {
      const userTopic = (updates.topicName ?? updates.title ?? '').trim();
      finalTopic = (!userTopic || userTopic.toLowerCase() === `chapter ${finalChapterNumber}`.toLowerCase() || userTopic.toLowerCase() === `ch ${finalChapterNumber}`.toLowerCase())
        ? `Topic ${finalChapterNumber}`
        : userTopic;
      finalTitle = finalTopic;
    }

    // Determine status & isSkipped
    const nextIsSkipped = updates.isSkipped !== undefined ? updates.isSkipped : chap.isSkipped;
    let nextStatus = updates.status !== undefined ? updates.status : chap.status;
    let nextCompleted = updates.completed !== undefined ? updates.completed : chap.completed;

    if (updates.isSkipped === true) {
      nextStatus = 'skipped';
      nextCompleted = false;
    } else if (updates.isSkipped === false && (nextStatus === 'skipped' || chap.isSkipped)) {
      nextStatus = 'pending';
      nextCompleted = false;
    }

    if (updates.status !== undefined && updates.isSkipped === undefined) {
      if (nextIsSkipped) {
        nextStatus = 'skipped';
        nextCompleted = false;
      } else if (updates.status === 'completed') {
        nextCompleted = true;
      } else if (updates.status === 'pending' || updates.status === 'in_progress') {
        nextCompleted = false;
      }
    }

    const nextChapters = sortChaptersNumerically(
      data.chapters.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          trackId: targetSubject.trackId,
          programId: targetSubject.programId,
          subjectId: targetSubject.id,
          chapterNumber: finalChapterNumber,
          title: finalTitle,
          topicName: finalTopic,
          order: finalOrder,
          priority: updates.priority !== undefined ? updates.priority : c.priority,
          status: nextStatus,
          completed: nextCompleted,
          isSkipped: nextIsSkipped,
        };
      })
    );

    const willBeCompleted = !nextIsSkipped && (nextCompleted === true || nextStatus === 'completed');

    let nextRecords = (currentData.completionRecords || []).map(r => {
      if (r.chapterId !== id) return r;
      return {
        ...r,
        trackId: targetSubject.trackId,
        programId: targetSubject.programId,
        subjectId: targetSubject.id,
        chapterNumber: finalChapterNumber,
        chapterTitle: finalTitle,
        topicName: finalTopic,
      };
    });

    if (willBeCompleted) {
      if (!nextRecords.some(r => r.chapterId === id)) {
        nextRecords.push({
          id: generateId(),
          chapterId: chap.id,
          trackId: targetSubject.trackId,
          programId: targetSubject.programId,
          subjectId: targetSubject.id,
          chapterNumber: finalChapterNumber,
          chapterTitle: finalTitle,
          topicName: finalTopic,
          completedAt: new Date().toISOString(),
        });
      }
    } else {
      nextRecords = nextRecords.filter(r => r.chapterId !== id);
    }

    let nextTasks = (currentData.tasks || []).map(t => {
      if (t.chapterId !== id) return t;
      return {
        ...t,
        trackId: targetSubject.trackId,
        programId: targetSubject.programId,
        subjectId: targetSubject.id,
      };
    });

    if (nextIsSkipped) {
      nextTasks = nextTasks.filter(t => t.chapterId !== id);
    }

    persistState({
      ...currentData,
      chapters: nextChapters,
      completionRecords: nextRecords,
      tasks: nextTasks,
      lastModified: new Date().toISOString(),
    });

    return { success: true };
  }, [data, persistState]);

  const toggleChapterSkip = useCallback((id: string) => {
    const chap = data.chapters.find(c => c.id === id);
    if (!chap) return { success: false, error: 'Chapter not found.' };
    const nextSkipped = !(chap.isSkipped || chap.status === 'skipped');
    return updateChapter(id, { isSkipped: nextSkipped });
  }, [data.chapters, updateChapter]);

  const setChapterPriority = useCallback((id: string, priority: PriorityLevel) => {
    const nextChapters = sortChaptersNumerically(data.chapters.map(c => c.id === id ? { ...c, priority } : c));
    persistState({
      ...data,
      chapters: nextChapters,
      lastModified: new Date().toISOString(),
    });
  }, [data, persistState]);

  const deleteChapter = useCallback((id: string) => {
    const effectiveUid = user?.uid || getActiveUserId();
    recordDeletion(id, 'chapter', effectiveUid);

    const nextChapters = sortChaptersNumerically(data.chapters.filter(c => c.id !== id));
    const nextRecords = (data.completionRecords || []).filter(r => r.chapterId !== id);
    const nextTasks = (data.tasks || []).filter(t => t.chapterId !== id);
    persistState({
      ...data,
      chapters: nextChapters,
      completionRecords: nextRecords,
      tasks: nextTasks,
      lastModified: new Date().toISOString(),
    }, true);
    return { success: true };
  }, [data, persistState, user?.uid]);

  // Topic name and chapter name are unified; editing updates both title and topicName directly
  const updateTopicName = useCallback((chapterId: string, topicName: string) => {
    const trimmedTopic = topicName.trim();
    const chap = data.chapters.find(c => c.id === chapterId);
    if (!chap) {
      return { success: false, error: 'Chapter not found.' };
    }

    const nextChapters = sortChaptersNumerically(data.chapters.map(c => 
      c.id === chapterId ? { ...c, title: trimmedTopic, topicName: trimmedTopic } : c
    ));
    const nextRecords = (data.completionRecords || []).map(r =>
      r.chapterId === chapterId
        ? { ...r, chapterTitle: trimmedTopic, topicName: trimmedTopic }
        : r
    );
    persistState({
      ...data,
      chapters: nextChapters,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    });
    return { success: true };
  }, [data, persistState]);

  // ==================== CHAPTER COMPLETION & STATUS ====================
  const setChapterStatus = useCallback((id: string, status: ChapterStatus) => {
    const currentData = dataRef.current;
    const target = currentData.chapters.find(c => c.id === id);
    if (!target) return;
    if (target.isSkipped || target.status === 'skipped') return;
    const isCompleted = status === 'completed';
    const nextChapters = currentData.chapters.map(c => 
      c.id === id ? { ...c, status, completed: isCompleted } : c
    );

    const prevRecords = currentData.completionRecords || [];
    let nextRecords = [...prevRecords];

    if (isCompleted) {
      if (!nextRecords.some(r => r.chapterId === id)) {
        nextRecords.push({
          id: generateId(),
          chapterId: target.id,
          trackId: target.trackId,
          programId: target.programId,
          subjectId: target.subjectId,
          chapterNumber: String(target.chapterNumber || ''),
          chapterTitle: target.title || `Chapter ${target.chapterNumber}`,
          topicName: getChapterTopicDisplay(target),
          completedAt: new Date().toISOString(),
        });
      }
    } else {
      nextRecords = nextRecords.filter(r => r.chapterId !== id);
    }

    persistState({
      ...currentData,
      chapters: nextChapters,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    }, true);
  }, [persistState]);

  const setChaptersStatus = useCallback((ids: string[], status: ChapterStatus) => {
    if (!ids || ids.length === 0) return;
    const currentData = dataRef.current;
    const idSet = new Set(ids);
    const isCompleted = status === 'completed';

    const eligibleChapters = currentData.chapters.filter(c => idSet.has(c.id) && !c.isSkipped && c.status !== 'skipped');
    if (eligibleChapters.length === 0) return;

    const eligibleIdSet = new Set(eligibleChapters.map(c => c.id));
    const nextChapters = currentData.chapters.map(c => {
      if (!eligibleIdSet.has(c.id)) return c;
      return {
        ...c,
        status,
        completed: isCompleted,
      };
    });

    const prevRecords = currentData.completionRecords || [];
    let nextRecords = [...prevRecords];

    if (isCompleted) {
      const existingRecordChapterIds = new Set(nextRecords.map(r => r.chapterId));
      const nowIso = new Date().toISOString();
      eligibleChapters.forEach(target => {
        if (!existingRecordChapterIds.has(target.id)) {
          nextRecords.push({
            id: generateId(),
            chapterId: target.id,
            trackId: target.trackId,
            programId: target.programId,
            subjectId: target.subjectId,
            chapterNumber: String(target.chapterNumber || ''),
            chapterTitle: target.title || `Chapter ${target.chapterNumber}`,
            topicName: getChapterTopicDisplay(target),
            completedAt: nowIso,
          });
          existingRecordChapterIds.add(target.id);
        }
      });
    } else {
      nextRecords = nextRecords.filter(r => !eligibleIdSet.has(r.chapterId));
    }

    persistState({
      ...currentData,
      chapters: nextChapters,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    }, true);
  }, [persistState]);

  const toggleChapterCompletion = useCallback((id: string) => {
    const currentData = dataRef.current;
    const target = currentData.chapters.find(c => c.id === id);
    if (!target) return;
    if (target.isSkipped || target.status === 'skipped') return;
    const isNowCompleted = !(target.completed || target.status === 'completed');
    const nextStatus: ChapterStatus = isNowCompleted ? 'completed' : 'pending';
    const nextChapters = currentData.chapters.map(c =>
      c.id === id ? { ...c, completed: isNowCompleted, status: nextStatus } : c
    );

    const prevRecords = currentData.completionRecords || [];
    let nextRecords = [...prevRecords];

    if (isNowCompleted) {
      if (!nextRecords.some(r => r.chapterId === id)) {
        nextRecords.push({
          id: generateId(),
          chapterId: target.id,
          trackId: target.trackId,
          programId: target.programId,
          subjectId: target.subjectId,
          chapterNumber: String(target.chapterNumber || ''),
          chapterTitle: target.title || `Chapter ${target.chapterNumber}`,
          topicName: getChapterTopicDisplay(target),
          completedAt: new Date().toISOString(),
        });
      }
    } else {
      nextRecords = nextRecords.filter(r => r.chapterId !== id);
    }

    persistState({
      ...currentData,
      chapters: nextChapters,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    }, true);
  }, [persistState]);

  const toggleSubjectCompletion = useCallback((subjectId: string, markComplete?: boolean) => {
    const currentData = dataRef.current;
    const subj = currentData.subjects.find(s => s.id === subjectId);
    if (!subj) {
      return { success: false, error: 'Subject not found.' };
    }

    const activeChapters = currentData.chapters.filter(c => c.subjectId === subjectId && !c.isSkipped && c.status !== 'skipped');
    if (activeChapters.length === 0) {
      return { success: false, error: 'No active chapters in this subject.' };
    }

    const allCurrentlyComplete = activeChapters.every(c => c.completed || c.status === 'completed');
    const willComplete = markComplete !== undefined ? markComplete : !allCurrentlyComplete;

    const nextStatus: ChapterStatus = willComplete ? 'completed' : 'pending';
    const activeChapterIds = new Set(activeChapters.map(c => c.id));

    const nextChapters = currentData.chapters.map(c => {
      if (!activeChapterIds.has(c.id)) return c;
      return {
        ...c,
        completed: willComplete,
        status: nextStatus,
      };
    });

    const prevRecords = currentData.completionRecords || [];
    let nextRecords = [...prevRecords];

    if (willComplete) {
      const nowIso = new Date().toISOString();
      const existingRecordChapterIds = new Set(nextRecords.map(r => r.chapterId));
      activeChapters.forEach(c => {
        if (!existingRecordChapterIds.has(c.id)) {
          nextRecords.push({
            id: generateId(),
            chapterId: c.id,
            trackId: c.trackId,
            programId: c.programId,
            subjectId: c.subjectId,
            chapterNumber: String(c.chapterNumber || ''),
            chapterTitle: c.title || `Chapter ${c.chapterNumber}`,
            topicName: getChapterTopicDisplay(c),
            completedAt: nowIso,
          });
        }
      });
    } else {
      nextRecords = nextRecords.filter(r => !activeChapterIds.has(r.chapterId));
    }

    persistState({
      ...currentData,
      chapters: nextChapters,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    }, true);

    return { success: true, completed: willComplete, affectedCount: activeChapters.length };
  }, [persistState]);

  const updateCompletionRecord = useCallback((recordId: string, completedAt: string) => {
    const prevRecords = data.completionRecords || [];
    const target = prevRecords.find(r => r.id === recordId);
    if (!target) {
      return { success: false, error: 'Completion record not found.' };
    }

    const parsedDate = new Date(completedAt);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: 'Invalid date or time.' };
    }

    const nextRecords = prevRecords.map(r =>
      r.id === recordId
        ? { ...r, completedAt: parsedDate.toISOString(), updatedAt: new Date().toISOString() }
        : r
    );

    persistState({
      ...data,
      completionRecords: nextRecords,
      lastModified: new Date().toISOString(),
    });

    return { success: true };
  }, [data, persistState]);

  // ==================== SUBJECT PASS/FREEZE CHAPTER AUTO-COMPLETION OPERATIONS ====================
  const freezeSubjectsBatch = useCallback((subjectIds: string[]): Record<string, string[]> => {
    if (!subjectIds || subjectIds.length === 0) return {};
    const currentData = dataRef.current;
    const targetSet = new Set(subjectIds);

    const autoCompletedMap: Record<string, string[]> = {};
    const newlyCompletedChapterIds = new Set<string>();

    currentData.chapters.forEach(c => {
      if (targetSet.has(c.subjectId)) {
        const isSkipped = Boolean(c.isSkipped || c.status === 'skipped');
        const isCompleted = Boolean(c.completed || c.status === 'completed');
        if (!isSkipped && !isCompleted) {
          newlyCompletedChapterIds.add(c.id);
          if (!autoCompletedMap[c.subjectId]) {
            autoCompletedMap[c.subjectId] = [];
          }
          autoCompletedMap[c.subjectId].push(c.id);
        }
      }
    });

    if (newlyCompletedChapterIds.size === 0) {
      return autoCompletedMap;
    }

    const nowIso = new Date().toISOString();
    const nextChapters = currentData.chapters.map(c => {
      if (newlyCompletedChapterIds.has(c.id)) {
        return {
          ...c,
          completed: true,
          status: 'completed' as ChapterStatus,
        };
      }
      return c;
    });

    const prevRecords = currentData.completionRecords || [];
    const existingRecordChapterIds = new Set(prevRecords.map(r => r.chapterId));
    const nextRecords = [...prevRecords];

    currentData.chapters.forEach(c => {
      if (newlyCompletedChapterIds.has(c.id) && !existingRecordChapterIds.has(c.id)) {
        nextRecords.push({
          id: generateId(),
          chapterId: c.id,
          trackId: c.trackId,
          programId: c.programId,
          subjectId: c.subjectId,
          chapterNumber: String(c.chapterNumber || ''),
          chapterTitle: c.title || `Chapter ${c.chapterNumber}`,
          topicName: getChapterTopicDisplay(c),
          completedAt: nowIso,
        });
        existingRecordChapterIds.add(c.id);
      }
    });

    persistState({
      ...currentData,
      chapters: nextChapters,
      completionRecords: nextRecords,
      lastModified: nowIso,
    }, true);

    return autoCompletedMap;
  }, [persistState]);

  const unfreezeSubjectsBatch = useCallback((records: Record<string, string[]>) => {
    if (!records || Object.keys(records).length === 0) return;
    const currentData = dataRef.current;

    const allRevertChapterIds = new Set<string>();
    Object.values(records).forEach(ids => {
      if (Array.isArray(ids)) {
        ids.forEach(id => allRevertChapterIds.add(id));
      }
    });

    if (allRevertChapterIds.size === 0) return;

    const nowIso = new Date().toISOString();
    const nextChapters = currentData.chapters.map(c => {
      if (allRevertChapterIds.has(c.id)) {
        return {
          ...c,
          completed: false,
          status: 'pending' as ChapterStatus,
        };
      }
      return c;
    });

    const prevRecords = currentData.completionRecords || [];
    const nextRecords = prevRecords.filter(r => !allRevertChapterIds.has(r.chapterId));

    persistState({
      ...currentData,
      chapters: nextChapters,
      completionRecords: nextRecords,
      lastModified: nowIso,
    }, true);
  }, [persistState]);

  const freezeSubjectChapters = useCallback((subjectId: string): string[] => {
    const result = freezeSubjectsBatch([subjectId]);
    return result[subjectId] || [];
  }, [freezeSubjectsBatch]);

  const unfreezeSubjectChapters = useCallback((subjectId: string, autoCompletedChapterIds?: string[]) => {
    if (autoCompletedChapterIds && autoCompletedChapterIds.length > 0) {
      unfreezeSubjectsBatch({ [subjectId]: autoCompletedChapterIds });
    }
  }, [unfreezeSubjectsBatch]);

  // ==================== ASSOCIATED TASK OPERATIONS ====================
  const createTask = useCallback((
    subjectId: string,
    title: string,
    options?: { chapterId?: string; priority?: PriorityLevel; dueDate?: string }
  ) => {
    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: 'Task title is required.' };
    if (options?.chapterId) {
      const targetChap = data.chapters.find(c => c.id === options.chapterId);
      if (targetChap && (targetChap.isSkipped || targetChap.status === 'skipped')) {
        return { success: false, error: 'Cannot assign study tasks to a skipped chapter.' };
      }
    }
    const subj = data.subjects.find(s => s.id === subjectId);
    const newTask: AcademicTask = {
      id: generateId(),
      subjectId,
      trackId: subj?.trackId,
      programId: subj?.programId,
      chapterId: options?.chapterId,
      title: trimmed,
      completed: false,
      priority: options?.priority || 'none',
      dueDate: options?.dueDate,
      createdAt: new Date().toISOString(),
    };
    const nextTasks = [...(data.tasks || []), newTask];
    persistState({
      ...data,
      tasks: nextTasks,
      lastModified: new Date().toISOString(),
    });
    return { success: true, task: newTask };
  }, [data, persistState]);

  const toggleTaskCompletion = useCallback((id: string) => {
    const nextTasks = (data.tasks || []).map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    persistState({
      ...data,
      tasks: nextTasks,
      lastModified: new Date().toISOString(),
    }, true);
  }, [data, persistState]);

  const deleteTask = useCallback((id: string) => {
    const effectiveUid = user?.uid || getActiveUserId();
    recordDeletion(id, 'task', effectiveUid);

    const nextTasks = (data.tasks || []).filter(t => t.id !== id);
    persistState({
      ...data,
      tasks: nextTasks,
      lastModified: new Date().toISOString(),
    }, true);
  }, [data, persistState, user?.uid]);

  const getTasksBySubject = useCallback((subjectId: string) => {
    return (data.tasks || []).filter(t => t.subjectId === subjectId);
  }, [data.tasks]);

  // ==================== HIERARCHY MANAGEMENT ====================
  const resetHierarchy = useCallback(() => {
    const empty: AcademicHierarchyData = {
      tracks: [],
      programs: [],
      subjects: [],
      chapters: [],
      tasks: [],
      completionRecords: [],
      lastModified: new Date().toISOString(),
    };
    persistState(empty);
  }, [persistState]);

  const exportHierarchy = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importHierarchy = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed.tracks) || !Array.isArray(parsed.programs) || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.chapters)) {
        return { success: false, error: 'Invalid JSON format: missing required hierarchy collections.' };
      }

      // Integrity validation: verify every program has valid trackId, every subject has valid programId, every chapter has valid subjectId
      const trackIds = new Set(parsed.tracks.map((t: Track) => t.id));
      const validPrograms = parsed.programs.filter((p: Program) => trackIds.has(p.trackId));
      const programIds = new Set(validPrograms.map((p: Program) => p.id));
      const validSubjects = parsed.subjects.filter((s: Subject) => trackIds.has(s.trackId) && programIds.has(s.programId));
      const subjectIds = new Set(validSubjects.map((s: Subject) => s.id));
      const validChapters = parsed.chapters.filter((c: Chapter) => 
        trackIds.has(c.trackId) && programIds.has(c.programId) && subjectIds.has(c.subjectId)
      );

      const chapterIds = new Set(validChapters.map((c: Chapter) => c.id));
      const validRecords: ChapterCompletionRecord[] = Array.isArray(parsed.completionRecords)
        ? parsed.completionRecords.filter((r: ChapterCompletionRecord) => chapterIds.has(r.chapterId))
        : [];
      const recordChapterIds = new Set(validRecords.map((r: ChapterCompletionRecord) => r.chapterId));
      validChapters.forEach((c: Chapter) => {
        if ((c.completed || c.status === 'completed') && !recordChapterIds.has(c.id)) {
          validRecords.push({
            id: generateId(),
            chapterId: c.id,
            trackId: c.trackId,
            programId: c.programId,
            subjectId: c.subjectId,
            chapterNumber: String(c.chapterNumber || ''),
            chapterTitle: c.title || `Chapter ${c.chapterNumber}`,
            topicName: getChapterTopicDisplay(c),
            completedAt: c.createdAt || new Date().toISOString(),
          });
          recordChapterIds.add(c.id);
        }
      });

      const sanitized: AcademicHierarchyData = {
        tracks: parsed.tracks,
        programs: validPrograms,
        subjects: validSubjects,
        chapters: sortChaptersNumerically(validChapters.map(normalizeChapterTopic)),
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        completionRecords: validRecords,
        lastModified: new Date().toISOString(),
      };

      persistState(sanitized);
      return { success: true };
    } catch {
      return { success: false, error: 'Invalid JSON syntax. Please provide valid JSON.' };
    }
  }, [persistState]);

  // ==================== FILTER HELPERS ====================
  const getProgramsByTrack = useCallback((trackId: string) => {
    return data.programs.filter(p => p.trackId === trackId);
  }, [data.programs]);

  const getSubjectsByProgram = useCallback((programId: string) => {
    return data.subjects.filter(s => s.programId === programId);
  }, [data.subjects]);

  const getChaptersBySubject = useCallback((subjectId: string) => {
    return sortChaptersNumerically(data.chapters.filter(c => c.subjectId === subjectId));
  }, [data.chapters]);

  const getChapterById = useCallback((chapterId: string) => {
    return data.chapters.find(c => c.id === chapterId);
  }, [data.chapters]);

  const contextValue = useMemo(() => ({
    tracks: data.tracks,
    programs: data.programs,
    subjects: data.subjects,
    chapters: data.chapters,
    tasks: data.tasks || [],
    completionRecords: data.completionRecords || [],
    createTrack,
    renameTrack,
    deleteTrack,
    reorderTracks,
    createProgram,
    renameProgram,
    deleteProgram,
    createSubject,
    createSubjectWithChapters,
    renameSubject,
    updateSubject,
    setSubjectPriority,
    deleteSubject,
    createChapter,
    renameChapter,
    updateChapter,
    toggleChapterSkip,
    setChapterPriority,
    deleteChapter,
    setChapterStatus,
    setChaptersStatus,
    toggleChapterCompletion,
    toggleSubjectCompletion,
    updateCompletionRecord,
    freezeSubjectChapters,
    unfreezeSubjectChapters,
    freezeSubjectsBatch,
    unfreezeSubjectsBatch,
    updateTopicName,
    createTask,
    toggleTaskCompletion,
    deleteTask,
    getTasksBySubject,
    resetHierarchy,
    exportHierarchy,
    importHierarchy,
    getProgramsByTrack,
    getSubjectsByProgram,
    getChaptersBySubject,
    getChapterById,
  }), [
    data.tracks,
    data.programs,
    data.subjects,
    data.chapters,
    data.tasks,
    data.completionRecords,
    createTrack,
    renameTrack,
    deleteTrack,
    reorderTracks,
    createProgram,
    renameProgram,
    deleteProgram,
    createSubject,
    createSubjectWithChapters,
    renameSubject,
    updateSubject,
    setSubjectPriority,
    deleteSubject,
    createChapter,
    renameChapter,
    updateChapter,
    toggleChapterSkip,
    setChapterPriority,
    deleteChapter,
    setChapterStatus,
    setChaptersStatus,
    toggleChapterCompletion,
    toggleSubjectCompletion,
    updateCompletionRecord,
    freezeSubjectChapters,
    unfreezeSubjectChapters,
    freezeSubjectsBatch,
    unfreezeSubjectsBatch,
    updateTopicName,
    createTask,
    toggleTaskCompletion,
    deleteTask,
    getTasksBySubject,
    resetHierarchy,
    exportHierarchy,
    importHierarchy,
    getProgramsByTrack,
    getSubjectsByProgram,
    getChaptersBySubject,
    getChapterById,
  ]);

  return (
    <AcademicHierarchyContext.Provider value={contextValue}>
      {children}
    </AcademicHierarchyContext.Provider>
  );
};

export function useAcademicHierarchy() {
  const context = useContext(AcademicHierarchyContext);
  if (!context) {
    throw new Error('useAcademicHierarchy must be used within an AcademicHierarchyProvider');
  }
  return context;
}
