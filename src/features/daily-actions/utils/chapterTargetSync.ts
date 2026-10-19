/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chapter, Subject } from '../../../types/academic';
import { MonthlyTarget, WeeklyTarget } from '../types';
import { formatChapterTargetDisplay } from './targetDisplayUtils';
import { parseChapterNumber } from '../../../context/AcademicHierarchyContext';

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Robustly matches a subject by name, track, or acronym without false positive substring overlaps.
 */
export function matchSubject(
  targetSubjName: string | undefined,
  targetTrack: string | undefined,
  subjects: Subject[]
): Subject | undefined {
  const normSubj = (targetSubjName || '').trim().toLowerCase();
  const normTrack = (targetTrack || '').trim().toLowerCase();

  if (!normSubj && !normTrack) return undefined;

  // 1. Exact match on targetSubjName
  if (normSubj) {
    const exact = subjects.find(s => s.name.trim().toLowerCase() === normSubj);
    if (exact) return exact;
  }

  // 2. Exact match on targetTrack
  if (normTrack) {
    const exactTrack = subjects.find(s => s.name.trim().toLowerCase() === normTrack);
    if (exactTrack) return exactTrack;
  }

  // 3. Known subject abbreviations
  if (normSubj) {
    const aliasMatch = subjects.find(s => {
      const sLower = s.name.trim().toLowerCase();
      if (normSubj === 'mi' && (sLower === 'mi' || sLower.includes('management information'))) return true;
      if (normSubj === 'it' && (sLower === 'it' || sLower.includes('information technology'))) return true;
      return false;
    });
    if (aliasMatch) return aliasMatch;
  }

  // 4. Whole-word boundary search preferring the longest matching subject name
  const query = normSubj || normTrack;
  if (query && query.length >= 2) {
    const candidates = subjects.filter(s => {
      const sLower = s.name.trim().toLowerCase();
      try {
        const regex = new RegExp(`(^|\\b)${escapeRegExp(query)}(\\b|$)`, 'i');
        return regex.test(sLower) || regex.test(query);
      } catch {
        return sLower === query;
      }
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.name.length - a.name.length);
      return candidates[0];
    }
  }

  return undefined;
}

/**
 * Resolves a target to a single canonical chapter ID.
 * Matches via:
 * 1. Direct target.chapterId if it exists in chapters
 * 2. Parsed Subject Name + Chapter Number
 * 3. Structured notes (Subject: X | Chapter Y)
 * 4. Topic name matching within the subject
 */
