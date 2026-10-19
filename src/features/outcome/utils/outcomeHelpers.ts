/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { mapCgpaToGrade, mapGradeToNumeric } from './outcomeEvaluation';
export * from './outcomeEvaluation';
export { mapCgpaToGrade as cgpaToGrade } from './outcomeEvaluation';


const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a date string (YYYY-MM-DD or ISO) into "11 Oct 2026"
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {}
  return dateStr;
}

/**
 * Format a date string into "11 Oct"
 */
export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${day} ${MONTH_NAMES[monthIdx]}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
    }
  } catch {}
  return dateStr;
}

/**
 * Convert letter grade to estimated CGPA (backwards compatibility)
 */
export function gradeToCgpa(grade: string): number {
  const g = grade.trim().toUpperCase();
  if (g.startsWith('A+')) return 4.0;
  if (g.startsWith('A-')) return 3.7;
  if (g.startsWith('A')) return 4.0;
  if (g.startsWith('B+')) return 3.3;
  if (g.startsWith('B-')) return 2.7;
  if (g.startsWith('B')) return 3.0;
  if (g.startsWith('C+')) return 2.3;
  if (g.startsWith('C')) return 2.0;
  if (g.startsWith('D')) return 1.0;
  if (g.startsWith('E')) return 0.5;
  return 0.0;
}

/**
 * Universal helper to parse any raw subject score or target score
 * into numeric score (0.00 - 4.00), letter grade, and whether it has been inputted.
 */
export function parseSubjectScore(
  rawVal: string | number | undefined | null,
  evalType?: import('../types').EvaluationOption
): { numeric: number; grade: string; isInputted: boolean } {
  if (rawVal === undefined || rawVal === null) {
    return { numeric: 0, grade: '—', isInputted: false };
  }
  if (typeof rawVal === 'number') {
    if (isNaN(rawVal) || rawVal < 0) return { numeric: 0, grade: '—', isInputted: false };
    const num = Math.min(4.0, Math.max(0, Number(rawVal.toFixed(2))));
    return { numeric: num, grade: mapCgpaToGrade(num, evalType), isInputted: num > 0 };
  }

  const str = String(rawVal).trim();
  if (!str || str === '—' || str === '-' || str.toUpperCase() === 'N/A' || str.toLowerCase() === 'none') {
    return { numeric: 0, grade: '—', isInputted: false };
  }

  // 1. Check parenthesized number: e.g. "A (4.00)" or "3.50 (A-)" or "Target: 4.00 (A+)"
  const parenNumMatch = str.match(/\(([\d.]+)\)/);
  if (parenNumMatch) {
    const p = parseFloat(parenNumMatch[1]);
    if (!isNaN(p)) {
      const num = Math.min(4.0, Math.max(0, Number(p.toFixed(2))));
      return { numeric: num, grade: mapCgpaToGrade(num, evalType), isInputted: true };
    }
  }

  // 2. Check standalone or embedded numeric score: e.g. "Target: 4.00 (A+)" or "3.50" or "4.0"
  const floatMatch = str.match(/\b([0-4](\.\d+)?)\b/);
  if (floatMatch) {
    const f = parseFloat(floatMatch[1]);
    if (!isNaN(f)) {
      const num = Math.min(4.0, Math.max(0, Number(f.toFixed(2))));
      const gradeInParen = str.match(/\(([A-F][+-]?)\)/i);
      const grade = gradeInParen ? gradeInParen[1].toUpperCase() : mapCgpaToGrade(num, evalType);
      return { numeric: num, grade, isInputted: true };
    }
  }

  // 3. Check direct letter grade: e.g. "A+", "B", "C-"
  const letterMatch = str.match(/\b([A-F][+-]?)\b/i);
  if (letterMatch) {
    const key = letterMatch[1].toUpperCase();
    const mapped = mapGradeToNumeric(key, evalType);
    if (!isNaN(mapped)) {
      return { numeric: mapped, grade: key, isInputted: true };
    }
  }

  return { numeric: 0, grade: '—', isInputted: false };
}

