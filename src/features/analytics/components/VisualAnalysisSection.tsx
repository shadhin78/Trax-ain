/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TrendingUp, Layers, Activity, Maximize2, Calendar } from 'lucide-react';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { useDailyActions } from '../../daily-actions/context/DailyActionsContext';
import { usePace } from '../../pace/context/PaceContext';
import { useOutcome } from '../../outcome/context/OutcomeContext';
const SubjectCompletionChartModal = React.lazy(() =>
  import('./modals/SubjectCompletionChartModal').then((m) => ({ default: m.SubjectCompletionChartModal }))
);
const DailyActionsYearChartModal = React.lazy(() =>
  import('./modals/DailyActionsYearChartModal').then((m) => ({ default: m.DailyActionsYearChartModal }))
);

export type VisualTimeRange = '1Y' | '2Y' | '3Y' | 'Life Time';

export const LOCAL_STORAGE_VISUAL_TIME_RANGE = 'x29_visual_time_range';
export const LOCAL_STORAGE_HIDDEN_PROGRAM_IDS = 'x29_visual_hidden_program_ids';
export const LOCAL_STORAGE_HIDDEN_ACTION_IDS = 'x29_visual_hidden_action_ids';

const PROGRAM_PALETTE = [
  '#6366F1', // Indigo (e.g. BBA 2nd)
  '#A855F7', // Violet/Purple (e.g. CL)
  '#10B981', // Emerald (e.g. BBA 1st)
  '#06B6D4', // Cyan
  '#F43F5E', // Rose (e.g. AL)
  '#F59E0B', // Amber
  '#38BDF8', // Sky
  '#EC4899', // Pink
  '#64748B', // Slate
];

export const ACTION_COLOR_PALETTE = [
  '#10B981', // Emerald (e.g. CA, 5 Pushups)
  '#6366F1', // Indigo (e.g. BBA, Johor)
  '#06B6D4', // Cyan (e.g. Fazr)
  '#A855F7', // Violet (e.g. Magrib, Esha)
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#38BDF8', // Sky
  '#14B8A6', // Teal
];

// Helper: SVG monotonic cubic bezier curve generator (Fritsch-Carlson algorithm)
// Guarantees strictly monotonic interpolation: flat regions remain completely flat with zero dips/overshoots
function getSmoothCurvePath(points: { x: number; y: number }[], minY = 0, maxY = Infinity): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  // 1. Calculate secants (slopes between consecutive points)
  const deltas: number[] = [];
  const dxs: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    dxs.push(dx);
    deltas.push(dx === 0 ? 0 : dy / dx);
  }

  // 2. Calculate tangents at each point
  const m: number[] = new Array(n).fill(0);
  m[0] = deltas[0];
  m[n - 1] = deltas[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const d0 = deltas[i - 1];
    const d1 = deltas[i];
    // If slopes have different signs or either is flat (zero), tangent must be 0 to eliminate dips
    if (d0 * d1 <= 0) {
      m[i] = 0;
    } else {
      // Harmonic mean (Fritsch-Carlson / Brodlie)
      m[i] = (2 * d0 * d1) / (d0 + d1);
    }
  }

  // 3. Build cubic Bezier path using tangents
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = dxs[i];

    let cp1x = p1.x + dx / 3;
    let cp1y = p1.y + m[i] * (dx / 3);
    let cp2x = p2.x - dx / 3;
    let cp2y = p2.y - m[i + 1] * (dx / 3);

    // Clamp control points between bounds so they never dip below 0% or overshoot 100%
    cp1y = Math.min(maxY, Math.max(minY, cp1y));
    cp2y = Math.min(maxY, Math.max(minY, cp2y));

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

