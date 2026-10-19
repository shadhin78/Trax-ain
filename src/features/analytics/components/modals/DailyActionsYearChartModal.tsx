/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Presentation, LayoutGrid, Calendar } from 'lucide-react';
import { useDailyActions, toIsoDate } from '../../../daily-actions/context/DailyActionsContext';
import { VisualTimeRange, ACTION_COLOR_PALETTE } from '../VisualAnalysisSection';

export interface DailyActionsYearChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeRange: VisualTimeRange;
  onTimeRangeChange: (range: VisualTimeRange) => void;
  hiddenActionIds: Set<string>;
  onToggleActionVisibility: (actionId: string) => void;
  monthsList: { monthIndex: number; date: Date; label: string; time: number }[];
  lastPlottedMonthIdx: number;
}

// Static Chart Geometry (Avoid dynamic recalculations)
const CHART_WIDTH = 1400;
const CHART_HEIGHT = 340;
const PAD_LEFT = 52;
const PAD_RIGHT = 24;
const PAD_TOP = 24;
const PAD_BOTTOM = 42;
const PLOT_W = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
const BASE_Y = PAD_TOP + PLOT_H;
const Y_TICKS = [0, 20, 40, 60, 80, 100];

function mapActionCoord(mIdx: number, rate: number, totalMonths: number) {
  const x = PAD_LEFT + (mIdx / Math.max(1, totalMonths - 1)) * PLOT_W;
  const y = PAD_TOP + (1 - Math.min(100, Math.max(0, rate)) / 100) * PLOT_H;
  return { x, y };
}

// Helper: Bell-type curve path generator
// Guarantees smooth Gaussian / bell-shaped domes at local peaks with horizontal tangents (m = 0),
// horizontal take-off and landing at 0% baseline (m = 0), and strictly non-oscillating S-curves
function getBellCurvePath(
  points: { x: number; y: number }[],
  padTop: number,
  baseY: number
): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  // 1. Calculate tangents (slopes) at each point
  const slopes: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const pt = points[i];

    // If point is on the 0% baseline or at 100% ceiling, tangent must be strictly horizontal
    if (Math.abs(pt.y - baseY) < 0.5 || Math.abs(pt.y - padTop) < 0.5) {
      slopes[i] = 0;
      continue;
    }

    const prevPt = i > 0 ? points[i - 1] : null;
    const nextPt = i < n - 1 ? points[i + 1] : null;

    // Check if point is a local peak (apex of the bell dome):
    // In SVG screen coords, smaller y means higher rate. So local maximum rate is local minimum y!
    const isPeak =
      (!prevPt || pt.y <= prevPt.y) &&
      (!nextPt || pt.y <= nextPt.y) &&
      (prevPt?.y !== pt.y || nextPt?.y !== pt.y);

    // Check if point is a local trough:
    const isTrough =
      (!prevPt || pt.y >= prevPt.y) &&
      (!nextPt || pt.y >= nextPt.y) &&
      (prevPt?.y !== pt.y || nextPt?.y !== pt.y);

    if (isPeak || isTrough) {
      // Zero slope at peaks/troughs ensures a perfectly rounded, symmetrical bell dome crown
      slopes[i] = 0;
      continue;
    }

    if (prevPt && nextPt) {
      const s0 = (pt.y - prevPt.y) / (pt.x - prevPt.x);
      const s1 = (nextPt.y - pt.y) / (nextPt.x - pt.x);

      if (s0 * s1 <= 0) {
        slopes[i] = 0;
      } else {
        // Harmonic mean for monotonic slope transitions
        slopes[i] = (2 * s0 * s1) / (s0 + s1);
      }
    } else if (prevPt) {
      slopes[i] = (pt.y - prevPt.y) / (pt.x - prevPt.x);
    } else if (nextPt) {
      slopes[i] = (nextPt.y - pt.y) / (nextPt.x - pt.x);
    }
  }

  // 2. Generate smooth Cubic Bézier segments
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < n - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;

    // If both adjacent points are on the 0% baseline, keep segment completely flat
    if (Math.abs(p1.y - baseY) < 0.5 && Math.abs(p2.y - baseY) < 0.5) {
      path += ` L ${p2.x.toFixed(1)} ${baseY.toFixed(1)}`;
      continue;
    }

    // Bell curve tension factor (0.40 produces beautiful Gaussian bell curves)
    const alpha = 0.40;
    const m1 = slopes[i];
    const m2 = slopes[i + 1];

    let cp1x = p1.x + dx * alpha;
    let cp1y = p1.y + m1 * (dx * alpha);
    let cp2x = p2.x - dx * alpha;
    let cp2y = p2.y - m2 * (dx * alpha);

    // Strictly clamp within boundaries [padTop, baseY]
    cp1y = Math.min(baseY, Math.max(padTop, cp1y));
    cp2y = Math.min(baseY, Math.max(padTop, cp2y));

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

