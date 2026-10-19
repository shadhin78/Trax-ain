/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/

import { Subject, Program, Chapter, ChapterCompletionRecord } from '../../../types/academic';
import {
  PaceGoal,
  PaceStats,
  SubjectWorkloadDetail,
  DailyVelocityDataPoint
} from '../types';

export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Parses YYYY-MM-DD string into local midnight Date to avoid timezone shifts.
 */
export function parseLocalDate(dateStr: string | undefined | null): Date {
  if (!dateStr) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d, 0, 0, 0, 0);
    }
  }
  const parsed = new Date(dateStr);
  parsed.setHours(0, 0, 0, 0);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Normalizes a Date or "YYYY-MM-DD" string to a UTC midnight timestamp
 * to guarantee exact integer calendar-day arithmetic without timezone or DST distortions.
 */
export function getUtcCalendarTimestamp(date: Date | string | null | undefined): number {
  if (!date) {
    const now = new Date();
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (typeof date === 'string') {
    const parts = date.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return Date.UTC(y, m, d);
      }
    }
  }
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Calculates the exact signed calendar-day difference between two dates (toDate - fromDate).
 * Uses normalized UTC calendar midnight boundaries to account for daylight saving transitions.
 * E.g., if fromDate is 2026-10-01 and toDate is 2026-10-15, returns 14.
 */
export function differenceInCalendarDays(toDate: Date | string, fromDate: Date | string): number {
  const utcTo = getUtcCalendarTimestamp(toDate);
  const utcFrom = getUtcCalendarTimestamp(fromDate);
  return Math.round((utcTo - utcFrom) / MS_PER_DAY);
}

/**
 * Formats Date as "14 Nov 2026" or "DD MMM YYYY".
 */
