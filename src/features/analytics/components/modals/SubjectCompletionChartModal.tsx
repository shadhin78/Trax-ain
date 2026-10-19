/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Layers, Eye, EyeOff } from 'lucide-react';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { usePace } from '../../../pace/context/PaceContext';
import { useOutcome } from '../../../outcome/context/OutcomeContext';
import { VisualTimeRange } from '../VisualAnalysisSection';

export const LOCAL_STORAGE_HIDDEN_SUBJECT_IDS = 'x29_visual_hidden_subject_ids';

export interface SubjectCompletionChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeRange: VisualTimeRange;
  onTimeRangeChange: (range: VisualTimeRange) => void;
  hiddenProgramIds: Set<string>;
  onToggleProgramVisibility: (programId: string) => void;
}

const SUBJECT_PALETTE = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#A855F7', // Violet
  '#F43F5E', // Rose
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#38BDF8', // Sky
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#8B5CF6', // Purple
  '#D946EF', // Fuchsia
  '#F97316', // Orange
  '#22D3EE', // Light Cyan
  '#4ADE80', // Light Emerald
  '#E879F9', // Light Fuchsia
  '#FBBF24', // Warm Gold
  '#93C5FD', // Soft Blue
  '#A7F3D0', // Mint
  '#C084FC', // Light Violet
];

// Static Chart Geometry (Avoid dynamic recalculations)
const CHART_WIDTH = 960;
const CHART_HEIGHT = 420;
const PAD_LEFT = 52;
const PAD_RIGHT = 24;
const PAD_TOP = 26;
const PAD_BOTTOM = 48;
const PLOT_W = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
const BASE_Y = PAD_TOP + PLOT_H;
const Y_TICKS = [0, 20, 40, 60, 80, 100];

function mapSubjectCoord(monthIdx: number, pct: number, totalMonths: number) {
  const x = PAD_LEFT + (monthIdx / Math.max(1, totalMonths - 1)) * PLOT_W;
  const y = PAD_TOP + (1 - Math.min(100, Math.max(0, pct)) / 100) * PLOT_H;
  return { x, y };
}

