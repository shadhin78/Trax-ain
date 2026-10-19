/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Layers, 
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { useDailyActions } from '../../daily-actions/context/DailyActionsContext';
import { DailyAction } from '../../daily-actions/types';
import { AppRoute } from '../../../types/navigation';

interface XCommitmentsRadarChartProps {
  onNavigate?: (route: AppRoute) => void;
}

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

interface HoveredCellInfo {
  day: number;
  dateIso: string;
  formattedDate: string;
  dayName: string;
  actionId: string;
  actionTitle: string;
  status: 'completed' | 'missed' | 'today_pending' | 'future';
  streak: number;
  bestStreak: number;
}

/**
 * Mathematical helper to generate an SVG annular sector path (polar arc segment).
 */
function getAnnularSectorPath(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + rOut * Math.cos(startAngle);
  const y1 = cy + rOut * Math.sin(startAngle);
  const x2 = cx + rOut * Math.cos(endAngle);
  const y2 = cy + rOut * Math.sin(endAngle);

  const x3 = cx + rIn * Math.cos(endAngle);
  const y3 = cy + rIn * Math.sin(endAngle);
  const x4 = cx + rIn * Math.cos(startAngle);
  const y4 = cy + rIn * Math.sin(startAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return (
    `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
    `A ${rOut.toFixed(2)} ${rOut.toFixed(2)} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
    `L ${x3.toFixed(2)} ${y3.toFixed(2)} ` +
    `A ${rIn.toFixed(2)} ${rIn.toFixed(2)} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} ` +
    `Z`
  );
}

/**
 * X-29 — THE X COMMITMENTS RADIAL HABIT RADAR
 * Matches exact structure & mechanics:
 * 1. 3/4 Circular Arc: Spans 270 degrees (from 12 o'clock clockwise to 9 o'clock).
 * 2. Open 1/4 Quadrant (top-left from 9 o'clock to 12 o'clock): Area through which task lines & titles extend directly to the 12 o'clock meridian.
 * 3. Rings directly against the core: The innermost ring touches the center core circle.
 * 4. Compact 4 info cards on the left (Monthly Completion, Total Fulfilled, Active Streak, Days Logged).
 * 5. No commitment filters: All active habits displayed simultaneously.
 * 6. Interactive checkboxes only in current month; clean titles in previous months.
 * 7. Hover-only inspection (hover shows details; click does not mutate day status).
 * 8. PC animations with mobile optimization for zero-lag performance.
 * 9. Real-time cross-device cloud synchronization.
 */
export const XCommitmentsRadarChart: React.FC<XCommitmentsRadarChartProps> = React.memo(({ onNavigate }) => {
  const { dailyActions, toggleDailyActionToday, currentDayIso } = useDailyActions();

  // Mobile detection for disabling heavy animations on phone screens
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Active Month View Navigation
  const [viewDate, setViewDate] = useState<Date>(() => new Date());

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const viewMonthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const daysInViewMonth = useMemo(() => new Date(viewYear, viewMonth + 1, 0).getDate(), [viewYear, viewMonth]);

  const now = new Date();
  const isPresentMonth = (viewYear === now.getFullYear() && viewMonth === now.getMonth());
  const todayDayNumber = isPresentMonth ? now.getDate() : -1;

  // Hover state & floating tooltip coordinates
  const [hoveredCell, setHoveredCell] = useState<HoveredCellInfo | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);

  // Month navigation controls
  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setHoveredCell(null);
    setCursorPos(null);
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setHoveredCell(null);
    setCursorPos(null);
  };

  const handleCurrentMonth = () => {
    setViewDate(new Date());
    setHoveredCell(null);
    setCursorPos(null);
  };

  // ── STATS CALCULATION (COMPACT INFO TILES) ──
  const stats = useMemo(() => {
    const totalHabits = dailyActions.length;
    if (totalHabits === 0) {
      return {
        completionRate: 0,
        fulfilledCount: 0,
        totalPossible: 0,
        activeStreak: 0,
        daysLogged: 0,
      };
    }

    const totalPossibleCheckIns = totalHabits * daysInViewMonth;

    let fulfilledCheckIns = 0;
    const uniqueLoggedDates = new Set<string>();

    dailyActions.forEach((action) => {
      action.completedDates.forEach((d) => {
        if (d.startsWith(viewMonthKey)) {
          fulfilledCheckIns++;
          uniqueLoggedDates.add(d);
        }
      });
    });

    const completionRate = totalPossibleCheckIns > 0 
      ? Math.round((fulfilledCheckIns / totalPossibleCheckIns) * 100) 
      : 0;

    // Active streak:
    // If present month, use current live streak.
    // If past month, calculate streak ending on the last day of that month (if last day was missed, streak = 0).
    let activeStreak = 0;
    if (isPresentMonth) {
      activeStreak = Math.max(0, ...dailyActions.map((a) => a.streak || 0));
    } else {
      let maxEndStreak = 0;
      dailyActions.forEach((a) => {
        let s = 0;
        for (let d = daysInViewMonth; d >= 1; d--) {
          const iso = `${viewMonthKey}-${String(d).padStart(2, '0')}`;
          if (a.completedDates.includes(iso)) {
            s++;
          } else {
            break;
          }
        }
        if (s > maxEndStreak) maxEndStreak = s;
      });
      activeStreak = maxEndStreak;
    }

    return {
      completionRate,
      fulfilledCount: fulfilledCheckIns,
      totalPossible: totalPossibleCheckIns,
      activeStreak,
      daysLogged: uniqueLoggedDates.size,
    };
  }, [dailyActions, viewMonthKey, daysInViewMonth, isPresentMonth]);

  // ── SVG GEOMETRY CONFIGURATION ──
  // Canvas coordinate system
  const svgWidth = 920;
  const svgHeight = 640;
  const cx = 580; // Center X of radar circle (balances left habit bands and right arc)
  const cy = 340; // Center Y of radar circle
  const rHub = 84; // Center hub radius
  const rMax = 252; // Outermost ring boundary radius
  const rPerimeterLabels = rMax + 20;

  const totalRings = dailyActions.length;

  // Concentric ring bands calculation:
  // Ring 0 (top row) is outermost ring; Ring N-1 (bottom row) is innermost ring, which touches rHub directly!
  const ringGeometries = useMemo(() => {
    if (totalRings === 0) return [];

    const availableRadialSpan = rMax - rHub; // Boxes touch right against the core!
    const gap = totalRings > 1 ? Math.min(3, 10 / totalRings) : 0;
    const thickness = (availableRadialSpan - (totalRings - 1) * gap) / totalRings;

    return dailyActions.map((action, index) => {
      const rOut = rMax - index * (thickness + gap);
      const rIn = index === totalRings - 1 ? rHub : rOut - thickness; // Innermost touches rHub
      const rMid = (rIn + rOut) / 2;
      return {
        action,
        index,
        rOut,
        rIn,
        rMid,
        thickness,
      };
    });
  }, [dailyActions, totalRings, rMax, rHub]);

  // Cell hover inspection
  const handleCellMouseEnter = (
    e: React.MouseEvent,
    day: number,
    action: DailyAction,
    status: HoveredCellInfo['status']
  ) => {
    const dStr = String(day).padStart(2, '0');
    const dateIso = `${viewMonthKey}-${dStr}`;
    const cellDate = new Date(viewYear, viewMonth, day);
    const dayName = DAY_NAMES[cellDate.getDay()];
    const formattedDate = `${day} ${MONTH_NAMES[viewMonth]} ${viewYear}`;

    setCursorPos({ x: e.clientX, y: e.clientY });
    setHoveredCell({
      day,
      dateIso,
      formattedDate,
      dayName,
      actionId: action.id,
      actionTitle: action.title,
      status,
      streak: action.streak,
      bestStreak: action.bestStreak,
    });
  };

  const handleCellMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const handleCellMouseLeave = () => {
    setHoveredCell(null);
    setCursorPos(null);
  };

  // Toggle today check-in directly via checkbox
  const handleToggleActionToday = (actionId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!isPresentMonth) return;
    toggleDailyActionToday(actionId);
  };

  // ── 3/4 CIRCLE ANGULAR GEOMETRY (270 DEGREES) ──
  // Starts at 12 o'clock (-Math.PI / 2) and proceeds clockwise to 9 o'clock (Math.PI)
  // Total angular span = 270 degrees = 1.5 * Math.PI radians
  const totalArcSpan = 1.5 * Math.PI;
  const anglePerDay = totalArcSpan / daysInViewMonth;
  const angularGap = 0.006;

  return (
    <div className="w-full rounded-3xl border border-white/[0.08] bg-transparent backdrop-blur-sm p-4 sm:p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-visible transition-all font-mono">
      {/* ── AMBIENT BACKGROUND CORNER GLOW ── */}
      <div 
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none"
        aria-hidden="true" 
      />
      <div 
        className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none"
        aria-hidden="true" 
      />

      {/* ── TOP HEADER: BADGES, TITLE, AND MONTH SELECTOR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5">
        {/* Left: Badges & Title */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              HABIT RADAR
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
              DAILY CONSISTENCY
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-wider text-[#F8FAFC] uppercase flex items-center gap-2">
              THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#818CF8] via-[#A78BFA] to-[#38BDF8] drop-shadow-[0_0_16px_rgba(99,102,241,0.5)]">X</span> COMMITMENTS
            </h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed mt-0.5">
              Daily commitment tracker & radial habit grid. Click any cell to log or toggle completion for that day.
            </p>
          </div>
        </div>

        {/* Right: Clean Month Navigator Control (< MONTH YYYY >) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center rounded-xl border border-white/[0.1] bg-[#131722]/80 backdrop-blur-md px-1.5 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="px-3 py-0.5 font-black text-xs text-[#F8FAFC] tracking-wider min-w-[140px] text-center select-none uppercase">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!isPresentMonth && (
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="p-2 rounded-xl text-xs font-bold bg-[#6366F1]/20 hover:bg-[#6366F1]/30 text-[#818CF8] border border-[#6366F1]/30 transition-all flex items-center cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.2)]"
              title="Return to Current Month"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      {dailyActions.length === 0 ? (
        /* ── EMPTY STATE WHEN NO DAILY ACTIONS EXIST ── */
        <div className="py-16 px-4 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/30 flex items-center justify-center mx-auto text-[#818CF8] shadow-[0_0_24px_rgba(99,102,241,0.2)]">
            <Layers className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#F8FAFC]">No Daily Actions Configured</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Create daily action cards in the Daily Actions tab to plot your commitments into this concentric radial radar grid.
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/daily-actions/')}
              className="mt-3 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-all shadow-[0_0_16px_rgba(99,102,241,0.4)] inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Configure Daily Actions</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        /* ── RADAR TELEMETRY DASHBOARD ── */
        <div className="pt-2 flex flex-col lg:flex-row items-start gap-6 lg:gap-8 w-full">
          {/* ── 1. COMPACT LEFT STATS (EXACTLY 4 COMPACT CARDS AS IN DEMO IMAGE) ── */}
          <div className="w-full lg:w-64 sm:w-72 shrink-0 grid grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* Card 1: MONTHLY COMPLETION */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/70 backdrop-blur-md p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all hover:border-white/[0.12]">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                MONTHLY COMPLETION
              </span>
              <div className="mt-1 text-2xl sm:text-3xl font-black text-[#10B981] tracking-tight">
                {stats.completionRate}%
              </div>
            </div>

            {/* Card 2: TOTAL FULFILLED */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/70 backdrop-blur-md p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all hover:border-white/[0.12]">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                TOTAL FULFILLED
              </span>
              <div className="mt-1 text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
                {stats.fulfilledCount} <span className="text-xl sm:text-2xl text-[#64748B] font-semibold">/ {stats.totalPossible}</span>
              </div>
            </div>

            {/* Card 3: ACTIVE STREAK */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/70 backdrop-blur-md p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all hover:border-white/[0.12]">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                ACTIVE STREAK
              </span>
              <div className="mt-1 text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight flex items-center gap-1.5">
                <span>{stats.activeStreak} Days</span>
                <span className="text-xl">🔥</span>
              </div>
            </div>

            {/* Card 4: DAYS LOGGED */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/70 backdrop-blur-md p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all hover:border-white/[0.12]">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                DAYS LOGGED
              </span>
              <div className="mt-1 text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
                {stats.daysLogged} Days
              </div>
            </div>
          </div>

          {/* ── 2. RIGHT: 3/4 RADIAL COMMITMENTS CHART WITH CONNECTING TASK LINES ── */}
          <div className="flex-1 w-full flex items-center justify-center relative select-none">
            <div className="w-full max-w-[880px] aspect-[920/640] relative flex items-center justify-center">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
                onMouseMove={handleCellMouseMove}
                onMouseLeave={handleCellMouseLeave}
              >
                <defs>
                  {/* Glowing center hub filter */}
                  <radialGradient id="hubGlowGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.9" />
                    <stop offset="70%" stopColor="#0B0F19" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#060911" stopOpacity="1" />
                  </radialGradient>

                  {/* Cell hover glow filter (only enabled on desktop) */}
                  {!isMobile && (
                    <filter id="cellGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  )}
                </defs>

                {/* ── HORIZONTAL TASK LINES & HABIT BANDS THROUGH OPEN 1/4 QUADRANT ── */}
                <g id="action-guidelines-group">
                  {ringGeometries.map((geo) => {
                    const { action, rOut, rIn, rMid } = geo;
                    const yTop = cy - rOut;
                    const yMid = cy - rMid;
                    const isCompletedToday = action.completedDates.includes(currentDayIso);
                    const isHovered = hoveredActionId === action.id;

                    const lineStartX = 70;
                    const meridianX = cx;

                    return (
                      <g 
                        key={`guideline-${action.id}`}
                        className={`transition-opacity duration-200 ${
                          hoveredActionId && !isHovered ? 'opacity-35' : 'opacity-100'
                        }`}
                        onMouseEnter={() => !isMobile && setHoveredActionId(action.id)}
                        onMouseLeave={() => !isMobile && setHoveredActionId(null)}
                      >
                        {/* Top horizontal line of this habit band meeting 12 o'clock vertical axis */}
                        <line
                          x1={lineStartX}
                          y1={yTop}
                          x2={meridianX}
                          y2={yTop}
                          stroke={isHovered ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.22)'}
                          strokeWidth={isHovered ? '1.8' : '1.1'}
                          className="transition-colors duration-150"
                        />

                        {/* Habit Title + Checkbox centered vertically in this band */}
                        <g transform={`translate(${lineStartX}, ${yMid - 10})`}>
                          {/* Present Month: Interactive Checkbox */}
                          {isPresentMonth ? (
                            <g 
                              onClick={(e) => handleToggleActionToday(action.id, e)}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                  handleToggleActionToday(action.id, e);
                                }
                              }}
                              className="group/check cursor-pointer"
                              role="checkbox"
                              aria-checked={isCompletedToday}
                              tabIndex={0}
                            >
                              {/* Checkbox box */}
                              <rect
                                x="0"
                                y="0"
                                width="18"
                                height="18"
                                rx="4"
                                fill={isCompletedToday ? '#10B981' : 'rgba(19,23,34,0.9)'}
                                stroke={isCompletedToday ? '#34D399' : 'rgba(255,255,255,0.25)'}
                                strokeWidth="1.5"
                                className="transition-all duration-150 group-hover/check:stroke-[#818CF8]"
                              />
                              {isCompletedToday && (
                                <path
                                  d="M 4 9 L 7.5 12.5 L 14 5.5"
                                  fill="none"
                                  stroke="#FFFFFF"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}
                              {/* Habit Title next to checkbox */}
                              <text
                                x="28"
                                y="14"
                                fill={isHovered ? '#FFFFFF' : '#F8FAFC'}
                                fontSize={totalRings > 8 ? '11' : '13'}
                                fontWeight="900"
                                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                                letterSpacing="0.05em"
                                className="transition-colors duration-150 select-none uppercase"
                              >
                                {action.title}
                              </text>
                            </g>
                          ) : (
                            /* Past Month: Clean bold title without checkbox (matches demo screenshot) */
                            <text
                              x="0"
                              y="14"
                              fill={isHovered ? '#FFFFFF' : '#F8FAFC'}
                              fontSize={totalRings > 8 ? '11' : '13'}
                              fontWeight="900"
                              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                              letterSpacing="0.05em"
                              className="transition-colors duration-150 select-none uppercase"
                            >
                              {action.title}
                            </text>
                          )}
                        </g>
                      </g>
                    );
                  })}

                  {/* Bottom horizontal line of innermost habit band (touches top of core at 12 o'clock) */}
                  {ringGeometries.length > 0 && (
                    <line
                      x1={70}
                      y1={cy - ringGeometries[ringGeometries.length - 1].rIn}
                      x2={cx}
                      y2={cy - ringGeometries[ringGeometries.length - 1].rIn}
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="1.1"
                    />
                  )}
                </g>

                {/* ── 3/4 CIRCLE BOUNDARY CUTOFF LINES ── */}
                {/* 1. Vertical 12-o'clock boundary line (where Day 1 starts) */}
                <line
                  x1={cx}
                  y1={cy - rMax - 10}
                  x2={cx}
                  y2={cy - rHub}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1.2"
                />

                {/* 2. Horizontal 9-o'clock boundary line (where Day 30/31 ends) */}
                <line
                  x1={cx - rMax - 10}
                  y1={cy}
                  x2={cx - rHub}
                  y2={cy}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1.2"
                />

                {/* ── 3/4 RADIAL GRID CELLS (270 DEGREES: 12 O'CLOCK CLOCKWISE TO 9 O'CLOCK) ── */}
                <g id="radar-annular-cells-group">
                  {ringGeometries.map((geo) => {
                    const { action, rOut, rIn } = geo;
                    const isActionHovered = hoveredActionId === action.id;

                    return (
                      <g 
                        key={`ring-${action.id}`}
                        className={`transition-opacity duration-200 ${
                          hoveredActionId && !isActionHovered ? 'opacity-30' : 'opacity-100'
                        }`}
                      >
                        {Array.from({ length: daysInViewMonth }, (_, dayIdx) => {
                          const day = dayIdx + 1;
                          const dStr = String(day).padStart(2, '0');
                          const cellIso = `${viewMonthKey}-${dStr}`;

                          const isToday = isPresentMonth && (day === todayDayNumber);
                          const isDone = action.completedDates.includes(cellIso);
                          const isPast = isPresentMonth 
                            ? (day < todayDayNumber) 
                            : (viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth()));
                          const isFuture = isPresentMonth 
                            ? (day > todayDayNumber) 
                            : (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth()));

                          // Determine cell colors
                          let status: HoveredCellInfo['status'] = 'future';
                          let fillColor = 'rgba(255, 255, 255, 0.025)';
                          let strokeColor = 'rgba(255, 255, 255, 0.07)';
                          let strokeWidth = '0.6';

                          if (isDone) {
                            status = 'completed';
                            fillColor = '#10B981'; // Vibrant Emerald Green
                            strokeColor = '#059669';
                            strokeWidth = '0.8';
                          } else if (isPast) {
                            status = 'missed';
                            fillColor = '#E11D48'; // Crimson / Rose Red
                            strokeColor = '#BE123C';
                            strokeWidth = '0.8';
                          } else if (isToday) {
                            status = 'today_pending';
                            fillColor = 'rgba(99, 102, 241, 0.15)';
                            strokeColor = '#38BDF8';
                            strokeWidth = '1.4';
                          } else if (isFuture) {
                            status = 'future';
                            fillColor = 'rgba(255, 255, 255, 0.02)';
                            strokeColor = 'rgba(255, 255, 255, 0.06)';
                            strokeWidth = '0.5';
                          }

                          // 3/4 Sector angles (Day 1 starts at top -Math.PI / 2, proceeds clockwise to 9 o'clock Math.PI)
                          const startAngle = -Math.PI / 2 + (day - 1) * anglePerDay + angularGap / 2;
                          const endAngle = -Math.PI / 2 + day * anglePerDay - angularGap / 2;

                          const pathData = getAnnularSectorPath(cx, cy, rIn, rOut, startAngle, endAngle);
                          const isThisCellHovered = hoveredCell?.day === day && hoveredCell?.actionId === action.id;

                          return (
                            <path
                              key={`cell-${action.id}-day-${day}`}
                              d={pathData}
                              fill={fillColor}
                              stroke={isThisCellHovered ? '#FFFFFF' : strokeColor}
                              strokeWidth={isThisCellHovered ? '2' : strokeWidth}
                              filter={isThisCellHovered && !isMobile ? 'url(#cellGlow)' : undefined}
                              className={`transition-all duration-100 ${
                                !isMobile ? 'cursor-pointer hover:brightness-125' : ''
                              }`}
                              onMouseEnter={(e) => handleCellMouseEnter(e, day, action, status)}
                              onMouseMove={(e) => handleCellMouseMove(e)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellMouseEnter(e, day, action, status);
                              }}
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                </g>

                {/* ── DAY LABELS & TICK MARKS AROUND 3/4 PERIMETER ── */}
                <g id="radar-perimeter-day-labels">
                  {Array.from({ length: daysInViewMonth }, (_, dayIdx) => {
                    const day = dayIdx + 1;
                    const midAngle = -Math.PI / 2 + (day - 0.5) * anglePerDay;
                    const isToday = isPresentMonth && (day === todayDayNumber);

                    const labelX = cx + rPerimeterLabels * Math.cos(midAngle);
                    const labelY = cy + rPerimeterLabels * Math.sin(midAngle);

                    const tickInner = rMax + 2;
                    const tickOuter = rMax + (isToday ? 9 : 5);
                    const tX1 = cx + tickInner * Math.cos(midAngle);
                    const tY1 = cy + tickInner * Math.sin(midAngle);
                    const tX2 = cx + tickOuter * Math.cos(midAngle);
                    const tY2 = cy + tickOuter * Math.sin(midAngle);

                    return (
                      <g key={`day-label-${day}`}>
                        <line
                          x1={tX1}
                          y1={tY1}
                          x2={tX2}
                          y2={tY2}
                          stroke={isToday ? '#10B981' : 'rgba(255,255,255,0.15)'}
                          strokeWidth={isToday ? '2' : '1'}
                        />
                        <text
                          x={labelX}
                          y={labelY + 3.5}
                          textAnchor="middle"
                          fill={isToday ? '#10B981' : 'rgba(255,255,255,0.45)'}
                          fontSize={isToday ? '13' : '9.5'}
                          fontWeight={isToday ? '900' : '600'}
                          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                          className={isToday ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''}
                        >
                          {day}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* ── CENTER HUB: "THE X COMMITMENTS" ── */}
                <g id="radar-center-hub">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rHub}
                    fill="url(#hubGlowGradient)"
                    stroke={hoveredCell ? 'rgba(56, 189, 248, 0.6)' : 'rgba(99, 102, 241, 0.4)'}
                    strokeWidth="2"
                    className="drop-shadow-[0_0_24px_rgba(0,0,0,0.8)] transition-all duration-200"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rHub - 6}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />

                  {/* Dual Telemetry Hub Readout */}
                  {hoveredCell ? (
                    <g className="transition-all duration-150">
                      <text
                        x={cx}
                        y={cy - 24}
                        textAnchor="middle"
                        fill="#38BDF8"
                        fontSize="9.5"
                        fontWeight="800"
                        letterSpacing="0.1em"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                        className="select-none uppercase"
                      >
                        DAY {hoveredCell.day} • {hoveredCell.dayName.slice(0, 3)}
                      </text>
                      <text
                        x={cx}
                        y={cy + 3}
                        textAnchor="middle"
                        fill={
                          hoveredCell.status === 'completed' 
                            ? '#10B981' 
                            : hoveredCell.status === 'missed' 
                            ? '#E11D48' 
                            : hoveredCell.status === 'today_pending' 
                            ? '#38BDF8' 
                            : '#94A3B8'
                        }
                        fontSize="14"
                        fontWeight="900"
                        letterSpacing="0.08em"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                        className="select-none uppercase"
                      >
                        {hoveredCell.status === 'completed' 
                          ? 'FULFILLED' 
                          : hoveredCell.status === 'missed' 
                          ? 'MISSED' 
                          : hoveredCell.status === 'today_pending' 
                          ? 'PENDING' 
                          : 'UPCOMING'}
                      </text>
                      <text
                        x={cx}
                        y={cy + 25}
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="8.5"
                        fontWeight="800"
                        letterSpacing="0.15em"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                        className="select-none"
                      >
                        STREAK: {hoveredCell.streak}D
                      </text>
                    </g>
                  ) : (
                    <g className="transition-all duration-150">
                      <text
                        x={cx}
                        y={cy - 22}
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="9"
                        fontWeight="800"
                        letterSpacing="0.25em"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                        className="select-none"
                      >
                        THE
                      </text>
                      <text
                        x={cx}
                        y={cy + 8}
                        textAnchor="middle"
                        fill="#818CF8"
                        fontSize="32"
                        fontWeight="900"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                        className="select-none drop-shadow-[0_0_14px_rgba(129,140,248,0.7)]"
                      >
                        X
                      </text>
                      <text
                        x={cx}
                        y={cy + 26}
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="7.5"
                        fontWeight="800"
                        letterSpacing="0.2em"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                        className="select-none"
                      >
                        COMMITMENTS
                      </text>
                    </g>
                  )}
                </g>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING TOOLTIP TELEMETRY HUD ── */}
      {hoveredCell && cursorPos && (
        <div
          className={`fixed z-50 pointer-events-none -translate-x-1/2 ${
            cursorPos.y < 150 ? 'translate-y-4' : '-translate-y-full -mt-3'
          } transition-opacity duration-100 font-mono`}
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
          }}
        >
          <div className="rounded-xl border border-white/[0.15] bg-[#0E121B]/95 backdrop-blur-xl p-3 shadow-[0_16px_40px_rgba(0,0,0,0.9)] min-w-[210px] max-w-[280px] space-y-1.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08] text-[10px]">
              <span className="font-bold text-[#F8FAFC] uppercase">{hoveredCell.dayName}</span>
              <span className="text-[#94A3B8] font-bold">DAY {hoveredCell.day}</span>
            </div>

            <div className="pt-0.5">
              <span className="text-xs font-black text-[#F8FAFC] tracking-tight block truncate uppercase">
                {hoveredCell.actionTitle}
              </span>
              <span className="text-[9.5px] text-[#64748B]">
                {hoveredCell.formattedDate}
              </span>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase text-[#64748B]">STATUS:</span>
              {hoveredCell.status === 'completed' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  FULFILLED
                </span>
              ) : hoveredCell.status === 'missed' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#E11D48]/20 text-[#FB7185] border border-[#E11D48]/40">
                  MISSED
                </span>
              ) : hoveredCell.status === 'today_pending' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 animate-pulse">
                  PENDING TODAY
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-white/[0.05] text-[#94A3B8]">
                  UPCOMING
                </span>
              )}
            </div>

            <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-[#94A3B8]">
              <span>Streak: {hoveredCell.streak}d</span>
              <span>Best: {hoveredCell.bestStreak}d 🔥</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