// Helper: SVG smooth area path generator (closed at baseline)
function getSmoothAreaPath(
  points: { x: number; y: number }[],
  baseY: number,
  padTop: number
): string {
  if (points.length === 0) return '';
  const curve = getBellCurvePath(points, padTop, baseY);
  const first = points[0];
  const last = points[points.length - 1];
  return `${curve} L ${last.x.toFixed(1)} ${baseY.toFixed(1)} L ${first.x.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

// ─────────────────────────────────────────────────────────────
// MEMOIZED SECTION 2: GITHUB-STYLE DAY-WISE HEATMAP
// Prevents 371 buttons from re-rendering when hovering the line chart!
// ─────────────────────────────────────────────────────────────
interface HeatmapDayItem {
  date: Date;
  iso: string;
  isToday: boolean;
  isFuture: boolean;
  completedCount: number;
  totalCount: number;
  percentage: number;
  tier: 0 | 1 | 2 | 3 | 4;
  completedActionTitles: string[];
}

interface HeatmapWeekItem {
  weekIndex: number;
  days: HeatmapDayItem[];
}

interface HeatmapDataProps {
  weeks: HeatmapWeekItem[];
  monthLabels: { weekCol: number; label: string }[];
  totalCompletedHits: number;
  eligibleDaysCount: number;
}

interface ConsistencyHeatmapSectionProps {
  heatmapData: HeatmapDataProps;
  selectedDateIso: string;
  onSelectDate: (iso: string) => void;
}

const ConsistencyHeatmapSection: React.FC<ConsistencyHeatmapSectionProps> = React.memo(
  ({ heatmapData, selectedDateIso, onSelectDate }) => {
    return (
      <div
        className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0E1526] p-4 sm:p-5 lg:p-6 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
        style={{ contain: 'content' }}
      >
        {/* Heatmap Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-white/[0.06] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-[#34D399]" />
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#F8FAFC]">
                CONSISTENCY HEATMAP (DAY-WISE)
              </h3>
            </div>
            <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
              Day-wise habits activity matrix • The more score, the greener the square
            </p>
          </div>

          {/* GitHub Legend: Less -> More */}
          <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] font-mono font-bold self-end sm:self-auto">
            <span>Less</span>
            <div className="h-3.5 w-3.5 rounded-[3px] bg-white/[0.04] border border-white/[0.06]" title="0 actions completed" />
            <div className="h-3.5 w-3.5 rounded-[3px] bg-[#064E3B]/80 border border-[#10B981]/30" title="1 - 25% completed" />
            <div className="h-3.5 w-3.5 rounded-[3px] bg-[#047857] border border-[#10B981]/50 shadow-[0_0_4px_rgba(16,185,129,0.3)]" title="26 - 50% completed" />
            <div className="h-3.5 w-3.5 rounded-[3px] bg-[#10B981] border border-[#34D399] shadow-[0_0_6px_rgba(16,185,129,0.5)]" title="51 - 75% completed" />
            <div className="h-3.5 w-3.5 rounded-[3px] bg-[#34D399] border border-[#6EE7B7] shadow-[0_0_8px_rgba(52,211,153,0.7)]" title="76 - 100% completed" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap 53-Week Grid */}
        <div className="overflow-x-auto pb-2 pt-1 no-scrollbar">
          <div className="min-w-fit space-y-1.5">
            {/* Month labels along the top */}
            <div className="flex gap-1 sm:gap-1.5 pl-6 sm:pl-7 text-[10px] text-[#94A3B8] font-mono font-bold h-4">
              {heatmapData.weeks.map((week, idx) => {
                const monthItem = heatmapData.monthLabels.find((m) => m.weekCol === idx);
                return (
                  <div key={`m-lbl-${idx}`} className="w-3.5 sm:w-4 shrink-0 relative">
                    {monthItem && (
                      <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] text-[#94A3B8]">
                        {monthItem.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Day Rows with Weekday labels (Mon, Wed, Fri aligned) */}
            <div className="flex gap-1 sm:gap-1.5 items-start">
              {/* Weekday Labels Column */}
              <div className="flex flex-col gap-1 sm:gap-1.5 text-[9px] text-[#64748B] pr-1 select-none shrink-0 font-mono">
                <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end"></span>
                <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end font-semibold">Mon</span>
                <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end"></span>
                <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end font-semibold">Wed</span>
                <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end"></span>
                <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end font-semibold">Fri</span>
                <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end"></span>
              </div>

              {/* 53 Week Columns */}
              <div className="flex gap-1 sm:gap-1.5">
                {heatmapData.weeks.map((week) => (
                  <div key={`heat-w-${week.weekIndex}`} className="flex flex-col gap-1 sm:gap-1.5">
                    {week.days.map((day) => {
                      const isSelected = selectedDateIso === day.iso;

                      // Color tier class for green intensity
                      let tierClasses = 'bg-white/[0.04] border border-white/[0.04] hover:border-white/20';
                      if (day.isFuture) {
                        tierClasses = 'bg-transparent border border-white/[0.03] opacity-30 cursor-not-allowed';
                      } else if (day.tier === 1) {
                        tierClasses = 'bg-[#064E3B]/80 border border-[#10B981]/30 hover:border-[#10B981]/60';
                      } else if (day.tier === 2) {
                        tierClasses = 'bg-[#047857] border border-[#10B981]/50 hover:border-[#34D399] shadow-[0_0_4px_rgba(16,185,129,0.3)]';
                      } else if (day.tier === 3) {
                        tierClasses = 'bg-[#10B981] border border-[#34D399] hover:border-white shadow-[0_0_8px_rgba(16,185,129,0.5)]';
                      } else if (day.tier === 4) {
                        tierClasses = 'bg-[#34D399] border border-[#6EE7B7] hover:border-white shadow-[0_0_12px_rgba(52,211,153,0.7)]';
                      }

                      return (
                        <button
                          key={`heat-d-${day.iso}`}
                          type="button"
                          onClick={() => onSelectDate(day.iso)}
                          className={`
                            h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[3.5px] cursor-pointer outline-none transition-colors duration-100
                            ${tierClasses}
                            ${
                              isSelected
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0B0F19] scale-110 z-10 shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                                : ''
                            }
                          `}
                          title={`${day.iso}: ${day.completedCount}/${day.totalCount} completed (${day.percentage}%) - Click to inspect`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export const DailyActionsYearChartModal: React.FC<DailyActionsYearChartModalProps> = ({
  isOpen,
  onClose,
  timeRange,
  onTimeRangeChange,
  hiddenActionIds,
  onToggleActionVisibility,
  monthsList,
  lastPlottedMonthIdx,
}) => {
  const { dailyActions, currentDayIso } = useDailyActions();

  // Hover state for interactive line chart tooltip
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);

  // Selected date for GitHub-style day-wise heatmap inspection (defaults to today)
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() => {
    return currentDayIso || toIsoDate(new Date());
  });

  // Reset selected date to today when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDateIso(currentDayIso || toIsoDate(new Date()));
      setHoveredMonthIdx(null);
      setHoveredActionId(null);
    }
  }, [isOpen, currentDayIso]);

  // Keyboard shortcut: close on Escape
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

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Current temporal reference
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();

  // ─────────────────────────────────────────────────────────────
  // 1. DYNAMIC COMPUTATION OF MONTHLY CONSISTENCY (BELL-TYPE YEARLY TREND)
  // Requirement: "most completed subject will be in 1st position this type other subject"
  // Applied to daily actions: most completed / consistent habit in 1st position!
  // ─────────────────────────────────────────────────────────────
  const actionsWithTrends = useMemo(() => {
    const rawList = dailyActions.map((action) => {
      // Calculate consistency rate for all months in monthsList
      // Future months after lastPlottedMonthIdx have rate = 0% to form the smooth bell descent
      const monthlyPoints: number[] = [];

      for (let mIdx = 0; mIdx < monthsList.length; mIdx++) {
        const mItem = monthsList[mIdx];
        const mDate = mItem.date;
        const y = mDate.getFullYear();
        const m = mDate.getMonth();
        const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;

        const isCurrentMonth = y === currentYear && m === currentMonth;
        const isPastMonth = y < currentYear || (y === currentYear && m < currentMonth);

        let rate = 0;
        if (isCurrentMonth) {
          // For current month: completed days in current month up to today / passed days so far
          const completedCount = (action.completedDates || []).filter((d) => {
            if (!d.startsWith(monthPrefix)) return false;
            const dayNum = parseInt(d.split('-')[2], 10);
            return !isNaN(dayNum) && dayNum <= currentDay;
          }).length;
          rate = currentDay > 0 ? Math.round((completedCount / currentDay) * 100) : 0;
        } else if (isPastMonth) {
          // For past month: completed days / total days in that month
          const daysInThisMonth = new Date(y, m + 1, 0).getDate();
          const completedCount = (action.completedDates || []).filter((d) =>
            d.startsWith(monthPrefix)
          ).length;
          rate = daysInThisMonth > 0 ? Math.round((completedCount / daysInThisMonth) * 100) : 0;
        } else {
          // Future month: 0% landing to complete the bell curve descent
          rate = 0;
        }

        monthlyPoints.push(Math.min(100, Math.max(0, rate)));
      }

      // Current month rate (at lastPlottedMonthIdx)
      const currentMonthRate =
        lastPlottedMonthIdx >= 0 && lastPlottedMonthIdx < monthlyPoints.length
          ? monthlyPoints[lastPlottedMonthIdx]
          : (monthlyPoints[monthlyPoints.length - 1] ?? 0);

      return {
        id: action.id,
        title: action.title,
        monthlyPoints,
        currentMonthRate,
      };
    });

    // Sort descending by currentMonthRate so the most completed habit is 1st!
    rawList.sort((a, b) => {
      if (b.currentMonthRate !== a.currentMonthRate) {
        return b.currentMonthRate - a.currentMonthRate;
      }
      return a.title.localeCompare(b.title);
    });

    const totalMonths = monthsList.length;

    // Assign distinct palette colors in priority order of completion and precompute SVG geometry ONCE
    return rawList.map((item, idx) => {
      const color = ACTION_COLOR_PALETTE[idx % ACTION_COLOR_PALETTE.length];
      const mappedPoints = item.monthlyPoints.map((rate, mIdx) =>
        mapActionCoord(mIdx, rate, totalMonths)
      );
      const curvePath = getBellCurvePath(mappedPoints, PAD_TOP, BASE_Y);
      const areaPath = item.currentMonthRate > 0 ? getSmoothAreaPath(mappedPoints, BASE_Y, PAD_TOP) : '';
      const currentPt = mappedPoints[Math.min(mappedPoints.length - 1, lastPlottedMonthIdx)] || null;

      return {
        ...item,
        color,
        mappedPoints,
        curvePath,
        areaPath,
        currentPt,
      };
    });
  }, [dailyActions, monthsList, lastPlottedMonthIdx, currentYear, currentMonth, currentDay]);

  // ─────────────────────────────────────────────────────────────
  // 2. HIGH-PERFORMANCE THROTTLED HOVER HANDLERS
  // ─────────────────────────────────────────────────────────────
  const hoveredMonthRef = useRef<number | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const pixelPadLeft = (PAD_LEFT / CHART_WIDTH) * rect.width;
      const pixelPlotW = (PLOT_W / CHART_WIDTH) * rect.width;
      const ratio = Math.max(0, Math.min(1, (clientX - pixelPadLeft) / pixelPlotW));
      const nearestIdx = Math.round(ratio * (monthsList.length - 1));
      const clamped = Math.min(monthsList.length - 1, Math.max(0, nearestIdx));
      if (hoveredMonthRef.current !== clamped) {
        hoveredMonthRef.current = clamped;
        setHoveredMonthIdx(clamped);
      }
    },
    [monthsList.length]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!e.touches[0]) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.touches[0].clientX - rect.left;
      const pixelPadLeft = (PAD_LEFT / CHART_WIDTH) * rect.width;
      const pixelPlotW = (PLOT_W / CHART_WIDTH) * rect.width;
      const ratio = Math.max(0, Math.min(1, (clientX - pixelPadLeft) / pixelPlotW));
      const nearestIdx = Math.round(ratio * (monthsList.length - 1));
      const clamped = Math.min(monthsList.length - 1, Math.max(0, nearestIdx));
      if (hoveredMonthRef.current !== clamped) {
        hoveredMonthRef.current = clamped;
        setHoveredMonthIdx(clamped);
      }
    },
    [monthsList.length]
  );

  const handleMouseLeave = useCallback(() => {
    hoveredMonthRef.current = null;
    setHoveredMonthIdx(null);
    setHoveredActionId(null);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 3. GITHUB-STYLE DAY-WISE HEATMAP DATA (THE MORE SCORE, THE MORE GREENER)
  // ─────────────────────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const refDate = new Date();
    refDate.setHours(0, 0, 0, 0);

    // End on the Saturday of the current week
    const endOfWeek = new Date(refDate);
    endOfWeek.setDate(refDate.getDate() + (6 - refDate.getDay()));

    const numWeeks = 53;
    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(endOfWeek.getDate() - (numWeeks * 7 - 1));

    const weeks: {
      weekIndex: number;
      days: {
        date: Date;
        iso: string;
        isToday: boolean;
        isFuture: boolean;
        completedCount: number;
        totalCount: number;
        percentage: number;
        tier: 0 | 1 | 2 | 3 | 4;
        completedActionTitles: string[];
      }[];
    }[] = [];

    const monthLabels: { label: string; weekCol: number }[] = [];
    let lastMonth = -1;

    const cur = new Date(startOfWeek);
    const totalActions = dailyActions.length;

    let totalCompletedHits = 0;
    let eligibleDaysCount = 0;

    for (let w = 0; w < numWeeks; w++) {
      const daysInThisWeek = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dateCopy = new Date(cur);
        const iso = toIsoDate(dateCopy);
        const isFuture = dateCopy.getTime() > refDate.getTime();
        const isToday = iso === toIsoDate(refDate);
        const month = dateCopy.getMonth();

        // Track month label on the first week of each month
        if (month !== lastMonth && dayOfWeek === 0) {
          monthLabels.push({
            label: dateCopy.toLocaleDateString('en-US', { month: 'short' }),
            weekCol: w,
          });
          lastMonth = month;
        }

        const completedForDay = dailyActions.filter((act) =>
          act.completedDates?.includes(iso)
        );
        const completedCount = completedForDay.length;
        const percentage = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;

        // Color tiers (the more score, the more greener):
        // Tier 0: 0 actions completed
        // Tier 1: 1 - 25% of total actions
        // Tier 2: 26 - 50% of total actions
        // Tier 3: 51 - 75% of total actions
        // Tier 4: 76 - 100% of total actions
        let tier: 0 | 1 | 2 | 3 | 4 = 0;
        if (!isFuture && completedCount > 0) {
          if (percentage <= 25) tier = 1;
          else if (percentage <= 50) tier = 2;
          else if (percentage <= 75) tier = 3;
          else tier = 4;

          totalCompletedHits += completedCount;
        }

        if (!isFuture) {
          eligibleDaysCount++;
        }

        daysInThisWeek.push({
          date: dateCopy,
          iso,
          isToday,
          isFuture,
          completedCount,
          totalCount: totalActions,
          percentage,
          tier,
          completedActionTitles: completedForDay.map((a) => a.title),
        });

        cur.setDate(cur.getDate() + 1);
      }
      weeks.push({ weekIndex: w, days: daysInThisWeek });
    }

    return {
      weeks,
      monthLabels,
      totalCompletedHits,
      eligibleDaysCount,
    };
  }, [dailyActions]);

  // ─────────────────────────────────────────────────────────────
  // 4. SELECTED DAY INSPECTION DATA & HABITS BREAKDOWN
  // ─────────────────────────────────────────────────────────────
  const selectedDayDetails = useMemo(() => {
    const refDate = new Date();
    refDate.setHours(0, 0, 0, 0);

    const [y, m, d] = (selectedDateIso || toIsoDate(refDate)).split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dateObj.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const isFuture = diffDays > 0;
    const isToday = diffDays === 0;

    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let relativeLabel = '';
    let relativeBadgeStyle = 'bg-white/[0.05] text-[#94A3B8] border-white/[0.1]';

    if (isToday) {
      relativeLabel = 'Today';
      relativeBadgeStyle = 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30';
    } else if (diffDays === -1) {
      relativeLabel = 'Yesterday';
      relativeBadgeStyle = 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30';
    } else if (diffDays < -1) {
      relativeLabel = `${Math.abs(diffDays)}d ago`;
      relativeBadgeStyle = 'bg-white/[0.05] text-[#94A3B8] border-white/[0.1]';
    } else {
      relativeLabel = diffDays === 1 ? 'Tomorrow' : `In ${diffDays}d`;
      relativeBadgeStyle = 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30';
    }

    const actionsStatus = dailyActions.map((act) => {
      const isDone = Boolean(act.completedDates?.includes(selectedDateIso));
      return {
        id: act.id,
        title: act.title,
        color: act.themeColor || '#10B981',
        isDone,
      };
    });

    const completedCount = actionsStatus.filter((a) => a.isDone).length;
    const totalCount = actionsStatus.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      formattedDate,
      relativeLabel,
      relativeBadgeStyle,
      isFuture,
      isToday,
      completedCount,
      totalCount,
      percentage,
      actionsStatus,
    };
  }, [selectedDateIso, dailyActions]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="yearly-trend-title"
      className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm select-none font-mono"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1680px] 2xl:max-w-[1720px] max-h-[96vh] flex flex-col rounded-[26px] border border-white/[0.12] bg-[#0A0E1A] shadow-[0_24px_64px_rgba(0,0,0,0.9),0_0_40px_rgba(37,99,235,0.15)] relative overflow-hidden my-auto md:animate-in md:fade-in-0 md:duration-150"
        style={{ willChange: 'opacity' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient hairline accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#38BDF8]/80 to-transparent pointer-events-none" />

        {/* ── MODAL HEADER ── */}
        <div className="p-4 sm:p-5 lg:p-6 pb-3.5 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-[#2563EB]/25 to-[#1D4ED8]/10 border border-[#2563EB]/40 text-[#60A5FA] shadow-[0_0_20px_rgba(37,99,235,0.25)] shrink-0">
              <Presentation className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="yearly-trend-title"
                  className="text-xl sm:text-2xl font-black text-[#F8FAFC] tracking-tight font-mono"
                >
                  Yearly Trend
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 text-[9px] font-black tracking-wider uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] animate-pulse" />
                  CONSISTENCY ANALYSIS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#94A3B8] font-medium tracking-wide mt-0.5 font-mono">
                Monthly consistency comparison & day-wise GitHub habit heatmap.
              </p>
            </div>
          </div>

          {/* Time Range Filter Pills & Close Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Visual Analysis Main Filter Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0E1526]/90 border border-white/[0.08]">
              {(['1Y', '2Y', '3Y', 'Life Time'] as VisualTimeRange[]).map((range) => {
                const isActive = timeRange === range;
                return (
                  <button
                    key={`modal-range-btn-${range}`}
                    type="button"
                    onClick={() => onTimeRangeChange(range)}
                    className={`
                      px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer
                      ${
                        isActive
                          ? 'bg-[#2563EB] text-white shadow-sm'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                      }
                    `}
                    title={`Set filter to ${range}`}
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
              aria-label="Close yearly trend modal"
              className="p-2 sm:p-2.5 rounded-2xl bg-[#131B2E] hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── MODAL SCROLLABLE BODY ── */}
        <div
          className="p-4 sm:p-5 lg:p-6 overflow-y-auto no-scrollbar flex-1 space-y-5"
          style={{ willChange: 'scroll-position' }}
        >
          {/* ─────────────────────────────────────────────────────────────
              SECTION 1: YEARLY TREND BELL-TYPE LINE CHART
          ───────────────────────────────────────────────────────────── */}
          <div
            className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0E1526] p-4 sm:p-5 lg:p-6 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            style={{ contain: 'content' }}
          >
            <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2.5">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                MONTH-WISE BELL-TYPE CONSISTENCY CURVES
              </span>
              <span className="text-[11px] text-[#64748B] font-mono">
                {monthsList.length} Months Plotted
              </span>
            </div>

            {/* Interactive SVG Chart Area */}
            <div
              className="w-full aspect-[1400/340] relative cursor-crosshair select-none rounded-2xl border border-white/[0.08] bg-[#070A12] p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
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
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="w-full h-full overflow-visible pointer-events-none"
              >
                <defs>
                  {/* Gradient Area Defs */}
                  {actionsWithTrends.map((act) => (
                    <linearGradient
                      key={`modal-grad-${act.id}`}
                      id={`modal-action-grad-${act.id}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={act.color} stopOpacity="0.30" />
                      <stop offset="50%" stopColor={act.color} stopOpacity="0.10" />
                      <stop offset="85%" stopColor={act.color} stopOpacity="0.02" />
                      <stop offset="100%" stopColor={act.color} stopOpacity="0.0" />
                    </linearGradient>
                  ))}
                </defs>

                {/* Y-Axis Horizontal Grid Lines & Labels */}
                {Y_TICKS.map((val) => {
                  const y = PAD_TOP + (1 - val / 100) * PLOT_H;
                  const isCeiling = val === 100;
                  const isBaseline = val === 0;
                  return (
                    <g key={`modal-y-grid-${val}`}>
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

                {/* X-Axis Month Labels & Indicators */}
                {monthsList.map((mItem, mIdx) => {
                  const totalMonths = Math.max(1, monthsList.length - 1);
                  const x = PAD_LEFT + (mIdx / totalMonths) * PLOT_W;
                  const isPresentMonth = mIdx === lastPlottedMonthIdx;
                  const isFutureMonth = mIdx > lastPlottedMonthIdx;
                  const isRotated = monthsList.length > 18;

                  return (
                    <g key={`modal-x-month-${mItem.label}-${mIdx}`}>
                      {/* Baseline Tick */}
                      <line
                        x1={x}
                        y1={BASE_Y}
                        x2={x}
                        y2={BASE_Y + 4}
                        stroke={isPresentMonth ? '#38BDF8' : 'rgba(255, 255, 255, 0.18)'}
                        strokeWidth={isPresentMonth ? '1.5' : '1'}
                      />

                      {/* Label Text */}
                      <text
                        x={x}
                        y={BASE_Y + (isRotated ? 16 : 18)}
                        transform={isRotated ? `rotate(-45, ${x}, ${BASE_Y + 16})` : undefined}
                        fill={isPresentMonth ? '#38BDF8' : isFutureMonth ? '#475569' : '#94A3B8'}
                        fontSize="9.5"
                        fontWeight={isPresentMonth ? '700' : '600'}
                        fontFamily="monospace"
                        textAnchor={isRotated ? 'end' : 'middle'}
                      >
                        {mItem.label}
                      </text>

                      {/* Present Month Beacon Dot */}
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

                {/* Area Gradient Fills under Active Curves (Precalculated paths) */}
                {actionsWithTrends.map((act) => {
                  if (hiddenActionIds.has(act.id) || !act.areaPath) return null;
                  const isHovered = hoveredActionId === act.id;
                  const isOtherHovered = hoveredActionId && hoveredActionId !== act.id;

                  return (
                    <path
                      key={`modal-act-area-${act.id}`}
                      d={act.areaPath}
                      fill={`url(#modal-action-grad-${act.id})`}
                      opacity={isOtherHovered ? 0.06 : isHovered ? 0.95 : 0.70}
                      className="pointer-events-none transition-opacity duration-150"
                    />
                  );
                })}

                {/* Action Trend Curves (Precalculated paths + GPU blended stroke) */}
                {actionsWithTrends.map((act) => {
                  if (hiddenActionIds.has(act.id) || !act.curvePath) return null;

                  const isHovered = hoveredActionId === act.id;
                  const isOtherHovered = hoveredActionId && hoveredActionId !== act.id;
                  const isZeroCurve = act.currentMonthRate === 0 && act.monthlyPoints.every((r) => r === 0);

                  if (isZeroCurve) {
                    return (
                      <g key={`modal-act-plot-${act.id}`} opacity={isOtherHovered ? 0.08 : isHovered ? 0.9 : 0.14}>
                        <path
                          d={act.curvePath}
                          fill="none"
                          stroke={act.color}
                          strokeWidth={isHovered ? '2.4' : '1.2'}
                          strokeLinecap="round"
                          className="pointer-events-none"
                        />
                      </g>
                    );
                  }

                  return (
                    <g key={`modal-act-plot-${act.id}`} opacity={isOtherHovered ? 0.16 : 1.0}>
                      {/* Background Soft Glow Line - GPU stroke alpha blend */}
                      <path
                        d={act.curvePath}
                        fill="none"
                        stroke={act.color}
                        strokeWidth={isHovered ? '8' : '6'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isHovered ? '0.35' : '0.16'}
                        className="pointer-events-none"
                      />
                      {/* Main Crisp Curve Line */}
                      <path
                        d={act.curvePath}
                        fill="none"
                        stroke={act.color}
                        strokeWidth={isHovered ? '3.6' : '2.6'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="pointer-events-none"
                      />
                      {/* Node dots rendered on hover for clarity without SVG clutter */}
                      {isHovered &&
                        act.mappedPoints.map((pt, pIdx) => {
                          if (pIdx > lastPlottedMonthIdx) return null;
                          return (
                            <circle
                              key={`modal-dot-${act.id}-${pIdx}`}
                              cx={pt.x}
                              cy={pt.y}
                              r="3.2"
                              fill={act.color}
                              stroke="#070A12"
                              strokeWidth="1.2"
                              className="pointer-events-none"
                            />
                          );
                        })}
                      {/* Live Endpoint Beacon */}
                      {act.currentMonthRate > 0 && act.currentPt && (
                        <g className="pointer-events-none">
                          <circle cx={act.currentPt.x} cy={act.currentPt.y} r="5" fill={act.color} className="animate-pulse" opacity="0.4" />
                          <circle cx={act.currentPt.x} cy={act.currentPt.y} r="3" fill="#FFFFFF" stroke={act.color} strokeWidth="2" />
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Interactive Crosshair & Highlight Dots on Hover */}
                {hoveredMonthIdx !== null && hoveredMonthIdx < monthsList.length && (
                  <g className="pointer-events-none">
                    {/* Vertical dashed crosshair line */}
                    <line
                      x1={PAD_LEFT + (hoveredMonthIdx / Math.max(1, monthsList.length - 1)) * PLOT_W}
                      y1={PAD_TOP}
                      x2={PAD_LEFT + (hoveredMonthIdx / Math.max(1, monthsList.length - 1)) * PLOT_W}
                      y2={BASE_Y}
                      stroke="rgba(56, 189, 248, 0.45)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />

                    {/* Circular highlight markers on active action curves */}
                    {actionsWithTrends
                      .filter((act) => !hiddenActionIds.has(act.id) && act.mappedPoints[hoveredMonthIdx])
                      .map((act) => {
                        const pt = act.mappedPoints[hoveredMonthIdx];
                        const isActHovered = hoveredActionId === act.id;
                        return (
                          <g key={`modal-hover-pt-${act.id}`}>
                            <circle cx={pt.x} cy={pt.y} r={isActHovered ? '7' : '5.5'} fill={act.color} opacity="0.35" />
                            <circle cx={pt.x} cy={pt.y} r={isActHovered ? '4' : '3'} fill="#FFFFFF" stroke={act.color} strokeWidth="2" />
                          </g>
                        );
                      })}
                  </g>
                )}

                {/* Transparent interaction capture overlay */}
                <rect
                  x={PAD_LEFT}
                  y={PAD_TOP}
                  width={PLOT_W}
                  height={PLOT_H}
                  fill="transparent"
                  className="cursor-crosshair"
                />
              </svg>

              {/* Hovering Info Tooltip Card (Sorted by habit consistency with micro progress bars) */}
              {hoveredMonthIdx !== null && hoveredMonthIdx < monthsList.length && (
                (() => {
                  const activeX = PAD_LEFT + (hoveredMonthIdx / Math.max(1, monthsList.length - 1)) * PLOT_W;
                  const isNearRight = hoveredMonthIdx > monthsList.length / 2;
                  const leftPercent = (activeX / CHART_WIDTH) * 100;
                  const hoveredMonthLabel = monthsList[hoveredMonthIdx]?.label || '';
                  const isPresentMonth = hoveredMonthIdx === lastPlottedMonthIdx;

                  // Sort visible items by their rate in this hovered month
                  const sortedTooltipItems = actionsWithTrends
                    .filter((act) => !hiddenActionIds.has(act.id) && act.monthlyPoints[hoveredMonthIdx] !== undefined)
                    .map((act) => ({
                      ...act,
                      rate: act.monthlyPoints[hoveredMonthIdx] ?? 0,
                    }))
                    .sort((a, b) => {
                      if (b.rate !== a.rate) return b.rate - a.rate;
                      return a.title.localeCompare(b.title);
                    });

                  return (
                    <div
                      className="absolute z-30 pointer-events-none transition-all duration-75 ease-out select-none"
                      style={{
                        left: `${leftPercent}%`,
                        top: '50%',
                        transform: isNearRight ? 'translate(calc(-100% - 16px), -50%)' : 'translate(16px, -50%)',
                      }}
                    >
                      <div className="relative px-4 py-3.5 rounded-2xl border border-white/10 bg-[#0B0F19] shadow-[0_12px_40px_rgba(0,0,0,0.85)] min-w-[200px] max-h-[300px] overflow-y-auto no-scrollbar">
                        {/* Caret notch */}
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0B0F19] border-white/10 rotate-45 ${
                            isNearRight
                              ? '-right-1.5 border-t border-r'
                              : '-left-1.5 border-b border-l'
                          }`}
                        />

                        {/* Tooltip Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2 mb-2.5">
                          <span className="text-xs sm:text-sm font-mono font-black text-[#F8FAFC]">
                            {hoveredMonthLabel}
                          </span>
                          {isPresentMonth && (
                            <span className="px-1.5 py-0.5 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[9px] font-bold text-[#38BDF8]">
                              PRESENT
                            </span>
                          )}
                        </div>

                        {/* Actions List with Micro Progress Bars */}
                        <div className="space-y-2">
                          {sortedTooltipItems.map((act) => (
                            <div key={`modal-tt-${act.id}`} className="space-y-1">
                              <div className="flex items-center justify-between gap-3 font-mono text-xs whitespace-nowrap">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: act.color,
                                      boxShadow: `0 0 6px ${act.color}80`,
                                    }}
                                  />
                                  <span className="text-[#E2E8F0] font-medium truncate max-w-[120px]">
                                    {act.title}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-[#F8FAFC] shrink-0">
                                  {act.rate}%
                                </span>
                              </div>
                              <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-150"
                                  style={{
                                    width: `${act.rate}%`,
                                    backgroundColor: act.color,
                                    boxShadow: `0 0 6px ${act.color}80`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Daily Actions Pill Badges (Sorted with most completed 1st, click to toggle, hover to spotlight) */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 border-t border-white/[0.06] pt-3.5">
              {actionsWithTrends.map((act) => {
                const isHidden = hiddenActionIds.has(act.id);
                const isHovered = hoveredActionId === act.id;
                const displayedRate =
                  hoveredMonthIdx !== null
                    ? (act.monthlyPoints[hoveredMonthIdx] ?? 0)
                    : act.currentMonthRate;

                return (
                  <button
                    key={`modal-pill-${act.id}`}
                    type="button"
                    onClick={() => onToggleActionVisibility(act.id)}
                    onMouseEnter={() => setHoveredActionId(act.id)}
                    onMouseLeave={() => setHoveredActionId(null)}
                    className={`
                      px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border flex items-center gap-2 font-mono text-xs sm:text-sm font-bold cursor-pointer shadow-sm active:scale-95 transition-colors duration-100
                      ${
                        isHidden
                          ? 'opacity-40 border-white/[0.04] bg-white/[0.02] text-[#64748B] hover:opacity-60'
                          : isHovered
                          ? 'border-white/30 bg-[#162038] text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                          : 'border-white/[0.08] bg-[#0E1526]/90 text-[#F8FAFC] hover:border-white/20'
                      }
                    `}
                    title={`Click to ${isHidden ? 'show' : 'hide'} ${act.title}. Hover to spotlight curve.`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: isHidden ? '#475569' : act.color,
                        boxShadow: !isHidden ? `0 0 8px ${act.color}80` : undefined,
                      }}
                    />
                    <span className={isHidden ? 'line-through text-[#64748B]' : 'text-[#F1F5F9]'}>
                      {act.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                        isHidden
                          ? 'bg-white/[0.04] text-[#64748B]'
                          : displayedRate > 0
                          ? 'bg-white/[0.08] text-[#38BDF8]'
                          : 'bg-white/[0.04] text-[#94A3B8]'
                      }`}
                    >
                      {displayedRate}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 2: GITHUB-STYLE DAY-WISE HEATMAP (MEMOIZED SUBCOMPONENT)
          ───────────────────────────────────────────────────────────── */}
          <ConsistencyHeatmapSection
            heatmapData={heatmapData}
            selectedDateIso={selectedDateIso}
            onSelectDate={setSelectedDateIso}
          />

          {/* ─────────────────────────────────────────────────────────────
              SECTION 3: SELECTED HEATMAP BOX INFO PANEL (DAY INSPECTOR)
          ───────────────────────────────────────────────────────────── */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0F19] border border-white/[0.08] relative overflow-hidden shadow-lg">
            {/* Day Header Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`
                    flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-mono transition-colors
                    ${
                      selectedDayDetails.completedCount > 0
                        ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30 shadow-[0_0_14px_rgba(16,185,129,0.2)]'
                        : 'bg-white/[0.04] text-[#94A3B8] border-white/[0.08]'
                    }
                  `}
                >
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-wide font-mono">
                      {selectedDayDetails.formattedDate}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase tracking-wider ${selectedDayDetails.relativeBadgeStyle}`}
                    >
                      {selectedDayDetails.relativeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                    {selectedDayDetails.isFuture
                      ? 'Future date — scheduled habit targets'
                      : selectedDayDetails.completedCount === 0
                      ? 'No daily actions recorded on this day'
                      : `${selectedDayDetails.completedCount} of ${selectedDayDetails.totalCount} daily actions completed on this day`}
                  </p>
                </div>
              </div>

              {/* Day Score Metric Badge */}
              <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-[#0E1526]/90 font-mono">
                  <span className="text-xs text-[#94A3B8]">Day Score:</span>
                  <span
                    className={`text-sm sm:text-base font-black ${
                      selectedDayDetails.completedCount > 0 ? 'text-[#34D399]' : 'text-[#64748B]'
                    }`}
                  >
                    {selectedDayDetails.percentage}%
                  </span>
                  <span className="text-xs text-[#64748B]">
                    ({selectedDayDetails.completedCount}/{selectedDayDetails.totalCount} actions)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