// Helper: SVG smooth area path generator (closed at bottom line)
function getSmoothAreaPath(points: { x: number; y: number }[], baseY: number, minY = 0): string {
  if (points.length === 0) return '';
  const curve = getSmoothCurvePath(points, minY, baseY);
  const first = points[0];
  const last = points[points.length - 1];
  return `${curve} L ${last.x.toFixed(1)} ${baseY.toFixed(1)} L ${first.x.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

// Helper: Smooth monotonic S-curve interpolator
// Produces graceful ease-in / ease-out uprising curves while strictly preserving non-decreasing monotonicity
function smoothMonotonic(points: number[]): number[] {
  const n = points.length;
  if (n <= 2) return points;
  const smoothed = [...points];
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < n - 1; i++) {
      smoothed[i] = Math.round((smoothed[i - 1] + 2 * smoothed[i] + smoothed[i + 1]) / 4);
    }
  }
  for (let i = 1; i < n; i++) {
    smoothed[i] = Math.max(smoothed[i - 1], smoothed[i]);
  }
  smoothed[n - 1] = points[n - 1];
  return smoothed;
}

export const VisualAnalysisSection: React.FC = () => {
  const { programs, subjects, chapters, completionRecords } = useAcademicHierarchy();
  const { dailyActions } = useDailyActions();
  const { goals, activeGoalId, activeGoal, globalGoal, globalBaseline, calculateStatsForGoal } = usePace();
  const { freezeConfig } = useOutcome();

  const [timeRange, setTimeRange] = useState<VisualTimeRange>(() => {
    if (typeof window === 'undefined') return 'Life Time';
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_VISUAL_TIME_RANGE);
      if (saved && ['1Y', '2Y', '3Y', 'Life Time'].includes(saved)) {
        return saved as VisualTimeRange;
      }
    } catch {
      // Fallback
    }
    return 'Life Time';
  });

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isDailyActionsYearModalOpen, setIsDailyActionsYearModalOpen] = useState(false);

  // Hover states for interactive info stats tooltips
  const [hoveredProgMonth, setHoveredProgMonth] = useState<number | null>(null);
  const [hoveredActionDay, setHoveredActionDay] = useState<number | null>(null);

  // Hover states for focusing specific program / action curves via legend chips
  const [hoveredProgId, setHoveredProgId] = useState<string | null>(null);
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);

  // Requirement: these button action will be saved and will not reset after refresh
  // Toggle visibility of individual programs in the completion trend chart
  const [hiddenProgramIds, setHiddenProgramIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_HIDDEN_PROGRAM_IDS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {
      // Fallback
    }
    return new Set();
  });

  // Toggle visibility of individual daily actions in the habits chart
  const [hiddenActionIds, setHiddenActionIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_HIDDEN_ACTION_IDS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {
      // Fallback
    }
    return new Set();
  });

  // Persist timeRange to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_VISUAL_TIME_RANGE, timeRange);
    } catch (err) {
      console.warn('Failed to save timeRange to localStorage', err);
    }
  }, [timeRange]);

  // Persist hiddenProgramIds to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_HIDDEN_PROGRAM_IDS,
        JSON.stringify(Array.from(hiddenProgramIds))
      );
    } catch (err) {
      console.warn('Failed to save hiddenProgramIds to localStorage', err);
    }
  }, [hiddenProgramIds]);

  // Persist hiddenActionIds to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_HIDDEN_ACTION_IDS,
        JSON.stringify(Array.from(hiddenActionIds))
      );
    } catch (err) {
      console.warn('Failed to save hiddenActionIds to localStorage', err);
    }
  }, [hiddenActionIds]);

  // ─────────────────────────────────────────────────────────────
  // 1. LINK WITH ACTIVE PACING TIMELINE (TAKE ONLY START DATE FROM X BAR)
  // ─────────────────────────────────────────────────────────────
  const timelineGoals = useMemo(() => {
    return goals.filter((g) => !g.id.startsWith('goal_subject_') && !g.id.startsWith('subject_pace_'));
  }, [goals]);

  const linkedGoal = useMemo(() => {
    if (!activeGoalId) return null;
    return timelineGoals.find((g) => g.id === activeGoalId) || null;
  }, [activeGoalId, timelineGoals]);

  const paceStats = useMemo(() => {
    if (!linkedGoal) return null;
    return calculateStatsForGoal(linkedGoal);
  }, [linkedGoal, calculateStatsForGoal]);

  // ─────────────────────────────────────────────────────────────
  // 2. TIMELINE RANGE: FROM START MONTH TO 1Y / 2Y / 3Y / LIFETIME
  // ─────────────────────────────────────────────────────────────
  const { startDate, monthsList, currentMonthIdx, lastPlottedMonthIdx } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Start date is strictly taken from linked active pace goal / global baseline
    let startStr = linkedGoal?.startDate || (linkedGoal?.type === 'global' ? globalBaseline?.startDate : '');
    if (!startStr && globalBaseline?.startDate) {
      startStr = globalBaseline.startDate;
    }

    let start = startStr ? new Date(startStr) : null;
    if (!start || isNaN(start.getTime())) {
      start = new Date(today);
      start.setMonth(start.getMonth() - 6);
      start.setDate(1);
    }
    start.setHours(0, 0, 0, 0);

    const startYear = start.getFullYear();
    const startMonth = start.getMonth();

    const currentIdx = (today.getFullYear() - startYear) * 12 + (today.getMonth() - startMonth);

    // 2. Count months based on timeRange:
    // - 1Y: from start day to 1 year (12 months)
    // - 2Y: from start day to 2 years (24 months)
    // - 3Y: from start day to 3 years (36 months)
    // - Life Time: strictly from start day to present day (current month)
    let count = 12;
    switch (timeRange) {
      case '1Y':
        count = 12;
        break;
      case '2Y':
        count = 24;
        break;
      case '3Y':
        count = 36;
        break;
      case 'Life Time':
      default: {
        count = Math.max(1, currentIdx + 1);
        break;
      }
    }

    const months: { monthIndex: number; date: Date; label: string; time: number }[] = [];
    for (let m = 0; m < count; m++) {
      const d = new Date(startYear, startMonth + m, 1);
      const rawMonth = d.toLocaleDateString('en-GB', { month: 'short' });
      const monthStr = rawMonth === 'Sept' ? 'Sep' : rawMonth;
      const yearStr = String(d.getFullYear()).slice(-2);
      months.push({
        monthIndex: m,
        date: d,
        label: `${monthStr} ${yearStr}`,
        time: d.getTime(),
      });
    }

    // Requirement: The line cannot go over the present date!
    const lastPlotted = Math.max(0, Math.min(count - 1, currentIdx));

    return {
      startDate: start,
      monthsList: months,
      currentMonthIdx: currentIdx,
      lastPlottedMonthIdx: lastPlotted,
    };
  }, [linkedGoal, globalBaseline, timeRange]);

  // ─────────────────────────────────────────────────────────────
  // 3. PROGRAM COMPLETION TREND DATA (MONTHLY PROGRESS UP TO PRESENT DATE ONLY)
  // ─────────────────────────────────────────────────────────────
  const programTrends = useMemo(() => {
    return programs.map((prog, idx) => {
      const progSubjects = subjects.filter((s) => s.programId === prog.id);
      const progSubjectIds = new Set(progSubjects.map((s) => s.id));
      const progChapters = chapters.filter((c) => progSubjectIds.has(c.subjectId));
      const totalCount = progChapters.length;

      // Match palette colors dynamically, prioritizing exact visual palette from design
      let color = PROGRAM_PALETTE[idx % PROGRAM_PALETTE.length];
      const lowerName = prog.name.toLowerCase();
      if (lowerName.includes('cl')) {
        color = '#A855F7'; // Violet/Purple (matches screenshot CL)
      } else if (lowerName.includes('al')) {
        color = '#F43F5E'; // Rose/Pink (matches screenshot AL)
      } else if (lowerName.includes('2nd') || lowerName.includes('second')) {
        color = '#6366F1'; // Indigo/Blue (matches screenshot BBA 2nd)
      } else if (lowerName.includes('1st') || lowerName.includes('first')) {
        color = '#10B981'; // Emerald/Teal (matches screenshot BBA 1st)
      }

      // Check if program is marked as passed in outcome pages pass freeze configuration
      const isProgramPassed = Boolean(
        freezeConfig?.frozenProgramIds?.includes(prog.id) ||
        freezeConfig?.manualFrozenProgramIds?.includes(prog.id) ||
        (progSubjects.length > 0 && progSubjects.every((s) => 
          freezeConfig?.frozenSubjectIds?.includes(s.id) || freezeConfig?.manualFrozenSubjectIds?.includes(s.id)
        ))
      );

      // Current completed count
      const currentCompletedCount = progChapters.filter((c) => c.completed || c.status === 'completed').length;
      // Requirement: When program marked as pass in outcome pages pass freeze configuration,
      // then the program line will be at 100%
      const currentPercentage = isProgramPassed
        ? 100
        : (totalCount > 0 ? Math.round((currentCompletedCount / totalCount) * 100) : 0);

      // Completion records for this program
      const progRecords = completionRecords.filter(
        (r) => r.programId === prog.id || progSubjectIds.has(r.subjectId)
      );

      // Collect exact completion timestamps for all completed chapters in this program
      const completedChapterTimes: number[] = [];

      progChapters.forEach((chap) => {
        const isDone = !chap.isSkipped && chap.status !== 'skipped' && (chap.completed || chap.status === 'completed');
        if (!isDone) return;

        // 1. Look up exact record in completionRecords
        const rec = progRecords.find((r) => r.chapterId === chap.id) ||
                    progRecords.find((r) => r.subjectId === chap.subjectId && String(r.chapterNumber) === String(chap.chapterNumber));

        let completedTime: number | null = null;
        if (rec?.completedAt) {
          const t = new Date(rec.completedAt).getTime();
          if (!isNaN(t)) completedTime = t;
        }

        // 2. Fallback to chapter createdAt
        if (completedTime === null && chap.createdAt) {
          const t = new Date(chap.createdAt).getTime();
          if (!isNaN(t)) completedTime = t;
        }

        // 3. Fallback: current time
        if (completedTime === null) {
          completedTime = Date.now();
        }

        completedChapterTimes.push(completedTime);
      });

      // Requirement: The line cannot go over the present date!
      // Generate points ONLY for months from 0 up to lastPlottedMonthIdx (present date)
      const rawPoints: number[] = [];
      let runningPct = 0;
      const nowTime = Date.now();

      for (let m = 0; m <= lastPlottedMonthIdx; m++) {
        if (totalCount === 0 && !isProgramPassed) {
          rawPoints.push(0);
          continue;
        }

        // At the present date (the last plotted month), the percentage is the program's current percentage
        if (m === lastPlottedMonthIdx) {
          runningPct = Math.max(runningPct, currentPercentage);
          rawPoints.push(currentPercentage);
          continue;
        }

        // For historical months before current month:
        const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0, 23, 59, 59, 999);
        const targetTime = monthEnd.getTime();

        if (targetTime >= nowTime) {
          rawPoints.push(currentPercentage);
          continue;
        }

        const completedUpToDate = completedChapterTimes.filter((t) => t <= targetTime).length;
        const rawPct = Math.min(currentPercentage, Math.round((completedUpToDate / totalCount) * 100));

        // Strict monotonicity: percentage can never decrease over time
        runningPct = Math.max(runningPct, rawPct);
        rawPoints.push(runningPct);
      }

      // Smooth uprising progression (ease-in, ease-out fluid style)
      const points = smoothMonotonic(rawPoints);
      if (points.length > 0) {
        points[points.length - 1] = currentPercentage;
      }

      return {
        id: prog.id,
        name: prog.name,
        totalChapters: totalCount,
        completedChapters: currentCompletedCount,
        currentPercentage,
        isPassed: isProgramPassed,
        color,
        points,
      };
    });
  }, [programs, subjects, chapters, completionRecords, startDate, lastPlottedMonthIdx, freezeConfig]);

  // ─────────────────────────────────────────────────────────────
  // 4. DAILY ACTIONS (MONTH) DATA (CONSISTENCY RATE: COMPLETED / PASSED DAYS)
  // ─────────────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();
  const daysInMonth = useMemo(() => new Date(currentYear, currentMonth + 1, 0).getDate(), [currentYear, currentMonth]);

  const dailyActionTrends = useMemo(() => {
    return dailyActions.map((action, idx) => {
      const color = ACTION_COLOR_PALETTE[idx % ACTION_COLOR_PALETTE.length];

      // Track completed days in current month up to each passed day
      let completedCount = 0;
      const points: number[] = [];

      for (let day = 1; day <= currentDay; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isDone = action.completedDates?.includes(dateStr);
        if (isDone) {
          completedCount++;
        }

        // Requirement: "the daily action line chart will work on the basis of daily action completed and passed days of that month"
        // rate = (completed count up to this day / passed days so far) * 100
        // When there is a gap / missed day, the more days that pass, the lower the consistency rate drops
        const rate = completedCount > 0 ? Math.round((completedCount / day) * 100) : 0;
        points.push(rate);
      }

      const totalCompletedInMonth = completedCount;
      const monthlyRate = currentDay > 0 ? Math.round((totalCompletedInMonth / currentDay) * 100) : 0;

      return {
        id: action.id,
        title: action.title,
        color,
        monthlyRate,
        totalCompletedInMonth,
        points,
      };
    });
  }, [dailyActions, currentYear, currentMonth, currentDay]);

  // Telemetry summaries for card headers
  const topProgram = useMemo(() => {
    if (programTrends.length === 0) return null;
    return [...programTrends].sort((a, b) => b.currentPercentage - a.currentPercentage)[0];
  }, [programTrends]);

  const avgProgramCompletion = useMemo(() => {
    if (programTrends.length === 0) return 0;
    const sum = programTrends.reduce((acc, p) => acc + p.currentPercentage, 0);
    return Math.round(sum / programTrends.length);
  }, [programTrends]);

  const activeProgramsCount = useMemo(() => {
    return programTrends.filter((p) => p.currentPercentage > 0).length;
  }, [programTrends]);

  const topAction = useMemo(() => {
    if (dailyActionTrends.length === 0) return null;
    return [...dailyActionTrends].sort((a, b) => b.monthlyRate - a.monthlyRate)[0];
  }, [dailyActionTrends]);

  const avgActionRate = useMemo(() => {
    if (dailyActionTrends.length === 0) return 0;
    const sum = dailyActionTrends.reduce((acc, a) => acc + a.monthlyRate, 0);
    return Math.round(sum / dailyActionTrends.length);
  }, [dailyActionTrends]);

  const actionDayTicks = useMemo(() => {
    const keyDays = [1, 5, 10, 15, 20, 25, daysInMonth];
    const set = new Set<number>(keyDays.filter((d) => d <= daysInMonth));
    if (currentDay >= 1 && currentDay <= daysInMonth) {
      set.add(currentDay);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [daysInMonth, currentDay]);

  // ─────────────────────────────────────────────────────────────
  // 5. CHART GEOMETRY & EXPANSIVE COORDINATE MAPPING (WIDER & TALLER LAYOUT)
  // ─────────────────────────────────────────────────────────────
  const chartWidth = 720;
  const chartHeight = 350;
  const padLeft = 46;
  const padRight = 18;
  const padTop = 24;
  const padBottom = 42;

  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const yTicks = [0, 20, 40, 60, 80, 100];

  // Helper to map month index and percentage (0..100) to (x, y) coordinates
  const mapProgCoord = (monthIdx: number, pct: number) => {
    const totalMonths = monthsList.length;
    const denom = Math.max(1, totalMonths - 1);
    const x = totalMonths > 1 ? padLeft + (monthIdx / denom) * plotW : padLeft + plotW;
    const y = padTop + (1 - Math.min(100, Math.max(0, pct)) / 100) * plotH;
    return { x, y };
  };

  const mapActionCoord = (dayNum: number, rate: number) => {
    const x = padLeft + ((dayNum - 1) / Math.max(1, daysInMonth - 1)) * plotW;
    const y = padTop + (1 - Math.min(100, Math.max(0, rate)) / 100) * plotH;
    return { x, y };
  };

  // Base Y line (0%)
  const baseY = padTop + plotH;

  const handleProgMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const pixelPadLeft = (padLeft / chartWidth) * rect.width;
    const pixelPlotW = (plotW / chartWidth) * rect.width;
    const ratio = Math.max(0, Math.min(1, (clientX - pixelPadLeft) / pixelPlotW));
    const nearestIdx = Math.round(ratio * (monthsList.length - 1));
    const clamped = Math.min(lastPlottedMonthIdx, Math.max(0, nearestIdx));
    setHoveredProgMonth(clamped);
  };

  const handleProgTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches[0].clientX - rect.left;
    const pixelPadLeft = (padLeft / chartWidth) * rect.width;
    const pixelPlotW = (plotW / chartWidth) * rect.width;
    const ratio = Math.max(0, Math.min(1, (clientX - pixelPadLeft) / pixelPlotW));
    const nearestIdx = Math.round(ratio * (monthsList.length - 1));
    const clamped = Math.min(lastPlottedMonthIdx, Math.max(0, nearestIdx));
    setHoveredProgMonth(clamped);
  };

  const handleActionMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const pixelPadLeft = (padLeft / chartWidth) * rect.width;
    const pixelPlotW = (plotW / chartWidth) * rect.width;
    const ratio = Math.max(0, Math.min(1, (clientX - pixelPadLeft) / pixelPlotW));
    const nearestIdx = Math.round(ratio * (daysInMonth - 1));
    const clampedDay = Math.min(currentDay - 1, Math.max(0, nearestIdx));
    setHoveredActionDay(clampedDay);
  };

  const handleActionTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches[0].clientX - rect.left;
    const pixelPadLeft = (padLeft / chartWidth) * rect.width;
    const pixelPlotW = (plotW / chartWidth) * rect.width;
    const ratio = Math.max(0, Math.min(1, (clientX - pixelPadLeft) / pixelPlotW));
    const nearestIdx = Math.round(ratio * (daysInMonth - 1));
    const clampedDay = Math.min(currentDay - 1, Math.max(0, nearestIdx));
    setHoveredActionDay(clampedDay);
  };

  const toggleProgramVisibility = useCallback((progId: string) => {
    setHiddenProgramIds((prev) => {
      const next = new Set(prev);
      if (next.has(progId)) {
        next.delete(progId);
      } else {
        next.add(progId);
      }
      return next;
    });
  }, []);

  const toggleActionVisibility = (actId: string) => {
    setHiddenActionIds((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) {
        next.delete(actId);
      } else {
        next.add(actId);
      }
      return next;
    });
  };

  const currentMonthName = today.toLocaleDateString('en-GB', { month: 'short' });

  return (
    <div className="w-full space-y-6 sm:space-y-8 font-mono">
      {/* ── TOP SECTION HEADER: VISUAL ANALYSIS & TIME RANGE TOGGLE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#38BDF8]/30 bg-[#38BDF8]/15 text-[#38BDF8] shadow-[0_0_16px_rgba(56,189,248,0.25)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#F8FAFC] uppercase">
                VISUAL ANALYSIS
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                REAL-TIME TRENDS
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-[#94A3B8] tracking-wider uppercase">
              Interactive trends visualization and tracking metrics
            </p>
          </div>
        </div>

        {/* Right: Time Range Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
            TIME RANGE:
          </span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.08] backdrop-blur-md">
            {(['1Y', '2Y', '3Y', 'Life Time'] as VisualTimeRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`
                  px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer
                  ${
                    timeRange === r
                      ? 'bg-[#2563EB] text-white shadow-[0_0_12px_rgba(37,99,235,0.45)]'
                      : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.05]'
                  }
                `}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN GRID: PROGRAM COMPLETION TREND & DAILY ACTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7 w-full">

        {/* ── LEFT CARD: PROGRAM COMPLETION TREND ── */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 lg:p-7 xl:p-8 flex flex-col justify-between font-mono relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all hover:border-white/[0.14]">
          {/* Subtle Ambient Background Glow */}
          <div
            className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-[#6366F1]/5 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div>
            {/* Card Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#818CF8]/30 bg-[#818CF8]/15 text-[#818CF8] shadow-[0_0_10px_rgba(129,140,248,0.2)]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#F8FAFC]">
                    PROGRAM COMPLETION TREND
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#818CF8]/15 text-[#A5B4FC] border border-[#818CF8]/30">
                    {timeRange}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 font-mono text-[11px] text-[#94A3B8] flex-wrap">
                  <span>TOP: <strong className="text-white font-bold">{topProgram ? `${topProgram.name} (${topProgram.currentPercentage}%)` : '--'}</strong></span>
                  <span className="text-white/20">•</span>
                  <span>AVG: <strong className="text-[#38BDF8] font-bold">{avgProgramCompletion}%</strong></span>
                  <span className="text-white/20">•</span>
                  <span>ACTIVE: <strong className="text-[#10B981] font-bold">{activeProgramsCount}/{programs.length}</strong></span>
                </div>
              </div>

              {/* Subject View Modal Button */}
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(true)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-[#4F46E5]/50 bg-[#4F46E5]/80 hover:bg-[#4F46E5] text-white font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-[0_0_14px_rgba(79,70,229,0.3)] active:scale-[0.98] flex items-center gap-2 shrink-0 self-start sm:self-auto"
                title="Open Subject Completion Trend modal"
              >
                <Maximize2 className="h-3.5 w-3.5 text-white/90" />
                <span>Subject View</span>
              </button>
            </div>

            {/* SVG Chart with Interactive Hover Stats */}
            <div
              className="mt-5 w-full aspect-[720/350] relative cursor-crosshair select-none"
              onMouseMove={handleProgMouseMove}
              onPointerMove={handleProgMouseMove}
              onMouseLeave={() => setHoveredProgMonth(null)}
              onPointerLeave={() => setHoveredProgMonth(null)}
              onTouchStart={handleProgTouchMove}
              onTouchMove={handleProgTouchMove}
              onTouchEnd={() => setHoveredProgMonth(null)}
              onClick={handleProgMouseMove}
            >
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full overflow-visible pointer-events-none"
              >
                <defs>
                  {/* Neon Glow Filter */}
                  <filter id="prog-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Gradient Area Defs */}
                  {programTrends.map((prog) => (
                    <linearGradient
                      key={`prog-grad-${prog.id}`}
                      id={`prog-grad-${prog.id}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={prog.color} stopOpacity="0.38" />
                      <stop offset="45%" stopColor={prog.color} stopOpacity="0.14" />
                      <stop offset="85%" stopColor={prog.color} stopOpacity="0.03" />
                      <stop offset="100%" stopColor={prog.color} stopOpacity="0.0" />
                    </linearGradient>
                  ))}
                </defs>

                {/* Y-Axis Grid Lines & Labels */}
                {yTicks.map((val) => {
                  const y = padTop + (1 - val / 100) * plotH;
                  const isCeiling = val === 100;
                  const isBaseline = val === 0;
                  return (
                    <g key={`y-grid-${val}`}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke={
                          isBaseline
                            ? 'rgba(255, 255, 255, 0.16)'
                            : isCeiling
                            ? 'rgba(148, 163, 184, 0.22)'
                            : 'rgba(255, 255, 255, 0.05)'
                        }
                        strokeWidth={isBaseline ? '1.2' : '1'}
                        strokeDasharray={isCeiling ? '4 4' : val === 50 ? '2 2' : undefined}
                      />
                      <text
                        x={padLeft - 10}
                        y={y + 3.5}
                        fill={isCeiling ? '#CBD5E1' : '#94A3B8'}
                        fontSize="10"
                        fontWeight={isCeiling ? '700' : '600'}
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Month Ticks & Labels */}
                {monthsList.map((mObj, idx) => {
                  const denom = Math.max(1, monthsList.length - 1);
                  const x = monthsList.length > 1 ? padLeft + (idx / denom) * plotW : padLeft + plotW / 2;
                  const isRotated = monthsList.length > 12;
                  const isPresentMonth = idx === lastPlottedMonthIdx;
                  const isFutureMonth = idx > lastPlottedMonthIdx;

                  // For dense multi-year views, filter intermediate labels
                  if (monthsList.length > 30) {
                    const isSpecial = idx === 0 || idx === lastPlottedMonthIdx || idx === monthsList.length - 1;
                    if (!isSpecial && idx % 2 !== 0) return null;
                  }

                  return (
                    <g key={`month-tick-group-${mObj.monthIndex}`}>
                      {/* Sub-tick line on baseline */}
                      <line
                        x1={x}
                        y1={baseY}
                        x2={x}
                        y2={baseY + 4}
                        stroke={isPresentMonth ? '#38BDF8' : 'rgba(255, 255, 255, 0.18)'}
                        strokeWidth={isPresentMonth ? '1.5' : '1'}
                      />

                      {/* Month Text Label */}
                      {isRotated ? (
                        <text
                          x={x}
                          y={baseY + 16}
                          transform={`rotate(-45, ${x}, ${baseY + 16})`}
                          fill={isPresentMonth ? '#38BDF8' : isFutureMonth ? '#475569' : '#94A3B8'}
                          fontSize={monthsList.length > 24 ? '7.5' : '8.5'}
                          fontWeight={isPresentMonth ? '700' : '600'}
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {mObj.label}
                        </text>
                      ) : (
                        <text
                          x={x}
                          y={baseY + 18}
                          fill={isPresentMonth ? '#38BDF8' : isFutureMonth ? '#475569' : '#94A3B8'}
                          fontSize="9.5"
                          fontWeight={isPresentMonth ? '700' : '600'}
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {mObj.label}
                        </text>
                      )}

                      {/* Small Present Month Indicator Dot */}
                      {isPresentMonth && (
                        <circle
                          cx={x}
                          cy={baseY + (isRotated ? 26 : 28)}
                          r="2"
                          fill="#38BDF8"
                          className="animate-pulse"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Area Gradient Fills under Program Curves */}
                {programTrends.map((prog) => {
                  if (hiddenProgramIds.has(prog.id) || prog.points.length === 0) return null;
                  const points = prog.points.map((pct, monthIdx) =>
                    mapProgCoord(monthIdx, pct)
                  );
                  const areaPath = getSmoothAreaPath(points, baseY, padTop);
                  const isHovered = hoveredProgId === prog.id;
                  const isOtherHovered = hoveredProgId && hoveredProgId !== prog.id;

                  return (
                    <path
                      key={`prog-area-${prog.id}`}
                      d={areaPath}
                      fill={`url(#prog-grad-${prog.id})`}
                      opacity={isOtherHovered ? 0.15 : isHovered ? 1.0 : 0.85}
                      className="transition-opacity duration-200 pointer-events-none"
                    />
                  );
                })}

                {/* Program Trend Curves (Stopping at present date with glow & focus state) */}
                {programTrends.map((prog) => {
                  if (hiddenProgramIds.has(prog.id) || prog.points.length === 0) return null;
                  const points = prog.points.map((pct, monthIdx) =>
                    mapProgCoord(monthIdx, pct)
                  );
                  const curvePath = getSmoothCurvePath(points, padTop, baseY);
                  const lastPt = points[points.length - 1];
                  const isHovered = hoveredProgId === prog.id;
                  const isOtherHovered = hoveredProgId && hoveredProgId !== prog.id;

                  return (
                    <g key={`prog-line-${prog.id}`} opacity={isOtherHovered ? 0.22 : 1}>
                      {/* Background Soft Glow Line */}
                      <path
                        d={curvePath}
                        fill="none"
                        stroke={prog.color}
                        strokeWidth={isHovered ? '9' : '7'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isHovered ? 0.45 : 0.22}
                        filter="url(#prog-neon-glow)"
                        className="pointer-events-none transition-all duration-200"
                      />
                      {/* Main Crisp Curve Line */}
                      <path
                        d={curvePath}
                        fill="none"
                        stroke={prog.color}
                        strokeWidth={isHovered ? '3.8' : '3.0'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-200"
                      />
                      {/* Live Radar Beacon for Active Program Endpoint */}
                      {prog.currentPercentage > 0 && lastPt && (
                        <g className="pointer-events-none">
                          {/* Animated Radar Pulse Ring */}
                          <circle cx={lastPt.x} cy={lastPt.y} r="4" fill={prog.color} opacity="0.45">
                            <animate
                              attributeName="r"
                              values="4;13;4"
                              dur="2.4s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.65;0;0.65"
                              dur="2.4s"
                              repeatCount="indefinite"
                            />
                          </circle>
                          {/* Outer Solid Ring */}
                          <circle cx={lastPt.x} cy={lastPt.y} r="5" fill={prog.color} opacity="0.4" />
                          {/* Inner Bright Center */}
                          <circle
                            cx={lastPt.x}
                            cy={lastPt.y}
                            r="2.8"
                            fill="#FFFFFF"
                            stroke={prog.color}
                            strokeWidth="2"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Interactive Crosshair & Highlight Dots */}
                {hoveredProgMonth !== null && hoveredProgMonth <= lastPlottedMonthIdx && (
                  <g className="pointer-events-none">
                    {/* Vertical dashed crosshair line with cyan tint */}
                    <line
                      x1={padLeft + (hoveredProgMonth / Math.max(1, monthsList.length - 1)) * plotW}
                      y1={padTop}
                      x2={padLeft + (hoveredProgMonth / Math.max(1, monthsList.length - 1)) * plotW}
                      y2={baseY}
                      stroke="rgba(56, 189, 248, 0.45)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />

                    {/* Circular highlight markers on each visible program line */}
                    {programTrends
                      .filter((prog) => !hiddenProgramIds.has(prog.id) && prog.points[hoveredProgMonth] !== undefined)
                      .map((prog) => {
                        const pct = prog.points[hoveredProgMonth];
                        const { x, y } = mapProgCoord(hoveredProgMonth, pct);
                        return (
                          <g key={`hover-pt-${prog.id}`}>
                            <circle
                              cx={x}
                              cy={y}
                              r="7"
                              fill={prog.color}
                              opacity="0.35"
                            />
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#FFFFFF"
                              stroke={prog.color}
                              strokeWidth="2"
                            />
                          </g>
                        );
                      })}
                  </g>
                )}

                {/* Invisible interaction capture rect */}
                <rect
                  x={padLeft}
                  y={padTop}
                  width={plotW}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                />
              </svg>

              {/* Hovering Info Stats Tooltip HUD */}
              {hoveredProgMonth !== null && hoveredProgMonth <= lastPlottedMonthIdx && monthsList[hoveredProgMonth] && (
                (() => {
                  const activeX = padLeft + (hoveredProgMonth / Math.max(1, monthsList.length - 1)) * plotW;
                  const isNearRight = hoveredProgMonth > monthsList.length * 0.52;
                  const leftPercent = (activeX / chartWidth) * 100;
                  const isPresentMonth = hoveredProgMonth === lastPlottedMonthIdx;

                  const visibleSorted = programTrends
                    .filter((prog) => !hiddenProgramIds.has(prog.id) && prog.points[hoveredProgMonth] !== undefined)
                    .sort((a, b) => b.points[hoveredProgMonth] - a.points[hoveredProgMonth]);

                  return (
                    <div
                      className="absolute z-30 pointer-events-none transition-all duration-75 ease-out select-none"
                      style={{
                        left: `${leftPercent}%`,
                        top: '50%',
                        transform: isNearRight ? 'translate(calc(-100% - 14px), -50%)' : 'translate(14px, -50%)',
                      }}
                    >
                      <div className="relative px-4 py-3 rounded-2xl border border-white/10 bg-[#0B0F19]/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] min-w-[170px]">
                        {/* Caret notch */}
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0B0F19] border-white/10 rotate-45 ${
                            isNearRight
                              ? '-right-1.5 border-t border-r'
                              : '-left-1.5 border-b border-l'
                          }`}
                        />

                        {/* Tooltip Header Date */}
                        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/[0.08]">
                          <span className="text-xs font-mono font-bold text-[#F8FAFC]">
                            {monthsList[hoveredProgMonth].label}
                          </span>
                          {isPresentMonth && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                              PRESENT
                            </span>
                          )}
                        </div>

                        {/* Programs List with Progress Bar & Percentage */}
                        <div className="space-y-2">
                          {visibleSorted.map((prog) => {
                            const pct = prog.points[hoveredProgMonth];
                            return (
                              <div
                                key={`tt-${prog.id}`}
                                className="flex items-center justify-between gap-3 font-mono text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px]"
                                    style={{ backgroundColor: prog.color, color: prog.color }}
                                  />
                                  <span className="text-[#E2E8F0] font-medium truncate max-w-[85px]">
                                    {prog.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="h-1.5 w-12 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-150"
                                      style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: prog.color }}
                                    />
                                  </div>
                                  <span className="font-bold text-[#F8FAFC] w-8 text-right">
                                    {pct}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Program Legend Badges (Clickable toggle filters + Hover curve focus) */}
            <div className="mt-5 flex flex-wrap gap-2">
              {programTrends.map((prog) => {
                const isHidden = hiddenProgramIds.has(prog.id);
                const isHovered = hoveredProgId === prog.id;
                return (
                  <button
                    key={`prog-badge-${prog.id}`}
                    type="button"
                    onClick={() => toggleProgramVisibility(prog.id)}
                    onMouseEnter={() => setHoveredProgId(prog.id)}
                    onMouseLeave={() => setHoveredProgId(null)}
                    className={`
                      px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 select-none
                      ${
                        isHidden
                          ? 'opacity-40 border-white/[0.04] bg-white/[0.02] text-[#64748B] hover:opacity-60'
                          : isHovered
                          ? 'border-white/30 bg-[#1E293B] text-white shadow-[0_0_12px_rgba(255,255,255,0.12)] scale-[1.02]'
                          : 'border-white/[0.08] bg-[#0E1526]/90 text-[#F8FAFC] hover:border-white/20 hover:bg-[#161F34]'
                      }
                    `}
                    title={`Click to ${isHidden ? 'show' : 'hide'} ${prog.name}. Hover to focus curve.`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                      style={{
                        backgroundColor: isHidden ? '#475569' : prog.color,
                        boxShadow: isHidden ? 'none' : `0 0 8px ${prog.color}80`,
                        transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                      }}
                    />
                    <span className={isHidden ? 'line-through text-[#64748B]' : ''}>
                      {prog.name.toUpperCase()}
                    </span>
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isHidden
                          ? 'bg-white/[0.03] text-[#64748B]'
                          : 'bg-white/[0.07] text-white'
                      }`}
                    >
                      {prog.currentPercentage}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Dynamic Callout Banner */}
          <div
            className={`
              mt-6 p-4 sm:p-4.5 rounded-2xl border font-mono text-xs sm:text-sm font-bold flex items-center gap-3 transition-all
              ${
                paceStats?.isBehind
                  ? 'border-[#F97316]/30 bg-[#F97316]/10 text-[#FB923C]'
                  : 'border-[#10B981]/30 bg-[#064E3B]/20 text-[#10B981]'
              }
            `}
          >
            <span className="text-lg sm:text-xl select-none">
              {paceStats?.isBehind ? '⚠️' : '🚀'}
            </span>
            <span>
              {paceStats?.isBehind
                ? 'Pace requires attention! Increase daily velocity to meet target deadlines.'
                : 'Excellent pace! You are on track to beat your aggregated deadlines.'}
            </span>
          </div>
        </div>

        {/* ── RIGHT CARD: DAILY ACTIONS (MONTH) ── */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 lg:p-7 xl:p-8 flex flex-col justify-between font-mono relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all hover:border-white/[0.14]">
          {/* Subtle Ambient Background Glow */}
          <div
            className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-[#0284C7]/5 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div>
            {/* Card Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#38BDF8]/30 bg-[#38BDF8]/15 text-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#F8FAFC]">
                    DAILY ACTIONS ({currentMonthName.toUpperCase()})
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                    DAY {currentDay}/{daysInMonth}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 font-mono text-[11px] text-[#94A3B8] flex-wrap">
                  <span>TOP: <strong className="text-white font-bold">{topAction ? `${topAction.title} (${topAction.monthlyRate}%)` : '--'}</strong></span>
                  <span className="text-white/20">•</span>
                  <span>AVG: <strong className="text-[#38BDF8] font-bold">{avgActionRate}%</strong></span>
                  <span className="text-white/20">•</span>
                  <span>ACTIVE: <strong className="text-[#10B981] font-bold">{dailyActionTrends.filter((a) => a.monthlyRate > 0).length}/{dailyActionTrends.length}</strong></span>
                </div>
              </div>

              {/* Year View Modal Button */}
              <button
                type="button"
                onClick={() => setIsDailyActionsYearModalOpen(true)}
                className={`
                  px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-[0_0_14px_rgba(37,99,235,0.3)] active:scale-[0.98] flex items-center gap-2 shrink-0 self-start sm:self-auto
                  ${
                    isDailyActionsYearModalOpen
                      ? 'border-[#38BDF8] bg-[#2563EB] text-white shadow-[0_0_16px_rgba(56,189,248,0.4)]'
                      : 'border-[#2563EB]/50 bg-[#2563EB]/80 hover:bg-[#2563EB] text-white'
                  }
                `}
                title="Open Yearly Trend comparison modal"
              >
                <Calendar className="h-3.5 w-3.5 text-white/90" />
                <span>Year View</span>
              </button>
            </div>

            {/* SVG Chart with Interactive Hover Stats */}
            <div
              className="mt-5 w-full aspect-[720/350] relative cursor-crosshair select-none"
              onMouseMove={handleActionMouseMove}
              onPointerMove={handleActionMouseMove}
              onMouseLeave={() => setHoveredActionDay(null)}
              onPointerLeave={() => setHoveredActionDay(null)}
              onTouchStart={handleActionTouchMove}
              onTouchMove={handleActionTouchMove}
              onTouchEnd={() => setHoveredActionDay(null)}
              onClick={handleActionMouseMove}
            >
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full overflow-visible pointer-events-none"
              >
                <defs>
                  {/* Neon Glow Filter */}
                  <filter id="action-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Gradient Area Defs */}
                  {dailyActionTrends.map((act, idx) => (
                    <linearGradient
                      key={`action-grad-def-${act.id}`}
                      id={`action-grad-${idx}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={act.color} stopOpacity="0.38" />
                      <stop offset="45%" stopColor={act.color} stopOpacity="0.14" />
                      <stop offset="85%" stopColor={act.color} stopOpacity="0.03" />
                      <stop offset="100%" stopColor={act.color} stopOpacity="0.0" />
                    </linearGradient>
                  ))}
                </defs>

                {/* Y-Axis Grid Lines & Labels */}
                {yTicks.map((val) => {
                  const y = padTop + (1 - val / 100) * plotH;
                  const isCeiling = val === 100;
                  const isBaseline = val === 0;
                  return (
                    <g key={`y-action-${val}`}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke={
                          isBaseline
                            ? 'rgba(255, 255, 255, 0.16)'
                            : isCeiling
                            ? 'rgba(148, 163, 184, 0.22)'
                            : 'rgba(255, 255, 255, 0.05)'
                        }
                        strokeWidth={isBaseline ? '1.2' : '1'}
                        strokeDasharray={isCeiling ? '4 4' : val === 50 ? '2 2' : undefined}
                      />
                      <text
                        x={padLeft - 10}
                        y={y + 3.5}
                        fill={isCeiling ? '#CBD5E1' : '#94A3B8'}
                        fontSize="10"
                        fontWeight={isCeiling ? '700' : '600'}
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Upcoming Future Days Zone (from currentDay to end of month) */}
                {currentDay < daysInMonth && (
                  (() => {
                    const futureStartX = padLeft + ((currentDay - 1) / Math.max(1, daysInMonth - 1)) * plotW;
                    const futureW = (chartWidth - padRight) - futureStartX;
                    return (
                      <g className="pointer-events-none">
                        {/* Shaded background for upcoming month period */}
                        <rect
                          x={futureStartX}
                          y={padTop}
                          width={futureW}
                          height={plotH}
                          fill="rgba(255, 255, 255, 0.015)"
                        />
                        {/* Dashed vertical separator at current day */}
                        <line
                          x1={futureStartX}
                          y1={padTop}
                          x2={futureStartX}
                          y2={baseY}
                          stroke="rgba(56, 189, 248, 0.35)"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                        />
                        {/* Subtle UPCOMING pill label near top */}
                        <text
                          x={futureStartX + 8}
                          y={padTop + 14}
                          fill="#64748B"
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="700"
                          letterSpacing="0.08em"
                        >
                          UPCOMING
                        </text>
                      </g>
                    );
                  })()
                )}

                {/* X-Axis Day Ticks & Milestone Labels */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                  const x = padLeft + ((dayNum - 1) / Math.max(1, daysInMonth - 1)) * plotW;
                  const isToday = dayNum === currentDay;
                  const isPastOrToday = dayNum <= currentDay;
                  const isMilestone = actionDayTicks.includes(dayNum);

                  return (
                    <g key={`day-tick-group-${dayNum}`}>
                      {/* Sub-tick line on baseline */}
                      <line
                        x1={x}
                        y1={baseY}
                        x2={x}
                        y2={isMilestone ? baseY + 5 : baseY + 2.5}
                        stroke={
                          isToday
                            ? '#38BDF8'
                            : isMilestone
                            ? 'rgba(255, 255, 255, 0.22)'
                            : 'rgba(255, 255, 255, 0.07)'
                        }
                        strokeWidth={isToday ? '1.5' : '1'}
                      />

                      {/* Day Number Label (Shown for milestones and Today) */}
                      {isMilestone && (
                        <text
                          x={x}
                          y={baseY + 18}
                          fill={isToday ? '#38BDF8' : isPastOrToday ? '#94A3B8' : '#475569'}
                          fontSize={isToday ? '10' : '9.5'}
                          fontWeight={isToday ? '800' : '600'}
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {dayNum}
                        </text>
                      )}

                      {/* Small Today Indicator Dot */}
                      {isToday && (
                        <circle
                          cx={x}
                          cy={baseY + 28}
                          r="2"
                          fill="#38BDF8"
                          className="animate-pulse"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Daily Actions Area Gradients under Curves */}
                {dailyActionTrends.map((act, idx) => {
                  if (hiddenActionIds.has(act.id) || act.points.length === 0) return null;
                  const points = act.points.map((rate, dIdx) =>
                    mapActionCoord(dIdx + 1, rate)
                  );
                  const areaPath = getSmoothAreaPath(points, baseY, padTop);
                  const isHovered = hoveredActionId === act.id;
                  const isOtherHovered = hoveredActionId && hoveredActionId !== act.id;

                  return (
                    <path
                      key={`action-area-${act.id}`}
                      d={areaPath}
                      fill={`url(#action-grad-${idx})`}
                      opacity={isOtherHovered ? 0.15 : isHovered ? 1.0 : 0.85}
                      className="transition-opacity duration-200 pointer-events-none"
                    />
                  );
                })}

                {/* Daily Actions Smooth Lines with Glow & Focus state */}
                {dailyActionTrends.map((act) => {
                  if (hiddenActionIds.has(act.id) || act.points.length === 0) return null;
                  const points = act.points.map((rate, dIdx) =>
                    mapActionCoord(dIdx + 1, rate)
                  );
                  const curvePath = getSmoothCurvePath(points, padTop, baseY);
                  const currentDayPt = points[points.length - 1];
                  const isHovered = hoveredActionId === act.id;
                  const isOtherHovered = hoveredActionId && hoveredActionId !== act.id;

                  return (
                    <g key={`action-plot-${act.id}`} opacity={isOtherHovered ? 0.22 : 1}>
                      {/* Background Soft Glow Line */}
                      <path
                        d={curvePath}
                        fill="none"
                        stroke={act.color}
                        strokeWidth={isHovered ? '9' : '7'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isHovered ? 0.45 : 0.22}
                        filter="url(#action-neon-glow)"
                        className="pointer-events-none transition-all duration-200"
                      />
                      {/* Main Crisp Curve Line */}
                      <path
                        d={curvePath}
                        fill="none"
                        stroke={act.color}
                        strokeWidth={isHovered ? '3.8' : '3.0'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-200"
                      />
                      {/* Live Radar Beacon for Current Day Endpoint */}
                      {act.totalCompletedInMonth > 0 && currentDayPt && (
                        <g className="pointer-events-none">
                          {/* Animated Radar Pulse Ring */}
                          <circle cx={currentDayPt.x} cy={currentDayPt.y} r="4" fill={act.color} opacity="0.45">
                            <animate
                              attributeName="r"
                              values="4;13;4"
                              dur="2.4s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.65;0;0.65"
                              dur="2.4s"
                              repeatCount="indefinite"
                            />
                          </circle>
                          {/* Outer Solid Ring */}
                          <circle cx={currentDayPt.x} cy={currentDayPt.y} r="5" fill={act.color} opacity="0.4" />
                          {/* Inner Bright Center */}
                          <circle
                            cx={currentDayPt.x}
                            cy={currentDayPt.y}
                            r="2.8"
                            fill="#FFFFFF"
                            stroke={act.color}
                            strokeWidth="2"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Interactive Crosshair & Highlight Dots */}
                {hoveredActionDay !== null && hoveredActionDay < currentDay && (
                  <g className="pointer-events-none">
                    {/* Vertical dashed crosshair line with cyan tint */}
                    <line
                      x1={padLeft + (hoveredActionDay / Math.max(1, daysInMonth - 1)) * plotW}
                      y1={padTop}
                      x2={padLeft + (hoveredActionDay / Math.max(1, daysInMonth - 1)) * plotW}
                      y2={baseY}
                      stroke="rgba(56, 189, 248, 0.45)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />

                    {/* Circular highlight markers on each action line */}
                    {dailyActionTrends
                      .filter((act) => !hiddenActionIds.has(act.id) && act.points[hoveredActionDay] !== undefined)
                      .map((act) => {
                        const rate = act.points[hoveredActionDay];
                        const { x, y } = mapActionCoord(hoveredActionDay + 1, rate);
                        return (
                          <g key={`action-hover-pt-${act.id}`}>
                            <circle
                              cx={x}
                              cy={y}
                              r="7"
                              fill={act.color}
                              opacity="0.35"
                            />
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#FFFFFF"
                              stroke={act.color}
                              strokeWidth="2"
                            />
                          </g>
                        );
                      })}
                  </g>
                )}

                {/* Invisible interaction capture rect */}
                <rect
                  x={padLeft}
                  y={padTop}
                  width={plotW}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                />
              </svg>

              {/* Hovering Info Stats Tooltip HUD for Daily Actions */}
              {hoveredActionDay !== null && hoveredActionDay < currentDay && (
                (() => {
                  const activeX = padLeft + (hoveredActionDay / Math.max(1, daysInMonth - 1)) * plotW;
                  const isNearRight = hoveredActionDay > daysInMonth * 0.52;
                  const leftPercent = (activeX / chartWidth) * 100;
                  const isToday = hoveredActionDay + 1 === currentDay;

                  const visibleSorted = dailyActionTrends
                    .filter((act) => !hiddenActionIds.has(act.id) && act.points[hoveredActionDay] !== undefined)
                    .sort((a, b) => b.points[hoveredActionDay] - a.points[hoveredActionDay]);

                  return (
                    <div
                      className="absolute z-30 pointer-events-none transition-all duration-75 ease-out select-none"
                      style={{
                        left: `${leftPercent}%`,
                        top: '50%',
                        transform: isNearRight ? 'translate(calc(-100% - 14px), -50%)' : 'translate(14px, -50%)',
                      }}
                    >
                      <div className="relative px-4 py-3 rounded-2xl border border-white/10 bg-[#0B0F19]/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] min-w-[170px] max-h-[260px] overflow-y-auto no-scrollbar">
                        {/* Caret notch */}
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0B0F19] border-white/10 rotate-45 ${
                            isNearRight
                              ? '-right-1.5 border-t border-r'
                              : '-left-1.5 border-b border-l'
                          }`}
                        />

                        {/* Tooltip Header Day */}
                        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/[0.08]">
                          <span className="text-xs font-mono font-bold text-[#F8FAFC]">
                            Day {hoveredActionDay + 1} ({currentMonthName})
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                              TODAY
                            </span>
                          )}
                        </div>

                        {/* Actions List with Progress Bar & Success Rate */}
                        <div className="space-y-2">
                          {visibleSorted.map((act) => {
                            const rate = act.points[hoveredActionDay];
                            return (
                              <div
                                key={`action-tt-${act.id}`}
                                className="flex items-center justify-between gap-3 font-mono text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px]"
                                    style={{ backgroundColor: act.color, color: act.color }}
                                  />
                                  <span className="text-[#E2E8F0] font-medium truncate max-w-[85px]">
                                    {act.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="h-1.5 w-12 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-150"
                                      style={{ width: `${Math.min(100, Math.max(0, rate))}%`, backgroundColor: act.color }}
                                    />
                                  </div>
                                  <span className="font-bold text-[#F8FAFC] w-8 text-right">
                                    {rate}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Daily Actions Legend Badges (Clickable toggle filters + Hover curve focus) */}
            <div className="mt-5 flex flex-wrap gap-2">
              {dailyActionTrends.map((act) => {
                const isHidden = hiddenActionIds.has(act.id);
                const isHovered = hoveredActionId === act.id;
                return (
                  <button
                    key={`act-badge-${act.id}`}
                    type="button"
                    onClick={() => toggleActionVisibility(act.id)}
                    onMouseEnter={() => setHoveredActionId(act.id)}
                    onMouseLeave={() => setHoveredActionId(null)}
                    className={`
                      px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 select-none
                      ${
                        isHidden
                          ? 'opacity-40 border-white/[0.04] bg-white/[0.02] text-[#64748B] hover:opacity-60'
                          : isHovered
                          ? 'border-white/30 bg-[#1E293B] text-white shadow-[0_0_12px_rgba(255,255,255,0.12)] scale-[1.02]'
                          : 'border-white/[0.08] bg-[#0E1526]/90 text-[#F8FAFC] hover:border-white/20 hover:bg-[#161F34]'
                      }
                    `}
                    title={`Click to ${isHidden ? 'show' : 'hide'} ${act.title}. Hover to focus curve.`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                      style={{
                        backgroundColor: isHidden ? '#475569' : act.color,
                        boxShadow: isHidden ? 'none' : `0 0 8px ${act.color}80`,
                        transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                      }}
                    />
                    <span className={isHidden ? 'line-through text-[#64748B]' : ''}>
                      {act.title.toUpperCase()}
                    </span>
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isHidden
                          ? 'bg-white/[0.03] text-[#64748B]'
                          : 'bg-white/[0.07] text-white'
                      }`}
                    >
                      {act.monthlyRate}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Subject Completion Trend Big Size Modal */}
      {isSubjectModalOpen && (
        <React.Suspense fallback={null}>
          <SubjectCompletionChartModal
            isOpen={isSubjectModalOpen}
            onClose={() => setIsSubjectModalOpen(false)}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            hiddenProgramIds={hiddenProgramIds}
            onToggleProgramVisibility={toggleProgramVisibility}
          />
        </React.Suspense>
      )}

      {/* Daily Actions Yearly Trend Medium Size Modal */}
      {isDailyActionsYearModalOpen && (
        <React.Suspense fallback={null}>
          <DailyActionsYearChartModal
            isOpen={isDailyActionsYearModalOpen}
            onClose={() => setIsDailyActionsYearModalOpen(false)}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            hiddenActionIds={hiddenActionIds}
            onToggleActionVisibility={toggleActionVisibility}
            monthsList={monthsList}
            lastPlottedMonthIdx={lastPlottedMonthIdx}
          />
        </React.Suspense>
      )}
    </div>
  );
};
