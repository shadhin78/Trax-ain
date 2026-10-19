/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FocusTargetHistoryEntry } from '../types';

export function formatLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Sorts target history chronologically:
 * Primary: effectiveDate ascending
 * Secondary: createdAt ascending
 */
export function sortTargetHistory(history: FocusTargetHistoryEntry[]): FocusTargetHistoryEntry[] {
  return [...history].sort((a, b) => {
    const dateComp = (a.effectiveDate || '').localeCompare(b.effectiveDate || '');
    if (dateComp !== 0) return dateComp;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
}

/**
 * Resolves the target that was active on a given date.
 * Returns null if the requested date is strictly prior to the earliest recorded effective target.
 * Never fabricates a target value.
 */
export function getTargetForDate(
  history: FocusTargetHistoryEntry[],
  dateStr: string
): number | null {
  if (!history || history.length === 0 || !dateStr) {
    return null;
  }

  const sorted = sortTargetHistory(history);
  
  // Find all entries that took effect on or before dateStr
  const eligible = sorted.filter((entry) => entry.effectiveDate <= dateStr);
  
  if (eligible.length === 0) {
    // dateStr is before the first recorded target entry
    return null;
  }

  // The applicable target is the most recent eligible entry
  const activeEntry = eligible[eligible.length - 1];
  return activeEntry.targetHours;
}

/**
 * Returns the current active target (as of today's local date).
 * Returns null if no history exists and no fallback is specified.
 */
export function getCurrentTarget(
  history: FocusTargetHistoryEntry[],
  fallbackHours: number | null = null
): number | null {
  if (!history || history.length === 0) return fallbackHours;
  const todayStr = formatLocalDateString(new Date());
  const active = getTargetForDate(history, todayStr);
  if (active !== null) return active;
  
  // If all history entries are set in the future, pick the first upcoming one
  const sorted = sortTargetHistory(history);
  return sorted[0]?.targetHours ?? fallbackHours;
}

/**
 * Computes average daily target for a bucket/interval given a list of date strings (e.g., a week or month).
 * If no dates in the interval have an active target, returns avgTargetHours: null.
 */
export function getAverageTargetForDates(
  history: FocusTargetHistoryEntry[],
  dateStrings: string[]
): {
  avgTargetHours: number | null;
  daysWithTarget: number;
  totalDays: number;
} {
  const totalDays = dateStrings.length;
  if (totalDays === 0) {
    return { avgTargetHours: null, daysWithTarget: 0, totalDays: 0 };
  }

  let sum = 0;
  let count = 0;

  for (const dateStr of dateStrings) {
    const target = getTargetForDate(history, dateStr);
    if (target !== null) {
      sum += target;
      count++;
    }
  }

  if (count === 0) {
    return { avgTargetHours: null, daysWithTarget: 0, totalDays };
  }

  // When targets are unset, target focus is 0. Average target = sum of all days target / all days.
  const avg = Math.round((sum / totalDays) * 10) / 10;
  return { avgTargetHours: avg, daysWithTarget: count, totalDays };
}

/**
 * Safely inserts or updates a target in history.
 * - Prevents duplicate entries when setting the same value on the same effectiveDate.
 * - Updates existing entry for the same effectiveDate if value changed.
 * - Adds new chronological entry otherwise.
 */
export function setOrUpdateTargetEntry(
  history: FocusTargetHistoryEntry[],
  newTargetHours: number,
  effectiveDate?: string
): {
  updatedHistory: FocusTargetHistoryEntry[];
  changed: boolean;
  entry: FocusTargetHistoryEntry;
} {
  const targetDate = effectiveDate || formatLocalDateString(new Date());
  const clampedHours = Math.max(0.5, Math.min(24, Math.round(newTargetHours * 2) / 2));
  const sorted = sortTargetHistory(history || []);

  const existingIndex = sorted.findIndex((e) => e.effectiveDate === targetDate);

  if (existingIndex >= 0) {
    const existing = sorted[existingIndex];
    if (existing.targetHours === clampedHours) {
      // No value change: avoid redundant write
      return { updatedHistory: sorted, changed: false, entry: existing };
    }

    const updatedEntry: FocusTargetHistoryEntry = {
      ...existing,
      targetHours: clampedHours,
      updatedAt: new Date().toISOString(),
    };

    const nextList = [...sorted];
    nextList[existingIndex] = updatedEntry;
    return {
      updatedHistory: sortTargetHistory(nextList),
      changed: true,
      entry: updatedEntry,
    };
  }

  // Check if adding this target is identical to what's already effective on targetDate
  const currentEffective = getTargetForDate(sorted, targetDate);
  if (currentEffective === clampedHours && sorted.length > 0) {
    // Same target already effective from an earlier entry: avoid duplicate write
    const latestEligible = sorted.filter((e) => e.effectiveDate <= targetDate).pop();
    return {
      updatedHistory: sorted,
      changed: false,
      entry: latestEligible || sorted[0],
    };
  }

  const newEntry: FocusTargetHistoryEntry = {
    id: `target_hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    targetHours: clampedHours,
    effectiveDate: targetDate,
    createdAt: new Date().toISOString(),
    scope: 'DAILY_FOCUS',
  };

  const nextList = sortTargetHistory([...sorted, newEntry]);
  return {
    updatedHistory: nextList,
    changed: true,
    entry: newEntry,
  };
}

/**
 * Removes a historical entry by ID.
 */
export function removeTargetEntry(
  history: FocusTargetHistoryEntry[],
  id: string
): {
  updatedHistory: FocusTargetHistoryEntry[];
  changed: boolean;
} {
  const initialLength = history.length;
  const filtered = history.filter((e) => e.id !== id);
  return {
    updatedHistory: sortTargetHistory(filtered),
    changed: filtered.length !== initialLength,
  };
}