export function resolveTargetChapterId(
  target: { id?: string; title: string; track?: string; notes?: string; chapterId?: string },
  chapters: Chapter[],
  subjects: Subject[]
): string | undefined {
  // 1. Direct chapterId match
  if (target.chapterId) {
    const direct = chapters.find(c => c.id === target.chapterId);
    if (direct) return direct.id;
  }

  // Multi-chapter targets (ranges like Ch 1-5 or notes with multiple chapters) must not be treated as single chapter
  const hasRange = target.title.match(/(?:Ch(?:apter)?\.?)\s*(\d+)\s*(?:-|—|to)\s*(\d+)/i);
  if (hasRange) {
    return undefined;
  }
  const multiNotesMatch = (target.notes || '').match(/(?:Selected|Allocated)\s*chapters:\s*([^,]+,[^,]+)/i);
  if (multiNotesMatch) {
    return undefined;
  }

  // 2. Parsed display info
  const info = formatChapterTargetDisplay(target);
  if (info.isChapterTarget && info.chapterNumber !== undefined) {
    const targetChapNumStr = String(info.chapterNumber).trim();
    if (targetChapNumStr.includes('-') || targetChapNumStr.includes('—') || targetChapNumStr.includes('to')) {
      return undefined;
    }
    const targetChapNumInt = parseChapterNumber(targetChapNumStr);
    const matchedSubject = matchSubject(info.subjectName, target.track, subjects);

    if (matchedSubject) {
      const matchedChap = chapters.find(c => {
        if (c.subjectId !== matchedSubject.id) return false;
        const cNumStr = String(c.chapterNumber).trim();
        const cNumInt = parseChapterNumber(cNumStr);
        return cNumStr === targetChapNumStr || (targetChapNumInt > 0 && cNumInt === targetChapNumInt);
      });
      if (matchedChap) return matchedChap.id;
    }
  }

  // 3. Fallback: search target.notes for "Subject: X | Chapter Y"
  const notesMatch = (target.notes || '').match(/Subject:\s*([^|]+)\s*\|\s*Chapter\s*([\w.-]+)/i);
  if (notesMatch) {
    const subjName = notesMatch[1].trim();
    const chapNum = notesMatch[2].trim();
    const matchedSubj = matchSubject(subjName, target.track, subjects);
    if (matchedSubj) {
      const chap = chapters.find(c => {
        if (c.subjectId !== matchedSubj.id) return false;
        const cNumStr = String(c.chapterNumber).trim();
        return cNumStr === chapNum || parseChapterNumber(cNumStr) === parseChapterNumber(chapNum);
      });
      if (chap) return chap.id;
    }
  }

  // 4. Fallback: match by chapter topic name in title if subject matches
  const targetSubj = matchSubject(target.track, undefined, subjects);
  if (targetSubj) {
    const titleLower = target.title.toLowerCase();
    const chapByTopic = chapters.find(c => {
      if (c.subjectId !== targetSubj.id) return false;
      const topicLower = (c.topicName || c.title || '').trim().toLowerCase();
      return topicLower.length >= 4 && titleLower.includes(topicLower);
    });
    if (chapByTopic) return chapByTopic.id;
  }

  return undefined;
}

/**
 * Resolves all chapter IDs associated with a target (single-chapter, range, or whole subject).
 */
export function resolveTargetChapterIds(
  target: { id?: string; title: string; track?: string; notes?: string; chapterId?: string; targetCount?: number },
  chapters: Chapter[],
  subjects: Subject[]
): string[] {
  // 1. Single chapter target
  const singleId = resolveTargetChapterId(target, chapters, subjects);
  if (singleId) return [singleId];

  // 2. Range match in title: e.g. "Subject Ch 1-5" or "Module Ch 1-5" or "Course Ch 1 - 3"
  const rangeMatch = target.title.match(/(?:Ch(?:apter)?\.?)\s*(\d+)\s*(?:-|—|to)\s*(\d+)/i);
  if (rangeMatch) {
    const startNum = parseInt(rangeMatch[1], 10);
    const endNum = parseInt(rangeMatch[2], 10);
    const info = formatChapterTargetDisplay(target);
    const matchedSubj = matchSubject(info.subjectName, target.track, subjects);

    if (matchedSubj && !isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
      const min = Math.min(startNum, endNum);
      const max = Math.max(startNum, endNum);
      const matched = chapters.filter(c => {
        if (c.subjectId !== matchedSubj.id) return false;
        if (c.isSkipped || c.status === 'skipped') return false;
        const num = parseChapterNumber(c.chapterNumber);
        return num >= min && num <= max;
      });
      if (matched.length > 0) return matched.map(c => c.id);
    }
  }

  // 3. Notes containing "Selected chapters: ..." or "Allocated chapters: ..."
  const notesMatch = (target.notes || '').match(/(?:Selected|Allocated)\s*chapters:\s*(.+)/i);
  if (notesMatch) {
    const matchedSubj = matchSubject(target.track, undefined, subjects);
    if (matchedSubj) {
      const rawTokens = notesMatch[1].split(',');
      const ids: string[] = [];
      rawTokens.forEach(tok => {
        const numMatch = tok.match(/(?:Ch(?:apter)?\.?\s*)?(\d+)/i);
        if (numMatch) {
          const parsed = parseInt(numMatch[1], 10);
          const chap = chapters.find(c => c.subjectId === matchedSubj.id && parseChapterNumber(c.chapterNumber) === parsed);
          if (chap && !ids.includes(chap.id)) ids.push(chap.id);
        }
      });
      if (ids.length > 0) return ids;
    }
  }

  // 4. Whole subject or All Chapters
  const titleLower = target.title.toLowerCase();
  const matchedSubj = matchSubject(target.track || target.title, undefined, subjects);
  if (matchedSubj) {
    const isWholeSubject = 
      titleLower.includes('whole subject') || 
      titleLower.includes('all chapters') || 
      titleLower === matchedSubj.name.toLowerCase() ||
      (target.track?.toLowerCase() === matchedSubj.name.toLowerCase() && target.targetCount && target.targetCount >= chapters.filter(c => c.subjectId === matchedSubj.id && !c.isSkipped).length);

    if (isWholeSubject) {
      return chapters.filter(c => c.subjectId === matchedSubj.id && !c.isSkipped && c.status !== 'skipped').map(c => c.id);
    }
  }

  return [];
}