export function formatDisplayDate(date: Date | string | null | undefined): string {
  if (!date) return '--';
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats date as YYYY-MM-DD for HTML input[type="date"].
 */
export function toIsoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats number to 2 decimal places e.g. "1.45"
 */
export function formatPaceValue(val: number): string {
  if (isNaN(val) || val < 0) return '0.00';
  return val.toFixed(2);
}

/**
 * Resolves the Set of Subject IDs targeted by a given pace goal.
 */
export function getTargetedSubjectIds(
  goal: PaceGoal,
  allSubjects: Subject[],
  allPaceGoals: PaceGoal[] = []
): Set<string> {
  const targeted = new Set<string>();
  if (!goal) return targeted;

  // Global Goal
  if (goal.type === 'global') {
    const hasExplicitSubjects = Array.isArray(goal.subjects) && goal.subjects.length > 0;
    const hasExplicitPrograms = Array.isArray(goal.programs) && goal.programs.length > 0;
    const hasSecondaryPaces = Array.isArray(goal.secondaryPaces) && goal.secondaryPaces.length > 0;

    // If no subjects, programs, or secondary paces are explicitly specified,
    // Global Pace targets 0 subjects (displays 0/0 ch). They can be added later via edit.
    if (hasExplicitSubjects && goal.subjects) {
      goal.subjects.forEach((sId) => targeted.add(sId));
    }
    if (hasExplicitPrograms && goal.programs) {
      const progSet = new Set(goal.programs);
      allSubjects.filter((s) => progSet.has(s.programId)).forEach((s) => targeted.add(s.id));
    }
    if (hasSecondaryPaces && goal.secondaryPaces) {
      goal.secondaryPaces.forEach((secGoalId) => {
        const secGoal = allPaceGoals.find((g) => g.id === secGoalId);
        if (secGoal && secGoal.id !== goal.id) {
          const secSubjects = getTargetedSubjectIds(secGoal, allSubjects, allPaceGoals);
          secSubjects.forEach((sId) => targeted.add(sId));
        }
      });
    }
    return targeted;
  }

  // Program-based Goal
  if (goal.type === 'programs') {
    const progSet = new Set(goal.programs || []);
    allSubjects.filter((s) => progSet.has(s.programId)).forEach((s) => targeted.add(s.id));
    return targeted;
  }

  // Bundle / Specific Subjects
  if (goal.subjects && goal.subjects.length > 0) {
    goal.subjects.forEach((sId) => targeted.add(sId));
  }
  if (goal.programs && goal.programs.length > 0) {
    const progSet = new Set(goal.programs);
    allSubjects.filter((s) => progSet.has(s.programId)).forEach((s) => targeted.add(s.id));
  }

  return targeted;
}

/**
 * Universal Pace Calculation Engine
 * Conforms to Section 8 of PACE_MANAGEMENT_GUIDE.md
 */
export function calculatePaceGoalStats(
  goal: PaceGoal,
  allSubjects: Subject[],
  allPrograms: Program[],
  allChapters: Chapter[],
  completionRecords: ChapterCompletionRecord[] = [],
  allGoals: PaceGoal[] = [],
  referenceDate: Date = new Date()
): PaceStats {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const start = parseLocalDate(goal.startDate);
  const deadline = parseLocalDate(goal.deadline);

  const targetedSubjectIds = getTargetedSubjectIds(goal, allSubjects, allGoals);
  const programMap = new Map(allPrograms.map((p) => [p.id, p.name]));

  // Time metrics (exclusive day counting: current day is not counted as elapsed)
  const totalDays = Math.max(1, differenceInCalendarDays(deadline, start));
  const diffDaysTarget = differenceInCalendarDays(deadline, today);
  const daysElapsed = Math.max(0, differenceInCalendarDays(today, start));
  const daysRemaining = Math.max(0, diffDaysTarget);
  const daysLeftWindow = Math.max(1, diffDaysTarget);

  // Check completion records within this goal timeframe for targeted subjects
  const startMs = start.getTime();
  const endTodayMs = today.getTime() + MS_PER_DAY - 1;
  const recordsInWindow = completionRecords.filter((rec) => {
    if (!targetedSubjectIds.has(rec.subjectId)) return false;
    const recTime = new Date(rec.completedAt).getTime();
    return recTime >= startMs && recTime <= endTodayMs;
  });

  // Workload details per subject
  const subjectDetails: SubjectWorkloadDetail[] = [];
  let total = 0;
  let completed = 0;

  allSubjects.forEach((sub) => {
    if (!targetedSubjectIds.has(sub.id)) return;

    const subChapters = allChapters.filter((c) => c.subjectId === sub.id && !c.isSkipped && c.status !== 'skipped');
    const subTotal = subChapters.length;
    const subCompleted = subChapters.filter(
      (c) => c.completed || c.status === 'completed'
    ).length;
    const subRemaining = Math.max(0, subTotal - subCompleted);
    const isPassed = subTotal > 0 && subCompleted >= subTotal;
    const percentage = subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0;

    // Subject required pace
    let subReqPace = 0;
    if (subRemaining <= 0) {
      subReqPace = 0;
    } else if (today < start) {
      subReqPace = totalDays > 0 ? subRemaining / totalDays : 0;
    } else if (today > deadline) {
      subReqPace = subRemaining;
    } else {
      subReqPace = subRemaining / daysLeftWindow;
    }

    // Subject actual pace
    let subCurPace = 0;
    if (today >= start) {
      const subRecords = recordsInWindow.filter((r) => r.subjectId === sub.id);
      if (subRecords.length > 0 && daysElapsed > 0) {
        subCurPace = subRecords.length / daysElapsed;
      } else if (subCompleted > 0 && daysElapsed > 0) {
        subCurPace = subCompleted / daysElapsed;
      } else {
        subCurPace = 0;
      }
    }

    total += subTotal;
    completed += subCompleted;

    subjectDetails.push({
      id: sub.id,
      name: sub.name,
      programId: sub.programId,
      programName: programMap.get(sub.programId) || 'General Program',
      totalChapters: subTotal,
      completedChapters: subCompleted,
      remainingChapters: subRemaining,
      percentage,
      isPassed,
      reqPace: subReqPace,
      curPace: subCurPace,
    });
  });

  const remaining = Math.max(0, total - completed);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Countdown & elapsed text
  let countdownText: string;
  if (!goal.deadline) {
    countdownText = '--';
  } else if (diffDaysTarget > 0) {
    countdownText = `${diffDaysTarget} Days Left`;
  } else if (diffDaysTarget === 0) {
    countdownText = 'Due Today';
  } else {
    countdownText = `${Math.abs(diffDaysTarget)} Days Overdue`;
  }

  const formatElapsedPeriod = (days: number): string => {
    if (days <= 0) return '0 Days Passed';
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    if (months > 0) {
      if (remDays > 0) {
        return `${months} ${months === 1 ? 'Month' : 'Months'}, ${remDays} ${remDays === 1 ? 'Day' : 'Days'} Passed`;
      }
      return `${months} ${months === 1 ? 'Month' : 'Months'} Passed`;
    }
    return `${days} ${days === 1 ? 'Day' : 'Days'} Passed`;
  };

  const timeElapsedText = goal.startDate ? formatElapsedPeriod(daysElapsed) : '--';

  // Required Daily Pace (reqPace)
  let reqPace = 0;
  if (remaining <= 0) {
    reqPace = 0;
  } else if (today < start) {
    reqPace = totalDays > 0 ? remaining / totalDays : 0;
  } else if (today > deadline) {
    reqPace = remaining; // Overdue deadline requires all remaining immediately
  } else {
    reqPace = remaining / daysLeftWindow;
  }

  // Current Actual Pace (curPace)
  let curPace = 0;
  if (today < start) {
    curPace = 0;
  } else {
    if (recordsInWindow.length > 0 && daysElapsed > 0) {
      curPace = recordsInWindow.length / daysElapsed;
    } else if (completed > 0 && daysElapsed > 0) {
      // Graceful fallback to total completed / daysElapsed
      curPace = completed / daysElapsed;
    } else {
      curPace = 0;
    }
  }

  // Trajectory & Estimated Finish
  let daysNeeded = 0;
  let projectedDate: Date | null = null;
  let projectedFinishStr = '--';
  let status: PaceStats['status'] = 'on-track';

  if (total <= 0) {
    daysNeeded = 0;
    projectedDate = null;
    projectedFinishStr = '--';
    status = 'on-track';
  } else if (remaining <= 0) {
    daysNeeded = 0;
    projectedDate = today;
    projectedFinishStr = 'Completed';
    status = 'finished';
  } else if (curPace <= 0) {
    daysNeeded = 0;
    projectedDate = null;
    projectedFinishStr = '--';
    if (today > deadline) {
      status = 'overdue';
    } else if (today < start) {
      status = 'future';
    } else {
      status = 'behind';
    }
  } else {
    daysNeeded = Math.ceil(remaining / curPace);
    projectedDate = new Date(today.getTime() + daysNeeded * MS_PER_DAY);
    projectedFinishStr = formatDisplayDate(projectedDate);

    if (today > deadline) {
      status = 'overdue';
    } else if (today < start) {
      status = 'future';
    } else if (curPace >= reqPace) {
      status = 'on-track';
    } else {
      status = 'behind';
    }
  }

  const isBehind = status === 'behind' || status === 'overdue';

  return {
    total,
    completed,
    remaining,
    percentage,
    totalDays,
    daysElapsed,
    daysRemaining,
    diffDaysTarget,
    reqPace,
    curPace,
    daysNeeded,
    projectedDate,
    projectedFinishStr,
    countdownText,
    timeElapsedText,
    isBehind,
    status,
    targetedSubjectIds,
    subjectDetails,
  };
}

/**
 * Builds data points for Burn-up trajectory SVG chart
 */
export function buildBurnUpChartData(
  stats: PaceStats,
  startDateStr: string,
  deadlineStr: string
) {
  const start = parseLocalDate(startDateStr);
  const deadline = parseLocalDate(deadlineStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const total = stats.total;
  const completed = stats.completed;
  const curPace = stats.curPace;
  const reqPace = stats.reqPace;

  const chartEndDate = stats.projectedDate && stats.projectedDate > deadline
    ? stats.projectedDate
    : deadline;

  // Generate 7-10 reference step points across the timeline
  const stepCount = 8;
  const timeSpan = Math.max(MS_PER_DAY * 7, chartEndDate.getTime() - start.getTime());
  const interval = timeSpan / (stepCount - 1);

  const points: {
    date: Date;
    dateLabel: string;
    required: number;
    actual: number | null;
    projected: number | null;
  }[] = [];

  for (let i = 0; i < stepCount; i++) {
    const curDate = new Date(start.getTime() + i * interval);
    const dateLabel = curDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    // Required line: straight diagonal from 0 to total at deadline
    let requiredVal = 0;
    if (deadline.getTime() > start.getTime()) {
      const progressFraction = Math.min(1, Math.max(0, (curDate.getTime() - start.getTime()) / (deadline.getTime() - start.getTime())));
      requiredVal = Math.round(progressFraction * total * 10) / 10;
    }

    // Actual progress: plotted up to today
    let actualVal: number | null = null;
    if (curDate <= today) {
      if (today.getTime() === start.getTime()) {
        actualVal = completed;
      } else {
        const frac = Math.min(1, Math.max(0, (curDate.getTime() - start.getTime()) / (today.getTime() - start.getTime())));
        actualVal = Math.round(frac * completed * 10) / 10;
      }
    }

    // Projected trajectory: from today onwards
    let projectedVal: number | null = null;
    if (curDate >= today && curPace > 0) {
      const daysFromToday = (curDate.getTime() - today.getTime()) / MS_PER_DAY;
      projectedVal = Math.min(total, Math.round((completed + daysFromToday * curPace) * 10) / 10);
    }

    points.push({
      date: curDate,
      dateLabel,
      required: requiredVal,
      actual: actualVal,
      projected: projectedVal,
    });
  }

  return {
    total,
    points,
    curPace,
    reqPace,
  };
}

/**
 * Builds daily velocity breakdown for candlestick/bar chart
 */
export function buildDailyVelocityBreakdown(
  completionRecords: ChapterCompletionRecord[],
  targetedSubjectIds: Set<string>,
  daysBack = 14
): DailyVelocityDataPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result: DailyVelocityDataPoint[] = [];
  let runningCumulative = 0;

  // Build map of counts per day
  const countsPerDay = new Map<string, number>();
  completionRecords.forEach((rec) => {
    if (targetedSubjectIds && targetedSubjectIds.size > 0 && !targetedSubjectIds.has(rec.subjectId)) return;
    const recDate = new Date(rec.completedAt);
    const dateKey = toIsoDateString(recDate);
    countsPerDay.set(dateKey, (countsPerDay.get(dateKey) || 0) + 1);
  });

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dateKey = toIsoDateString(d);
    const count = countsPerDay.get(dateKey) || 0;
    runningCumulative += count;

    result.push({
      dateStr: dateKey,
      displayDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      completedCount: count,
      cumulativeCompleted: runningCumulative,
    });
  }

  return result;
}