// Helper: SVG monotonic cubic bezier curve generator (Fritsch-Carlson algorithm)
// Guarantees strictly monotonic interpolation: flat regions remain completely flat with zero dips/overshoots
function getSmoothCurvePath(points: { x: number; y: number }[], minY = 0, maxY = Infinity): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  const deltas: number[] = [];
  const dxs: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    dxs.push(dx);
    deltas.push(dx === 0 ? 0 : dy / dx);
  }

  const m: number[] = new Array(n).fill(0);
  m[0] = deltas[0];
  m[n - 1] = deltas[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const d0 = deltas[i - 1];
    const d1 = deltas[i];
    if (d0 * d1 <= 0) {
      m[i] = 0;
    } else {
      m[i] = (2 * d0 * d1) / (d0 + d1);
    }
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = dxs[i];

    let cp1x = p1.x + dx / 3;
    let cp1y = p1.y + m[i] * (dx / 3);
    let cp2x = p2.x - dx / 3;
    let cp2y = p2.y - m[i + 1] * (dx / 3);

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

export const SubjectCompletionChartModal: React.FC<SubjectCompletionChartModalProps> = ({
  isOpen,
  onClose,
  timeRange,
  onTimeRangeChange,
  hiddenProgramIds,
  onToggleProgramVisibility,
}) => {
  const { programs, subjects, chapters, completionRecords } = useAcademicHierarchy();
  const { goals, activeGoalId, activeGoal, globalGoal, globalBaseline } = usePace();
  const { freezeConfig } = useOutcome();

  // Filters state
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('ALL');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [hoveredSubId, setHoveredSubId] = useState<string | null>(null);

  // Requirement: these button action will be saved and will not reset after refresh
  const [hiddenSubjectIds, setHiddenSubjectIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_HIDDEN_SUBJECT_IDS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {
      // Fallback
    }
    return new Set();
  });

  // Persist hiddenSubjectIds to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_HIDDEN_SUBJECT_IDS,
        JSON.stringify(Array.from(hiddenSubjectIds))
      );
    } catch (err) {
      console.warn('Failed to save hiddenSubjectIds to localStorage', err);
    }
  }, [hiddenSubjectIds]);

  // Reset hovered month on modal open
  useEffect(() => {
    if (isOpen) {
      setHoveredMonth(null);
      setHoveredSubId(null);
    }
  }, [isOpen]);

  // Lock body scroll on open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ─────────────────────────────────────────────────────────────
  // 1. LINK WITH ACTIVE PACING TIMELINE (EXACT SAME START AS PROGRAM TREND)
  // ─────────────────────────────────────────────────────────────
  const timelineGoals = useMemo(() => {
    return goals.filter((g) => !g.id.startsWith('goal_subject_') && !g.id.startsWith('subject_pace_'));
  }, [goals]);

  const linkedGoal = useMemo(() => {
    if (!activeGoalId) return null;
    return timelineGoals.find((g) => g.id === activeGoalId) || null;
  }, [activeGoalId, timelineGoals]);

  // ─────────────────────────────────────────────────────────────
  // 2. TIMELINE RANGE: FROM START MONTH TO 1Y / 2Y / 3Y / LIFETIME
  // ─────────────────────────────────────────────────────────────
  const { startDate, monthsList, currentMonthIdx, lastPlottedMonthIdx } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
        // Requirement: Lifetime filter time range is strictly from the start day to present day (current month)
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

    const lastPlotted = Math.max(0, Math.min(count - 1, currentIdx));

    return {
      startDate: start,
      monthsList: months,
      currentMonthIdx: currentIdx,
      lastPlottedMonthIdx: lastPlotted,
    };
  }, [linkedGoal, globalBaseline, timeRange]);

  // ─────────────────────────────────────────────────────────────
  // 3. SUBJECT COMPLETION TREND DATA (MONTHLY PROGRESS UP TO PRESENT DATE ONLY)
  // Requirement: "most completed subject will be in 1st position this type other subject"
  // ─────────────────────────────────────────────────────────────
  const programMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    programs.forEach((p) => map.set(p.id, p));
    return map;
  }, [programs]);

  const filteredSubjects = useMemo(() => {
    if (selectedProgramFilter === 'ALL') {
      return subjects;
    }
    return subjects.filter((s) => s.programId === selectedProgramFilter);
  }, [subjects, selectedProgramFilter]);

  const subjectTrends = useMemo(() => {
    const rawList = filteredSubjects.map((sub) => {
      const parentProg = programMap.get(sub.programId);
      const progName = parentProg ? parentProg.name : 'Program';
      const subChapters = chapters.filter((c) => c.subjectId === sub.id);
      const totalCount = subChapters.length;

      // Check if subject is marked as passed in outcome freeze config (or parent program frozen)
      const isSubjectPassed = Boolean(
        freezeConfig?.frozenSubjectIds?.includes(sub.id) ||
        freezeConfig?.manualFrozenSubjectIds?.includes(sub.id) ||
        freezeConfig?.frozenProgramIds?.includes(sub.programId) ||
        freezeConfig?.manualFrozenProgramIds?.includes(sub.programId)
      );

      // Current completed count
      const currentCompletedCount = subChapters.filter(
        (c) => c.completed || c.status === 'completed'
      ).length;

      // Requirement: When marked as passed, line is at 100%
      const currentPercentage = isSubjectPassed
        ? 100
        : (totalCount > 0 ? Math.round((currentCompletedCount / totalCount) * 100) : 0);

      // Completion records for this subject
      const subRecords = completionRecords.filter((r) => r.subjectId === sub.id);

      // Collect exact timestamps for completed chapters in this subject
      const completedChapterTimes: number[] = [];

      subChapters.forEach((chap) => {
        const isDone = !chap.isSkipped && chap.status !== 'skipped' && (chap.completed || chap.status === 'completed');
        if (!isDone) return;

        const rec = subRecords.find((r) => r.chapterId === chap.id) ||
                    subRecords.find((r) => String(r.chapterNumber) === String(chap.chapterNumber));

        let completedTime: number | null = null;
        if (rec?.completedAt) {
          const t = new Date(rec.completedAt).getTime();
          if (!isNaN(t)) completedTime = t;
        }

        if (completedTime === null && chap.createdAt) {
          const t = new Date(chap.createdAt).getTime();
          if (!isNaN(t)) completedTime = t;
        }

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
        if (totalCount === 0 && !isSubjectPassed) {
          rawPoints.push(0);
          continue;
        }

        if (m === lastPlottedMonthIdx) {
          runningPct = Math.max(runningPct, currentPercentage);
          rawPoints.push(currentPercentage);
          continue;
        }

        const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0, 23, 59, 59, 999);
        const targetTime = monthEnd.getTime();

        if (targetTime >= nowTime) {
          rawPoints.push(currentPercentage);
          continue;
        }

        const completedUpToDate = completedChapterTimes.filter((t) => t <= targetTime).length;
        const rawPct = Math.min(currentPercentage, Math.round((completedUpToDate / totalCount) * 100));

        // Strict monotonicity
        runningPct = Math.max(runningPct, rawPct);
        rawPoints.push(runningPct);
      }

      const points = smoothMonotonic(rawPoints);
      if (points.length > 0) {
        points[points.length - 1] = currentPercentage;
      }

      return {
        id: sub.id,
        name: sub.name,
        programId: sub.programId,
        programName: progName,
        totalChapters: totalCount,
        completedChapters: currentCompletedCount,
        currentPercentage,
        isPassed: isSubjectPassed,
        points,
      };
    });

    // Requirement: "most completed subject will be in 1st position this type other subject"
    rawList.sort((a, b) => {
      if (b.currentPercentage !== a.currentPercentage) {
        return b.currentPercentage - a.currentPercentage; // Highest % first
      }
      return a.name.localeCompare(b.name); // Alphabetical tie-breaker
    });

    const totalMonths = monthsList.length;

    // Assign distinct palette colors in priority order of completion and precompute SVG geometry ONCE
    return rawList.map((item, idx) => {
      const color = SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length];
      const mappedPoints = item.points.map((pct, monthIdx) =>
        mapSubjectCoord(monthIdx, pct, totalMonths)
      );
      const curvePath = getSmoothCurvePath(mappedPoints, PAD_TOP, BASE_Y);
      const areaPath = item.currentPercentage > 0 ? getSmoothAreaPath(mappedPoints, BASE_Y, PAD_TOP) : '';
      const lastPt = mappedPoints[mappedPoints.length - 1] || null;

      return {
        ...item,
        color,
        mappedPoints,
        curvePath,
        areaPath,
        lastPt,
      };
    });
  }, [filteredSubjects, programMap, chapters, completionRecords, startDate, lastPlottedMonthIdx, freezeConfig, monthsList]);

  // ─────────────────────────────────────────────────────────────
  // 4. PROGRAM & SUBJECT VISIBILITY SYNC
  // Requirement: "like if hide a program from here , it will also hide those subject from the subject view pop and it will not reset after refresh"
  // ─────────────────────────────────────────────────────────────
  const isSubjectHidden = useCallback(
    (subId: string, programId: string) => {
      // 1. If the parent program is hidden, all its subjects are hidden!
      if (hiddenProgramIds.has(programId)) {
        return true;
      }
      // 2. If the subject is individually hidden
      return hiddenSubjectIds.has(subId);
    },
    [hiddenProgramIds, hiddenSubjectIds]
  );

  const toggleSubjectVisibility = useCallback(
    (subId: string, programId: string) => {
      if (hiddenProgramIds.has(programId)) {
        // If parent program was hidden, clicking this subject unhides the program so user can view it
        onToggleProgramVisibility(programId);
        setHiddenSubjectIds((prev) => {
          const next = new Set(prev);
          next.delete(subId);
          return next;
        });
      } else {
        // Toggle individual subject visibility
        setHiddenSubjectIds((prev) => {
          const next = new Set(prev);
          if (next.has(subId)) {
            next.delete(subId);
          } else {
            next.add(subId);
          }
          return next;
        });
      }
    },
    [hiddenProgramIds, onToggleProgramVisibility]
  );

  const showAllSubjects = useCallback(() => {
    setHiddenSubjectIds(new Set());
    // Also unhide all programs that were hidden so everything becomes visible
    hiddenProgramIds.forEach((progId) => {
      onToggleProgramVisibility(progId);
    });
  }, [hiddenProgramIds, onToggleProgramVisibility]);

  const hideAllSubjects = useCallback(() => {
    const allSubIds = new Set(subjectTrends.map((s) => s.id));
    setHiddenSubjectIds(allSubIds);
  }, [subjectTrends]);

  // Overall metrics summary
  const summaryStats = useMemo(() => {
    const totalSubs = subjectTrends.length;
    if (totalSubs === 0) return { totalSubs: 0, avgPct: 0, passedSubs: 0, visibleSubsCount: 0 };
    const visibleSubs = subjectTrends.filter((s) => !isSubjectHidden(s.id, s.programId));
    const sumPct = subjectTrends.reduce((acc, s) => acc + s.currentPercentage, 0);
    const avgPct = Math.round(sumPct / totalSubs);
    const passedSubs = subjectTrends.filter((s) => s.isPassed || s.currentPercentage === 100).length;
    return { totalSubs, avgPct, passedSubs, visibleSubsCount: visibleSubs.length };
  }, [subjectTrends, isSubjectHidden]);

  // ─────────────────────────────────────────────────────────────
  // 5. HIGH-PERFORMANCE THROTTLED HOVER HANDLERS
  // ─────────────────────────────────────────────────────────────
  const hoveredMonthRef = useRef<number | null>(null);
  const hoveredSubIdRef = useRef<string | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const pixelPadLeft = (PAD_LEFT / CHART_WIDTH) * rect.width;
      const pixelPlotW = (PLOT_W / CHART_WIDTH) * rect.width;
      const ratio = Math.max(0, Math.min(1, (clientX - pixelPadLeft) / pixelPlotW));
      const rawIdx = Math.round(ratio * (monthsList.length - 1));
      const boundedIdx = Math.max(0, Math.min(lastPlottedMonthIdx, rawIdx));
      if (hoveredMonthRef.current !== boundedIdx) {
        hoveredMonthRef.current = boundedIdx;
        setHoveredMonth(boundedIdx);
      }
    },
    [monthsList.length, lastPlottedMonthIdx]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!e.touches[0]) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.touches[0].clientX - rect.left;
      const pixelPadLeft = (PAD_LEFT / CHART_WIDTH) * rect.width;
      const pixelPlotW = (PLOT_W / CHART_WIDTH) * rect.width;
      const ratio = Math.max(0, Math.min(1, (clientX - pixelPadLeft) / pixelPlotW));
      const rawIdx = Math.round(ratio * (monthsList.length - 1));
      const boundedIdx = Math.max(0, Math.min(lastPlottedMonthIdx, rawIdx));
      if (hoveredMonthRef.current !== boundedIdx) {
        hoveredMonthRef.current = boundedIdx;
        setHoveredMonth(boundedIdx);
      }
    },
    [monthsList.length, lastPlottedMonthIdx]
  );

  const handleMouseLeave = useCallback(() => {
    hoveredMonthRef.current = null;
    setHoveredMonth(null);
  }, []);

  const handleSubHover = useCallback((subId: string | null) => {
    if (hoveredSubIdRef.current !== subId) {
      hoveredSubIdRef.current = subId;
      setHoveredSubId(subId);
    }
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-completion-title"
      className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-2.5 sm:p-5 md:p-6 bg-black/80 backdrop-blur-sm select-none font-mono"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1720px] h-[92vh] max-h-[95vh] flex flex-col rounded-[26px] border border-white/[0.14] bg-[#0A0E1A] shadow-[0_24px_64px_rgba(0,0,0,0.9),0_0_40px_rgba(79,70,229,0.15)] relative overflow-hidden my-auto md:animate-in md:fade-in-0 md:duration-150"
        style={{ willChange: 'opacity' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient hairline accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#818CF8]/80 to-transparent pointer-events-none" />

        {/* ── MODAL TOP HEADER ── */}
        <div className="p-4 sm:p-6 pb-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#6366F1]/25 to-[#4F46E5]/10 border border-[#6366F1]/40 text-[#818CF8] shadow-[0_0_20px_rgba(99,102,241,0.3)] shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="subject-completion-title"
                  className="text-base sm:text-lg font-black text-[#F8FAFC] tracking-wider truncate uppercase font-mono"
                >
                  SUBJECT COMPLETION TREND
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 text-[9px] font-black tracking-wider uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] animate-pulse" />
                  VISUAL ANALYSIS
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#94A3B8] font-bold tracking-wider mt-0.5 truncate uppercase">
                Cumulative subject progress percentages over time • {summaryStats.totalSubs} Subjects • {summaryStats.visibleSubsCount} Plotted • Avg {summaryStats.avgPct}%
              </p>
            </div>
          </div>

          {/* Time Range Pills & Close Button */}
          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            {/* Visual Analysis Time Range Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0E1526]/90 border border-white/[0.08]">
              {(['1Y', '2Y', '3Y', 'Life Time'] as VisualTimeRange[]).map((range) => {
                const isActive = timeRange === range;
                return (
                  <button
                    key={`range-btn-${range}`}
                    type="button"
                    onClick={() => onTimeRangeChange(range)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer
                      ${
                        isActive
                          ? 'bg-[#4F46E5] text-white shadow-sm'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    {range}
                  </button>
                );
              })}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close subject completion chart modal"
              className="p-2 rounded-xl bg-[#131722] hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── PROGRAM FILTER BAR & QUICK CONTROLS ── */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/[0.06] bg-[#0B0F19]/60 flex flex-wrap items-center justify-between gap-3">
          {/* Program filter tabs with individual program visibility sync */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mr-1 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              PROGRAM:
            </span>
            <button
              type="button"
              onClick={() => setSelectedProgramFilter('ALL')}
              className={`
                px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border
                ${
                  selectedProgramFilter === 'ALL'
                    ? 'border-[#818CF8]/50 bg-[#4F46E5]/25 text-[#A5B4FC]'
                    : 'border-transparent text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                }
              `}
            >
              ALL ({subjects.length})
            </button>
            {programs.map((prog) => {
              const count = subjects.filter((s) => s.programId === prog.id).length;
              const isSelected = selectedProgramFilter === prog.id;
              const isProgHidden = hiddenProgramIds.has(prog.id);
              return (
                <div
                  key={`prog-tab-${prog.id}`}
                  className="inline-flex items-center rounded-lg border border-white/[0.08] bg-[#0E1526]/80 p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProgramFilter(prog.id)}
                    className={`
                      px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer
                      ${
                        isSelected
                          ? 'bg-[#4F46E5]/40 text-[#A5B4FC]'
                          : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                      }
                      ${isProgHidden ? 'line-through opacity-50 text-[#64748B]' : ''}
                    `}
                    title={`Filter view to ${prog.name}`}
                  >
                    {prog.name} ({count})
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleProgramVisibility(prog.id)}
                    className={`
                      p-1 rounded-md transition-colors cursor-pointer text-xs
                      ${
                        isProgHidden
                          ? 'text-[#64748B] hover:text-[#94A3B8] hover:bg-white/[0.04]'
                          : 'text-[#818CF8] hover:text-white hover:bg-[#4F46E5]/20'
                      }
                    `}
                    title={isProgHidden ? `Show ${prog.name} program subjects` : `Hide ${prog.name} program subjects`}
                  >
                    {isProgHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Visibility Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={showAllSubjects}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-colors border border-white/[0.06] flex items-center gap-1 cursor-pointer"
              title="Show all subject lines and unhide all programs"
            >
              <Eye className="h-3 w-3" />
              Show All
            </button>
            <button
              type="button"
              onClick={hideAllSubjects}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition-colors border border-white/[0.06] flex items-center gap-1 cursor-pointer"
              title="Hide all subject lines"
            >
              <EyeOff className="h-3 w-3" />
              Hide All
            </button>
          </div>
        </div>

        {/* ── MODAL BODY: ONLY SUBJECTS LIST SCROLLABLE ON DESKTOP ── */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-3.5 sm:p-4 lg:p-5 flex flex-col">
          {subjectTrends.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-[#94A3B8]">
              <Layers className="h-10 w-10 text-[#4F46E5] mb-3 opacity-60" />
              <p className="text-sm font-bold uppercase">No subjects found for this program</p>
              <p className="text-xs text-[#64748B] mt-1">Select &quot;ALL&quot; or choose another program to view subjects.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-stretch gap-4 sm:gap-5">
              {/* ── LEFT COLUMN: SVG CHART CANVAS (EQUAL VERTICAL HEIGHT) ── */}
              <div
                className="flex-1 min-w-0 h-[380px] sm:h-[440px] lg:h-full relative cursor-crosshair select-none rounded-2xl border border-white/[0.08] bg-[#070A12] p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between overflow-hidden"
                style={{ contain: 'content' }}
                onMouseMove={handleMouseMove}
                onPointerMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onPointerLeave={handleMouseLeave}
                onTouchStart={handleTouchMove}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseLeave}
                onClick={handleMouseMove}
              >
                <div className="w-full h-full flex-1 min-h-0 relative">
                  <svg
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                    className="w-full h-full overflow-visible pointer-events-none"
                    preserveAspectRatio="none"
                  >
                  <defs>
                    {/* Gradient Defs */}
                    {subjectTrends.map((sub) => (
                      <linearGradient
                        key={`sub-grad-${sub.id}`}
                        id={`modal-sub-grad-${sub.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={sub.color} stopOpacity="0.35" />
                        <stop offset="50%" stopColor={sub.color} stopOpacity="0.12" />
                        <stop offset="85%" stopColor={sub.color} stopOpacity="0.03" />
                        <stop offset="100%" stopColor={sub.color} stopOpacity="0.0" />
                      </linearGradient>
                    ))}
                  </defs>

                  {/* Y-Axis Grid Lines & Labels */}
                  {Y_TICKS.map((val) => {
                    const y = PAD_TOP + (1 - val / 100) * PLOT_H;
                    const isCeiling = val === 100;
                    const isBaseline = val === 0;
                    return (
                      <g key={`y-grid-${val}`}>
                        <line
                          x1={PAD_LEFT}
                          y1={y}
                          x2={CHART_WIDTH - PAD_RIGHT}
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
                          x={PAD_LEFT - 10}
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
                    const x = PAD_LEFT + (idx / Math.max(1, monthsList.length - 1)) * PLOT_W;
                    const isRotated = monthsList.length > 12;
                    const isPresentMonth = idx === lastPlottedMonthIdx;
                    const isFutureMonth = idx > lastPlottedMonthIdx;

                    if (monthsList.length > 30) {
                      const isSpecial = idx === 0 || idx === lastPlottedMonthIdx || idx === monthsList.length - 1;
                      if (!isSpecial && idx % 2 !== 0) return null;
                    }

                    return (
                      <g key={`modal-month-tick-${mObj.monthIndex}`}>
                        {/* Sub-tick line on baseline */}
                        <line
                          x1={x}
                          y1={BASE_Y}
                          x2={x}
                          y2={BASE_Y + 4}
                          stroke={isPresentMonth ? '#38BDF8' : 'rgba(255, 255, 255, 0.18)'}
                          strokeWidth={isPresentMonth ? '1.5' : '1'}
                        />

                        {/* Month Label */}
                        {isRotated ? (
                          <text
                            x={x}
                            y={BASE_Y + 16}
                            transform={`rotate(-45, ${x}, ${BASE_Y + 16})`}
                            fill={isPresentMonth ? '#38BDF8' : isFutureMonth ? '#475569' : '#94A3B8'}
                            fontSize={monthsList.length > 24 ? '8' : '9'}
                            fontWeight={isPresentMonth ? '700' : '600'}
                            fontFamily="monospace"
                            textAnchor="end"
                          >
                            {mObj.label}
                          </text>
                        ) : (
                          <text
                            x={x}
                            y={BASE_Y + 18}
                            fill={isPresentMonth ? '#38BDF8' : isFutureMonth ? '#475569' : '#94A3B8'}
                            fontSize="9.5"
                            fontWeight={isPresentMonth ? '700' : '600'}
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {mObj.label}
                          </text>
                        )}

                        {/* Present Month Dot */}
                        {isPresentMonth && (
                          <circle
                            cx={x}
                            cy={BASE_Y + (isRotated ? 26 : 28)}
                            r="2"
                            fill="#38BDF8"
                            className="animate-pulse"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Area Gradient Fills under Active Subject Curves (Precalculated paths) */}
                  {subjectTrends.map((sub) => {
                    if (isSubjectHidden(sub.id, sub.programId) || !sub.areaPath) return null;
                    const isHovered = hoveredSubId === sub.id;
                    const isOtherHovered = hoveredSubId && hoveredSubId !== sub.id;

                    return (
                      <path
                        key={`sub-area-${sub.id}`}
                        d={sub.areaPath}
                        fill={`url(#modal-sub-grad-${sub.id})`}
                        opacity={isOtherHovered ? 0.06 : isHovered ? 1.0 : 0.75}
                        className="pointer-events-none transition-opacity duration-150"
                      />
                    );
                  })}

                  {/* Subject Trend Curves (Precalculated paths + GPU blended stroke glow) */}
                  {subjectTrends.map((sub) => {
                    if (isSubjectHidden(sub.id, sub.programId) || !sub.curvePath) return null;
                    const isHovered = hoveredSubId === sub.id;
                    const isOtherHovered = hoveredSubId && hoveredSubId !== sub.id;
                    const isZeroCurve = sub.currentPercentage === 0;

                    if (isZeroCurve) {
                      // Render 0% curves as subtle baseline traces to avoid dense clutter
                      return (
                        <g key={`sub-line-${sub.id}`} opacity={isOtherHovered ? 0.08 : isHovered ? 0.9 : 0.14}>
                          <path
                            d={sub.curvePath}
                            fill="none"
                            stroke={sub.color}
                            strokeWidth={isHovered ? '2.4' : '1.2'}
                            strokeLinecap="round"
                            className="pointer-events-none"
                          />
                        </g>
                      );
                    }

                    return (
                      <g key={`sub-line-${sub.id}`} opacity={isOtherHovered ? 0.16 : 1.0}>
                        {/* Background Soft Glow Line - GPU stroke alpha blend */}
                        <path
                          d={sub.curvePath}
                          fill="none"
                          stroke={sub.color}
                          strokeWidth={isHovered ? '8' : '6'}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={isHovered ? 0.35 : 0.16}
                          className="pointer-events-none"
                        />
                        {/* Main Crisp Curve Line */}
                        <path
                          d={sub.curvePath}
                          fill="none"
                          stroke={sub.color}
                          strokeWidth={isHovered ? '3.6' : '2.6'}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="pointer-events-none"
                        />
                        {/* Endpoint Pulse Beacon */}
                        {sub.lastPt && (
                          <g className="pointer-events-none">
                            <circle cx={sub.lastPt.x} cy={sub.lastPt.y} r="5" fill={sub.color} className="animate-pulse" opacity="0.4" />
                            <circle cx={sub.lastPt.x} cy={sub.lastPt.y} r="2.8" fill="#FFFFFF" stroke={sub.color} strokeWidth="2" />
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Interactive Crosshair & Highlight Dots */}
                  {hoveredMonth !== null && hoveredMonth <= lastPlottedMonthIdx && (
                    <g className="pointer-events-none">
                      {/* Vertical dashed crosshair line with cyan tint */}
                      <line
                        x1={PAD_LEFT + (hoveredMonth / Math.max(1, monthsList.length - 1)) * PLOT_W}
                        y1={PAD_TOP}
                        x2={PAD_LEFT + (hoveredMonth / Math.max(1, monthsList.length - 1)) * PLOT_W}
                        y2={BASE_Y}
                        stroke="rgba(56, 189, 248, 0.45)"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />

                      {/* Circular highlight markers on each active subject line */}
                      {subjectTrends
                        .filter((sub) => !isSubjectHidden(sub.id, sub.programId) && sub.mappedPoints[hoveredMonth] && sub.currentPercentage > 0)
                        .map((sub) => {
                          const pt = sub.mappedPoints[hoveredMonth];
                          return (
                            <g key={`hover-pt-${sub.id}`}>
                              <circle cx={pt.x} cy={pt.y} r="6" fill={sub.color} opacity="0.3" />
                              <circle cx={pt.x} cy={pt.y} r="3.5" fill="#FFFFFF" stroke={sub.color} strokeWidth="2" />
                            </g>
                          );
                        })}
                    </g>
                  )}

                  {/* Interaction capture rect */}
                  <rect
                    x={PAD_LEFT}
                    y={PAD_TOP}
                    width={PLOT_W}
                    height={PLOT_H}
                    fill="transparent"
                    className="cursor-crosshair"
                  />
                </svg>

                {/* Hovering Info Stats Tooltip HUD */}
                {hoveredMonth !== null && hoveredMonth <= lastPlottedMonthIdx && monthsList[hoveredMonth] && (
                  (() => {
                    const activeX = PAD_LEFT + (hoveredMonth / Math.max(1, monthsList.length - 1)) * PLOT_W;
                    const isNearRight = hoveredMonth > monthsList.length * 0.52;
                    const leftPercent = (activeX / CHART_WIDTH) * 100;
                    const isPresentMonth = hoveredMonth === lastPlottedMonthIdx;

                    // Sort visible subjects descending by percentage at hovered month
                    const visibleSubs = subjectTrends
                      .filter((sub) => !isSubjectHidden(sub.id, sub.programId) && sub.points[hoveredMonth] !== undefined)
                      .sort((a, b) => b.points[hoveredMonth] - a.points[hoveredMonth]);

                    return (
                      <div
                        className="absolute z-30 pointer-events-none transition-all duration-75 ease-out select-none"
                        style={{
                          left: `${leftPercent}%`,
                          top: '50%',
                          transform: isNearRight ? 'translate(calc(-100% - 14px), -50%)' : 'translate(14px, -50%)',
                        }}
                      >
                        <div className="relative px-4 py-3 rounded-2xl border border-white/10 bg-[#0B0F19] shadow-[0_12px_36px_rgba(0,0,0,0.85)] min-w-[210px] max-w-[360px]">
                          {/* Caret notch */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0B0F19] border-white/10 rotate-45 ${
                              isNearRight
                                ? '-right-1.5 border-t border-r'
                                : '-left-1.5 border-b border-l'
                            }`}
                          />

                          {/* Tooltip Header Date */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08] gap-2">
                            <span className="text-xs font-mono font-bold text-[#F8FAFC]">
                              {monthsList[hoveredMonth].label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isPresentMonth && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                                  PRESENT
                                </span>
                              )}
                              <span className="text-[10px] text-[#94A3B8] font-bold">
                                {visibleSubs.length} Subs
                              </span>
                            </div>
                          </div>

                          {/* Subjects List with Scroll if many */}
                          {visibleSubs.length === 0 ? (
                            <p className="text-[11px] text-[#64748B] italic">All subjects hidden</p>
                          ) : (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 no-scrollbar" style={{ contain: 'content' }}>
                              {visibleSubs.map((sub) => {
                                const pct = sub.points[hoveredMonth];
                                return (
                                  <div
                                    key={`modal-tt-${sub.id}`}
                                    className="flex items-center justify-between gap-3 font-mono text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px]"
                                        style={{ backgroundColor: sub.color, color: sub.color }}
                                      />
                                      <span className="text-[#E2E8F0] font-medium truncate max-w-[130px]" title={sub.name}>
                                        {sub.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="h-1.5 w-12 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all duration-150"
                                          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: sub.color }}
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
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
                </div>
              </div>

              {/* ── RIGHT COLUMN: SCROLLABLE SUBJECTS LIST (EQUAL VERTICAL HEIGHT) ── */}
              <div
                className="w-full lg:w-[350px] xl:w-[390px] 2xl:w-[420px] shrink-0 h-[360px] lg:h-full flex flex-col rounded-2xl border border-white/[0.08] bg-[#070A12] p-3.5 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
                style={{ contain: 'content' }}
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-white/[0.08] shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers className="h-4 w-4 text-[#818CF8] shrink-0" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC] truncate">
                      SUBJECTS ({subjectTrends.length})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 shrink-0">
                    {summaryStats.visibleSubsCount} VISIBLE
                  </span>
                </div>

                {/* Legend Hint */}
                <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] mb-2 px-1 shrink-0">
                  <span>CLICK TO TOGGLE • HOVER TO FOCUS</span>
                  <span className="text-[#94A3B8]">RANKED #1-#{subjectTrends.length}</span>
                </div>

                {/* Scrollable Subjects Container */}
                <div
                  className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1.5 custom-scrollbar"
                  style={{ contain: 'content', willChange: 'scroll-position' }}
                >
                  {subjectTrends.map((sub, sIdx) => {
                    const isHidden = isSubjectHidden(sub.id, sub.programId);
                    const isProgHidden = hiddenProgramIds.has(sub.programId);
                    const isHovered = hoveredSubId === sub.id;

                    return (
                      <button
                        key={`sub-legend-badge-${sub.id}`}
                        type="button"
                        onClick={() => toggleSubjectVisibility(sub.id, sub.programId)}
                        onMouseEnter={() => handleSubHover(sub.id)}
                        onMouseLeave={() => handleSubHover(null)}
                        className={`
                          w-full px-2.5 py-2 rounded-xl border flex items-center justify-between gap-2.5 font-mono text-xs cursor-pointer shadow-sm select-none text-left transition-colors duration-100
                          ${
                            isHidden
                              ? 'opacity-35 border-white/[0.04] bg-white/[0.02] text-[#64748B] hover:opacity-60'
                              : isHovered
                              ? 'border-[#818CF8]/70 bg-[#161F38] text-white shadow-[0_0_14px_rgba(129,140,248,0.2)]'
                              : 'border-white/[0.06] bg-[#0E1526] text-[#F8FAFC] hover:border-white/20 hover:bg-[#121B2F]'
                          }
                        `}
                        title={`${sub.name} (${sub.currentPercentage}% completed)${isProgHidden ? ' - Program hidden' : ''}\nClick to toggle visibility. Hover to spotlight line.`}
                      >
                        {/* Left: Rank, Color Indicator, Truncated Name with dot ........ */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Rank badge */}
                          <span className={`text-[10px] font-extrabold w-5 shrink-0 ${sIdx === 0 && sub.currentPercentage > 0 ? 'text-[#34D399]' : 'text-[#64748B]'}`}>
                            #{sIdx + 1}
                          </span>

                          {/* Glowing Color Dot */}
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: isHidden ? '#475569' : sub.color,
                              boxShadow: isHidden ? 'none' : `0 0 8px ${sub.color}90`,
                            }}
                          />

                          {/* Truncated Name with dot ........ if long */}
                          <span
                            className={`truncate text-xs font-medium ${
                              isHidden ? 'line-through text-[#64748B]' : isHovered ? 'text-white font-bold' : 'text-[#E2E8F0]'
                            }`}
                          >
                            {sub.name}
                          </span>
                        </div>

                        {/* Right: Percentage & Eye Toggle */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded text-right min-w-[38px] ${
                              isHidden
                                ? 'bg-white/[0.03] text-[#64748B]'
                                : sub.currentPercentage > 0
                                ? 'bg-white/[0.08] text-[#38BDF8]'
                                : 'bg-white/[0.03] text-[#94A3B8]'
                            }`}
                          >
                            {sub.currentPercentage}%
                          </span>

                          {/* Micro Eye Indicator */}
                          <div className={`p-0.5 rounded ${isHidden ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>
                            {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3 text-[#38BDF8]/70" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