/**
 * Checks if a chapter is considered complete in canonical state.
 * Skipped chapters are NEVER complete.
 */
export function isChapterCanonicallyComplete(
  chapter?: Chapter | null,
  completionRecords?: { chapterId: string }[]
): boolean {
  if (!chapter) return false;
  if (chapter.isSkipped || chapter.status === 'skipped') return false;
  if (Boolean(chapter.completed || chapter.status === 'completed')) return true;
  if (completionRecords && completionRecords.some(r => r.chapterId === chapter.id)) return true;
  return false;
}

/**
 * Normalizes title strings by removing extra punctuation, dashes, colons, and whitespace.
 */
export function normalizeTargetTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[—–\-:.,()_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determines whether two targets (one monthly, one weekly, or any pair) are linked to each other.
 * Matches via:
 * 1. Direct monthlyTargetId linkage
 * 2. Shared canonical single chapter ID
 * 3. Multi-chapter overlap (e.g. range target and single chapter, or two overlapping chapter sets)
 * 4. Display parser matching (matching subjectName and chapterNumber)
 * 5. Normalized title string match
 */
export function areTargetsLinked(
  targetA: { id: string; title: string; track?: string; notes?: string; chapterId?: string; monthlyTargetId?: string; targetCount?: number },
  targetB: { id: string; title: string; track?: string; notes?: string; chapterId?: string; monthlyTargetId?: string; targetCount?: number },
  chapters: Chapter[],
  subjects: Subject[]
): boolean {
  if (!targetA || !targetB) return false;

  // 1. Direct ID reference
  if (targetA.id === targetB.id) return true;
  if (targetA.monthlyTargetId && targetA.monthlyTargetId === targetB.id) return true;
  if (targetB.monthlyTargetId && targetB.monthlyTargetId === targetA.id) return true;

  // 2. Direct or resolved single chapter ID match
  const chapIdA = targetA.chapterId || resolveTargetChapterId(targetA, chapters, subjects);
  const chapIdB = targetB.chapterId || resolveTargetChapterId(targetB, chapters, subjects);
  if (chapIdA && chapIdB && chapIdA === chapIdB) {
    return true;
  }

  // 3. Multi-chapter ID overlap
  const multiIdsA = resolveTargetChapterIds(targetA, chapters, subjects);
  const multiIdsB = resolveTargetChapterIds(targetB, chapters, subjects);
  if (multiIdsA.length > 0 && multiIdsB.length > 0) {
    // If either target is single chapter and exists in the other, or both are identical sets
    const hasSharedChapter = multiIdsA.some(id => multiIdsB.includes(id));
    if (hasSharedChapter) {
      if (multiIdsA.length === 1 || multiIdsB.length === 1 || multiIdsA.length === multiIdsB.length) {
        return true;
      }
    }
  }

  // 4. Formatted chapter target display matching (Subject Name + Chapter Number)
  const displayA = formatChapterTargetDisplay(targetA, chapters, subjects);
  const displayB = formatChapterTargetDisplay(targetB, chapters, subjects);
  if (
    displayA.isChapterTarget &&
    displayB.isChapterTarget &&
    displayA.subjectName &&
    displayB.subjectName &&
    displayA.chapterNumber !== undefined &&
    displayB.chapterNumber !== undefined
  ) {
    const subjMatch = matchSubject(displayA.subjectName, targetA.track, subjects)?.id ===
                      matchSubject(displayB.subjectName, targetB.track, subjects)?.id;
    const chapNumA = parseChapterNumber(String(displayA.chapterNumber));
    const chapNumB = parseChapterNumber(String(displayB.chapterNumber));
    if (subjMatch && chapNumA > 0 && chapNumA === chapNumB) {
      return true;
    }
  }

  // 5. Normalized title match
  const normA = normalizeTargetTitle(targetA.title);
  const normB = normalizeTargetTitle(targetB.title);
  if (normA && normB && normA === normB) {
    return true;
  }

  return false;
}

/**
 * Reconciles monthly and weekly targets against canonical chapters list.
 * Stamping stable chapterId onto targets and updating isCompleted/completedCount.
 * Returns updated arrays and a boolean flag indicating whether anything actually changed.
 */
export function reconcileTargetsWithChapters(params: {
  monthlyTargets: MonthlyTarget[];
  weeklyTargets: WeeklyTarget[];
  chapters: Chapter[];
  subjects: Subject[];
}): {
  updatedMonthly: MonthlyTarget[];
  updatedWeekly: WeeklyTarget[];
  hasChanges: boolean;
} {
  const { monthlyTargets, weeklyTargets, chapters, subjects } = params;
  const chapterMap = new Map<string, Chapter>();
  chapters.forEach(c => chapterMap.set(c.id, c));

  let hasMonthlyChanges = false;
  const updatedMonthly = monthlyTargets.map(target => {
    // 1. Single-chapter target
    const resolvedId = resolveTargetChapterId(target, chapters, subjects);

    if (resolvedId) {
      const chap = chapterMap.get(resolvedId);
      const isComplete = isChapterCanonicallyComplete(chap);
      const expectedCount = isComplete ? Math.max(1, target.targetCount) : 0;

      if (
        target.isCompleted !== isComplete ||
        target.completedCount !== expectedCount ||
        target.chapterId !== resolvedId
      ) {
        hasMonthlyChanges = true;
        return {
          ...target,
          chapterId: resolvedId,
          isCompleted: isComplete,
          completedCount: expectedCount,
        };
      }
      return target;
    }

    // 2. Multi-chapter target
    const multiIds = resolveTargetChapterIds(target, chapters, subjects);
    if (multiIds.length > 0) {
      const completedCount = multiIds.filter(id => isChapterCanonicallyComplete(chapterMap.get(id))).length;
      const expectedCount = Math.min(target.targetCount, completedCount);
      const expectedIsComplete = expectedCount >= target.targetCount && multiIds.every(id => isChapterCanonicallyComplete(chapterMap.get(id)));

      if (
        target.completedCount !== expectedCount ||
        target.isCompleted !== expectedIsComplete
      ) {
        hasMonthlyChanges = true;
        return {
          ...target,
          completedCount: expectedCount,
          isCompleted: expectedIsComplete,
        };
      }
    }

    return target;
  });

  let hasWeeklyChanges = false;
  const updatedWeekly = weeklyTargets.map(target => {
    // 1. Single-chapter target
    const resolvedId = resolveTargetChapterId(target, chapters, subjects);

    if (resolvedId) {
      const chap = chapterMap.get(resolvedId);
      const isComplete = isChapterCanonicallyComplete(chap);
      const expectedCount = isComplete ? Math.max(1, target.targetCount) : 0;

      if (
        target.isCompleted !== isComplete ||
        target.completedCount !== expectedCount ||
        target.chapterId !== resolvedId
      ) {
        hasWeeklyChanges = true;
        return {
          ...target,
          chapterId: resolvedId,
          isCompleted: isComplete,
          completedCount: expectedCount,
        };
      }
      return target;
    }

    // 2. Multi-chapter target
    const multiIds = resolveTargetChapterIds(target, chapters, subjects);
    if (multiIds.length > 0) {
      const completedCount = multiIds.filter(id => isChapterCanonicallyComplete(chapterMap.get(id))).length;
      const expectedCount = Math.min(target.targetCount, completedCount);
      const expectedIsComplete = expectedCount >= target.targetCount && multiIds.every(id => isChapterCanonicallyComplete(chapterMap.get(id)));

      if (
        target.completedCount !== expectedCount ||
        target.isCompleted !== expectedIsComplete
      ) {
        hasWeeklyChanges = true;
        return {
          ...target,
          completedCount: expectedCount,
          isCompleted: expectedIsComplete,
        };
      }
    }

    return target;
  });

  // 3. Self-healing check: If an active weekly target has an associated month,
  // but no corresponding monthly target exists in that month, auto-restore the monthly target!
  const finalMonthly = [...updatedMonthly];
  updatedWeekly.forEach(wt => {
    // Determine the month for this weekly target
    let targetMonthKey: string | undefined;
    const weekMonthMatch = wt.weekKey?.match(/^(\d{4})-(\d{2})-W\d+/);
    if (weekMonthMatch) {
      targetMonthKey = `${weekMonthMatch[1]}-${weekMonthMatch[2]}`;
    } else {
      const notesMonthMatch = (wt.notes || '').match(/Month:\s*(\d{4}-\d{2})/i);
      if (notesMonthMatch) {
        targetMonthKey = notesMonthMatch[1];
      }
    }

    if (!targetMonthKey) return;

    // Check if any target in finalMonthly for targetMonthKey links to wt
    const existsInMonthly = finalMonthly.some(mt => {
      if (mt.monthKey !== targetMonthKey) return false;
      return areTargetsLinked(wt, mt, chapters, subjects);
    });

    if (!existsInMonthly) {
      const chapId = wt.chapterId || resolveTargetChapterId(wt, chapters, subjects);
      const reconstructedMt: MonthlyTarget = {
        id: wt.monthlyTargetId || `mt_healed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        monthKey: targetMonthKey,
        title: wt.title,
        targetCount: Math.max(1, wt.targetCount || 1),
        completedCount: wt.completedCount || 0,
        unitLabel: wt.unitLabel || 'Chapters',
        track: wt.track,
        chapterId: chapId || wt.chapterId,
        isCompleted: Boolean(wt.isCompleted),
        createdAt: wt.createdAt || new Date().toISOString(),
        notes: wt.notes,
      };
      finalMonthly.push(reconstructedMt);
      hasMonthlyChanges = true;
    }
  });

  return {
    updatedMonthly: finalMonthly,
    updatedWeekly,
    hasChanges: hasMonthlyChanges || hasWeeklyChanges,
  };
}

/**
 * Synchronizes all monthly and weekly targets when a chapter's completion status is explicitly toggled.
 */
export function syncChapterCompletionAcrossTargets(params: {
  chapterId: string;
  isCompleted: boolean;
  monthlyTargets: MonthlyTarget[];
  weeklyTargets: WeeklyTarget[];
  chapters: Chapter[];
  subjects: Subject[];
}): {
  nextMonthly: MonthlyTarget[];
  nextWeekly: WeeklyTarget[];
} {
  const { chapterId, isCompleted, monthlyTargets, weeklyTargets, chapters, subjects } = params;

  // Build a temporary updated chapters copy with this chapter's new status
  const updatedChapters = chapters.map(c =>
    c.id === chapterId
      ? { ...c, completed: isCompleted, status: (isCompleted ? 'completed' : 'pending') as Chapter['status'] }
      : c
  );

  const result = reconcileTargetsWithChapters({
    monthlyTargets,
    weeklyTargets,
    chapters: updatedChapters,
    subjects,
  });

  return {
    nextMonthly: result.updatedMonthly,
    nextWeekly: result.updatedWeekly,
  };
}