/**
 * Calculates user's overall actual chapter completion velocity across the entire curriculum.
 * This represents the user's raw study cadence (chapters / day), independent of any specific goal target.
 */
export function calculateOverallUserVelocity(
  completionRecords: ChapterCompletionRecord[] = [],
  allChapters: Chapter[] = [],
  referenceDate: Date = new Date()
): number {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  // Filter valid completion records
  const validRecords = completionRecords.filter((rec) => {
    if (!rec.completedAt) return false;
    const time = new Date(rec.completedAt).getTime();
    return !isNaN(time) && time <= today.getTime() + MS_PER_DAY - 1;
  });

  if (validRecords.length > 0) {
    const sorted = [...validRecords].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    const firstDate = new Date(sorted[0].completedAt);
    firstDate.setHours(0, 0, 0, 0);

    const daysElapsed = Math.max(0, differenceInCalendarDays(today, firstDate));
    const effectiveDays = Math.max(1, daysElapsed);
    return validRecords.length / effectiveDays;
  }

  // Fallback: If chapters are marked completed in curriculum without completionRecords
  const completedChaptersCount = allChapters.filter(
    (c) => !c.isSkipped && c.status !== 'skipped' && (c.completed || c.status === 'completed')
  ).length;

  if (completedChaptersCount > 0) {
    return completedChaptersCount / 30;
  }

  return 0;
}

/**
 * Calculates exact calendar difference in Years, Months, and Days between two dates.
 */
export function calculateYMDDiff(
  fromDate: Date,
  toDate: Date
): { years: number; months: number; days: number; totalDays: number } {
  const d1 = new Date(fromDate);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(toDate);
  d2.setHours(0, 0, 0, 0);

  const totalDays = Math.max(0, differenceInCalendarDays(d2, d1));

  if (d2 <= d1) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }

  let years = d2.getFullYear() - d1.getFullYear();
  let months = d2.getMonth() - d1.getMonth();
  let days = d2.getDate() - d1.getDate();

  if (days < 0) {
    // Number of days in the month preceding d2
    const prevMonthLastDay = new Date(d2.getFullYear(), d2.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    totalDays,
  };
}

/**
 * Formats years, months, and days into standard uppercase monospace notation: "1Y 6M 11D".
 */
export function formatYMDString(years: number, months: number, days: number): string {
  return `${years}Y ${months}M ${days}D`;
}

