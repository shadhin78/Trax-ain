/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useFocusTimer } from '../../focus/context/FocusTimerContext';
import { getTargetForDate } from '../../focus/utils/targetHistoryUtils';

export type HeatmapTimeRange = '1M' | '3M' | '6M' | '1Y';
export type FocusTier = 0 | 1 | 2 | 3 | 4 | 5;

interface HeatmapDayData {
  dateStr: string;         // YYYY-MM-DD
  date: Date;
  dayOfWeek: number;       // 0 (Sun) to 6 (Sat)
  seconds: number;
  hours: number;
  tier: FocusTier;
  isToday: boolean;
  isFuture: boolean;
  subjects: { subject: string; seconds: number }[];
  targetHours: number | null;
  targetMetPercent: number | null;
}

interface WeekColumn {
  colIdx: number;
  monthLabel: string | null;
  days: HeatmapDayData[];
}

const LOCAL_STORAGE_HEATMAP_RANGE_KEY = 'x29_focus_heatmap_time_range';
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const RANGE_CONFIG: Record<HeatmapTimeRange, { label: string; weeks: number }> = {
  '1M': { label: '1 Month', weeks: 5 },
  '3M': { label: '3 Months', weeks: 13 },
  '6M': { label: '6 Months', weeks: 26 },
  '1Y': { label: '1 Year', weeks: 53 },
};

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDurationHoursMinutes(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${totalSeconds}s`;
}

function formatSubjectDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${totalSeconds}s`;
}

export function getFocusTier(totalSeconds: number): FocusTier {
  if (totalSeconds < 60) return 0; // Less than 1 minute (0s - 59s) is Tier 0 (0h / Inactive)
  const hours = totalSeconds / 3600;
  if (hours <= 2) return 1;       // 1 min to 2h (Deep Rose)
  if (hours <= 4) return 2;       // > 2-4h (Blue)
  if (hours < 6) return 3;        // > 4h (Green)
  if (hours < 8) return 4;        // ≥ 6h (Golden)
  return 5;                       // ≥ 8h (Diamond)
}


export const FocusMatrixHeatmap: React.FC = React.memo(() => {
  const {
    sessions,
    displayElapsedMs,
    status,
    selectedSubject,
    targetHistory,
    dailyTargetHours,
  } = useFocusTimer();

  // Mobile detection for responsiveness and smooth interactions
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

  // Time Range Filter State (Default: 1 Year matching reference image)
  const [timeRange, setTimeRange] = useState<HeatmapTimeRange>(() => {
    if (typeof window === 'undefined') return '1Y';
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HEATMAP_RANGE_KEY);
      if (saved === '1M' || saved === '3M' || saved === '6M' || saved === '1Y') {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return '1Y';
  });

  const handleTimeRangeChange = (newRange: HeatmapTimeRange) => {
    setTimeRange(newRange);
    try {
      localStorage.setItem(LOCAL_STORAGE_HEATMAP_RANGE_KEY, newRange);
    } catch {
      // Ignore
    }
  };

  // Selected date for the inspection HUD panel below the heatmap
  const todayIso = useMemo(() => formatLocalDate(new Date()), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayIso);

  const gridScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll matrix to latest week on initial load or range change
  useEffect(() => {
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollLeft = gridScrollRef.current.scrollWidth;
    }
  }, [timeRange]);

  // 1. Process historical recorded sessions (strictly on [sessions])
  const baseHistoricalMaps = useMemo(() => {
    const dMap = new Map<string, { totalSeconds: number; subjects: Record<string, number> }>();
    const sMap = new Map<string, number>();

    sessions.forEach((s) => {
      const dStr = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
      if (!dStr) return;

      const dur = s.durationSeconds || 0;
      const cur = dMap.get(dStr) || { totalSeconds: 0, subjects: {} };
      cur.totalSeconds += dur;
      const subj = s.subject || 'General Study';
      cur.subjects[subj] = (cur.subjects[subj] || 0) + dur;
      dMap.set(dStr, cur);
      sMap.set(dStr, (sMap.get(dStr) || 0) + dur);
    });

    return { dMap, sMap };
  }, [sessions]);

  // 2. Add currently active timer duration to today (O(1) update)
  const isTiming = status === 'RUNNING' || status === 'PAUSED';
  const liveSec = isTiming ? Math.floor(displayElapsedMs / 1000) : 0;

  const { dateMap, daySecondsMap } = useMemo(() => {
    const { dMap, sMap } = baseHistoricalMaps;
    if (liveSec <= 0) {
      return { dateMap: dMap, daySecondsMap: sMap };
    }

    const nextDMap = new Map(dMap);
    const nextSMap = new Map(sMap);

    const curToday = nextDMap.get(todayIso) || { totalSeconds: 0, subjects: {} };
    const updatedToday = {
      totalSeconds: curToday.totalSeconds + liveSec,
      subjects: { ...curToday.subjects },
    };
    const activeLabel = isTiming ? 'Active Session' : (selectedSubject || 'General Study');
    updatedToday.subjects[activeLabel] = (updatedToday.subjects[activeLabel] || 0) + liveSec;
    nextDMap.set(todayIso, updatedToday);
    nextSMap.set(todayIso, (nextSMap.get(todayIso) || 0) + liveSec);

    return { dateMap: nextDMap, daySecondsMap: nextSMap };
  }, [baseHistoricalMaps, liveSec, isTiming, selectedSubject, todayIso]);

  // Calculate current streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const todaySec = daySecondsMap.get(todayIso) || 0;
    const d = new Date(now);

    if (todaySec >= 60) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      // If today has < 1 min focus yet, check yesterday to preserve ongoing streak
      d.setDate(d.getDate() - 1);
    }

    while (true) {
      const iso = formatLocalDate(d);
      const sec = daySecondsMap.get(iso) || 0;
      if (sec >= 60) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [daySecondsMap, todayIso]);

  // Construct weeks and days for the selected range
  const { weeks, rangeStats } = useMemo(() => {
    const numWeeks = RANGE_CONFIG[timeRange].weeks;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // End on Saturday of the current week
    const currentDayOfWeek = now.getDay(); // 0 is Sun, 6 is Sat
    const daysUntilSaturday = 6 - currentDayOfWeek;
    const endSaturday = new Date(now);
    endSaturday.setDate(now.getDate() + daysUntilSaturday);
    endSaturday.setHours(0, 0, 0, 0);

    // Start on Sunday (numWeeks * 7 - 1 days prior to endSaturday)
    const startSunday = new Date(endSaturday);
    startSunday.setDate(endSaturday.getDate() - (numWeeks * 7 - 1));
    startSunday.setHours(0, 0, 0, 0);

    const weekCols: WeekColumn[] = [];
    let lastLabeledMonth = -1;
    let lastLabeledCol = -99;

    let activeDays = 0;
    let tier0Count = 0;
    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;
    let tier4Count = 0;
    let tier5Count = 0;

    for (let w = 0; w < numWeeks; w++) {
      const days: HeatmapDayData[] = [];
      const colSunday = new Date(startSunday);
      colSunday.setDate(startSunday.getDate() + w * 7);

      // Determine month label for this column
      let monthLabel: string | null = null;
      const sundayMonth = colSunday.getMonth();

      if (w === 0 || (sundayMonth !== lastLabeledMonth && w - lastLabeledCol >= 3)) {
        monthLabel = MONTH_NAMES_SHORT[sundayMonth];
        lastLabeledMonth = sundayMonth;
        lastLabeledCol = w;
      }

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const curDate = new Date(colSunday);
        curDate.setDate(colSunday.getDate() + dayOffset);
        curDate.setHours(0, 0, 0, 0);

        const dStr = formatLocalDate(curDate);
        const isToday = dStr === todayIso;
        const isFuture = curDate > now && !isToday;

        const dayEntry = dateMap.get(dStr);
        const seconds = !isFuture && dayEntry ? dayEntry.totalSeconds : 0;
        const hours = seconds / 3600;
        const tier = isFuture ? 0 : getFocusTier(seconds);

        // Subject list
        const subjectList: { subject: string; seconds: number }[] = [];
        if (!isFuture && dayEntry) {
          Object.entries(dayEntry.subjects).forEach(([subj, sec]) => {
            if (sec > 0) {
              subjectList.push({ subject: subj, seconds: sec });
            }
          });
          subjectList.sort((a, b) => b.seconds - a.seconds);
        }

        // Target calculation for this day
        const dayTargetHours = getTargetForDate(targetHistory, dStr) ?? dailyTargetHours;
        const targetSeconds = (dayTargetHours ?? 0) * 3600;
        const targetMetPercent = targetSeconds > 0
          ? Math.round((seconds / targetSeconds) * 100)
          : null;

        days.push({
          dateStr: dStr,
          date: curDate,
          dayOfWeek: dayOffset,
          seconds,
          hours,
          tier,
          isToday,
          isFuture,
          subjects: subjectList,
          targetHours: dayTargetHours,
          targetMetPercent,
        });

        // Tally statistics (only non-future days)
        if (!isFuture) {
          if (tier > 0) activeDays++;
          if (tier === 0) tier0Count++;
          else if (tier === 1) tier1Count++;
          else if (tier === 2) tier2Count++;
          else if (tier === 3) tier3Count++;
          else if (tier === 4) tier4Count++;
          else if (tier === 5) tier5Count++;
        }
      }

      weekCols.push({
        colIdx: w,
        monthLabel,
        days,
      });
    }

    return {
      weeks: weekCols,
      rangeStats: {
        activeDays,
        tier0: tier0Count,
        tier1: tier1Count,
        tier2: tier2Count,
        tier3: tier3Count,
        tier4: tier4Count,
        tier5: tier5Count,
      },
    };
  }, [timeRange, todayIso, dateMap, targetHistory, dailyTargetHours]);

  // Selected Day Details Lookup
  const selectedDayInfo = useMemo(() => {
    for (const week of weeks) {
      for (const d of week.days) {
        if (d.dateStr === selectedDateStr) {
          return d;
        }
      }
    }

    // Fallback if selected date is outside current range
    const d = parseLocalDate(selectedDateStr);
    const dayEntry = dateMap.get(selectedDateStr);
    const seconds = dayEntry ? dayEntry.totalSeconds : 0;
    const tier = getFocusTier(seconds);
    const dayTargetHours = getTargetForDate(targetHistory, selectedDateStr) ?? dailyTargetHours;
    const targetSeconds = (dayTargetHours ?? 0) * 3600;
    const targetMetPercent = targetSeconds > 0 ? Math.round((seconds / targetSeconds) * 100) : null;

    const subjects: { subject: string; seconds: number }[] = [];
    if (dayEntry) {
      Object.entries(dayEntry.subjects).forEach(([subj, sec]) => {
        if (sec > 0) subjects.push({ subject: subj, seconds: sec });
      });
      subjects.sort((a, b) => b.seconds - a.seconds);
    }

    return {
      dateStr: selectedDateStr,
      date: d,
      dayOfWeek: d.getDay(),
      seconds,
      hours: seconds / 3600,
      tier,
      isToday: selectedDateStr === todayIso,
      isFuture: d > new Date() && selectedDateStr !== todayIso,
      subjects,
      targetHours: dayTargetHours,
      targetMetPercent,
    };
  }, [weeks, selectedDateStr, dateMap, todayIso, targetHistory, dailyTargetHours]);

  // Format date display for bottom panel: e.g. "SATURDAY Oct 17, 2026"
  const selectedDayHeader = useMemo(() => {
    const d = selectedDayInfo.date;
    const dayName = DAY_NAMES_FULL[d.getDay()].toUpperCase();
    const month = MONTH_NAMES_SHORT[d.getMonth()];
    const dayNum = d.getDate();
    const year = d.getFullYear();
    return {
      dayName,
      formattedDate: `${month} ${dayNum}, ${year}`,
    };
  }, [selectedDayInfo]);

  // Helper for cell styles
  const getCellStyle = (tier: FocusTier, isSelected: boolean) => {
    switch (tier) {
      case 5: // ≥ 8h (Diamond)
        return 'bg-gradient-to-br from-[#818CF8] via-[#06B6D4] to-[#3B82F6] border border-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.5)]';
      case 4: // ≥ 6h (Golden)
        return 'bg-[#F59E0B] border border-[#FCD34D] shadow-[0_0_6px_rgba(245,158,11,0.3)]';
      case 3: // > 4h (Green)
        return 'bg-[#10B981] border border-[#34D399]';
      case 2: // 2-4h (Blue)
        return 'bg-[#3B82F6] border border-[#60A5FA]';
      case 1: // 0-2h (Deep Rose)
        return 'bg-[#F43F5E]/20 border border-[#F43F5E]/50';
      case 0: // 0h (Faded Red)
      default:
        return 'bg-[#EF4444]/[0.04] border border-[#EF4444]/25';
    }
  };

  // Helper for tier badge in the inspection HUD
  const renderTierBadge = (tier: FocusTier) => {
    switch (tier) {
      case 5:
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-[#06B6D4]/15 border border-[#06B6D4]/40 text-[#22D3EE] flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <span>💎</span>
            <span>VALUABLE DIAMOND FOCUS (≥ 8H)</span>
          </span>
        );
      case 4:
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#FBBF24] flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            <span>👑</span>
            <span>GOLDEN FOCUS (≥ 6H)</span>
          </span>
        );
      case 3:
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-[#10B981]/15 border border-[#10B981]/40 text-[#34D399] flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <span>⚡</span>
            <span>GREEN FOCUS (&gt; 4H)</span>
          </span>
        );
      case 2:
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-[#3B82F6]/15 border border-[#3B82F6]/40 text-[#60A5FA] flex items-center gap-1.5 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
            <span>🔷</span>
            <span>BLUE FOCUS (&gt; 2-4H)</span>
          </span>
        );
      case 1:
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-[#FB7185] flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
            <span>🌹</span>
            <span>DEEP ROSE FOCUS (0-2H)</span>
          </span>
        );
      case 0:
      default:
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-white/[0.05] border border-white/[0.1] text-[#94A3B8] flex items-center gap-1.5">
            <span>⭕</span>
            <span>REST / INACTIVE (0H)</span>
          </span>
        );
    }
  };

  return (
    <div
      id="focus-matrix-heatmap"
      className="w-full rounded-3xl border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.35)] relative overflow-hidden font-mono space-y-6 scroll-mt-24"
    >
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Icon, Title, Badge, Subtitle */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#A855F7]/30 bg-[#A855F7]/15 text-[#C084FC] shadow-[0_0_16px_rgba(168,85,247,0.25)]">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#F8FAFC] uppercase">
                FOCUS MATRIX HEATMAP
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                GITHUB STYLE
              </span>
            </div>
            <p className="mt-0.5 text-[11px] sm:text-xs font-mono text-[#94A3B8] tracking-wider uppercase">
              DAYWISE FOCUS INTENSITY DISTRIBUTION &amp; ACHIEVEMENT TIERS
            </p>
          </div>
        </div>

        {/* Right: Time Range Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.08] backdrop-blur-md self-start md:self-auto">
          {(['1M', '3M', '6M', '1Y'] as HeatmapTimeRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleTimeRangeChange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeRange === r
                  ? 'bg-[#3B82F6] text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {RANGE_CONFIG[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. SUMMARY METRIC HUD CARDS (8 CARDS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {/* Card 1: ACTIVE DAYS */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-md p-3.5 sm:p-4 text-center transition-all hover:border-white/[0.14]">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block">
            ACTIVE DAYS
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
            {rangeStats.activeDays}
          </div>
        </div>

        {/* Card 2: CURRENT STREAK */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-md p-3.5 sm:p-4 text-center transition-all hover:border-white/[0.14]">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] block">
            CURRENT STREAK
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight flex items-center justify-center gap-1.5">
            <span>{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</span>
            <span className="text-xl">🔥</span>
          </div>
        </div>

        {/* Card 3: 0H (FADED RED) */}
        <div className="rounded-2xl border border-[#EF4444]/25 bg-[#EF4444]/[0.05] backdrop-blur-md p-3.5 sm:p-4 text-center transition-all hover:border-[#EF4444]/40">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#F87171] block">
            0H (FADED RED)
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-[#EF4444] tracking-tight">
            {rangeStats.tier0}
          </div>
        </div>

        {/* Card 4: 0-2H (DEEP ROSE) */}
        <div className="rounded-2xl border border-[#F43F5E]/30 bg-[#F43F5E]/[0.06] backdrop-blur-md p-3.5 sm:p-4 text-center transition-all hover:border-[#F43F5E]/50">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#FB7185] block">
            0-2H (DEEP ROSE)
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-[#FB7185] tracking-tight">
            {rangeStats.tier1}
          </div>
        </div>

        {/* Card 5: 2-4H (BLUE) */}
        <div className="rounded-2xl border border-[#3B82F6]/30 bg-[#3B82F6]/[0.06] backdrop-blur-md p-3.5 sm:p-4 text-center transition-all hover:border-[#3B82F6]/50">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#60A5FA] block">
            2-4H (BLUE)
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-[#60A5FA] tracking-tight">
            {rangeStats.tier2}
          </div>
        </div>

        {/* Card 6: > 4H (GREEN) */}
        <div className="rounded-2xl border border-[#10B981]/30 bg-[#10B981]/[0.06] backdrop-blur-md p-3.5 sm:p-4 text-center transition-all hover:border-[#10B981]/50">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#34D399] block">
            &gt; 4H (GREEN)
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-[#34D399] tracking-tight">
            {rangeStats.tier3}
          </div>
        </div>

        {/* Card 7: ≥ 6H (GOLDEN) */}
        <div className="rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/[0.06] backdrop-blur-md p-3.5 sm:p-4 text-center transition-all hover:border-[#F59E0B]/50">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#FBBF24] block">
            ≥ 6H (GOLDEN)
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-[#FBBF24] tracking-tight">
            {rangeStats.tier4}
          </div>
        </div>

        {/* Card 8: ≥ 8H (DIAMOND) */}
        <div className="rounded-2xl border border-[#A855F7]/30 bg-[#A855F7]/[0.06] backdrop-blur-md p-3.5 sm:p-4 text-center transition-all hover:border-[#A855F7]/50">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#C084FC] block">
            ≥ 8H (DIAMOND)
          </span>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-[#C084FC] tracking-tight">
            {rangeStats.tier5}
          </div>
        </div>
      </div>

      {/* ── 3. HEATMAP MATRIX GRID ── */}
      <div
        ref={gridScrollRef}
        className="w-full overflow-x-auto pb-2 pt-1 select-none custom-scrollbar"
      >
        <div className="inline-block min-w-full">
          {/* Month Labels Row */}
          <div className="flex gap-1 sm:gap-1.5 pl-8 sm:pl-9 mb-2 h-4">
            {weeks.map((week) => (
              <div
                key={`m-${week.colIdx}`}
                className="w-3.5 sm:w-4 relative select-none shrink-0"
              >
                {week.monthLabel && (
                  <span className="absolute left-0 top-0 text-[10px] sm:text-[11px] font-mono text-[#94A3B8] font-bold whitespace-nowrap">
                    {week.monthLabel}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Grid Rows with Left Labels */}
          <div className="flex items-start">
            {/* Day of Week Labels (Mon, Wed, Fri) */}
            <div className="flex flex-col gap-1 sm:gap-1.5 shrink-0 w-8 sm:w-9 pr-2 pt-0.5 text-[10px] sm:text-[11px] font-mono text-[#94A3B8] font-semibold text-right select-none">
              <div className="h-3.5 sm:h-4 leading-none" /> {/* Sun */}
              <div className="h-3.5 sm:h-4 leading-none flex items-center justify-end">Mon</div>
              <div className="h-3.5 sm:h-4 leading-none" /> {/* Tue */}
              <div className="h-3.5 sm:h-4 leading-none flex items-center justify-end">Wed</div>
              <div className="h-3.5 sm:h-4 leading-none" /> {/* Thu */}
              <div className="h-3.5 sm:h-4 leading-none flex items-center justify-end">Fri</div>
              <div className="h-3.5 sm:h-4 leading-none" /> {/* Sat */}
            </div>

            {/* Matrix Week Columns */}
            <div className="flex gap-1 sm:gap-1.5">
              {weeks.map((week) => (
                <div key={week.colIdx} className="flex flex-col gap-1 sm:gap-1.5">
                  {week.days.map((day) => {
                    const isSelected = day.dateStr === selectedDateStr;
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        disabled={day.isFuture}
                        onClick={() => !day.isFuture && setSelectedDateStr(day.dateStr)}
                        title={day.isFuture ? 'Future' : `${day.dateStr}: ${formatDurationHoursMinutes(day.seconds)}`}
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3.5px] sm:rounded-[4px] relative flex items-center justify-center transition-all ${
                          day.isFuture
                            ? 'opacity-20 border border-white/[0.04] bg-white/[0.01] cursor-default'
                            : isSelected
                            ? 'ring-2 ring-[#38BDF8] shadow-[0_0_14px_rgba(56,189,248,0.9)] scale-110 z-20 cursor-pointer'
                            : 'hover:brightness-125 hover:scale-110 cursor-pointer'
                        } ${getCellStyle(day.tier, isSelected)}`}
                      >
                        {/* 0h faded red symbol: "×" */}
                        {day.tier === 0 && !day.isFuture && (
                          <span className="text-[9px] font-bold text-[#EF4444]/60 leading-none select-none">
                            ×
                          </span>
                        )}
                        {/* 0-2h deep rose symbol: "o" */}
                        {day.tier === 1 && !day.isFuture && (
                          <span className="text-[8px] font-black text-[#FDA4AF] leading-none select-none">
                            o
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. TIER COLORS LEGEND ── */}
      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#64748B] block">
          TIER COLORS LEGEND
        </span>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[#94A3B8]">
          {/* 0h */}
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3.5px] bg-[#EF4444]/[0.04] border border-[#EF4444]/25 flex items-center justify-center text-[9px] font-bold text-[#EF4444]/60">
              ×
            </div>
            <span className="text-[11px]">0h (Faded Red - X)</span>
          </div>

          {/* 0-2h */}
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3.5px] bg-[#F43F5E]/20 border border-[#F43F5E]/50 flex items-center justify-center text-[8px] font-black text-[#FDA4AF]">
              o
            </div>
            <span className="text-[11px]">0-2h (Deep Rose - O)</span>
          </div>

          {/* > 2-4h */}
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3.5px] bg-[#3B82F6] border border-[#60A5FA]" />
            <span className="text-[11px]">&gt; 2-4h (Blue)</span>
          </div>

          {/* > 4h */}
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3.5px] bg-[#10B981] border border-[#34D399]" />
            <span className="text-[11px]">&gt; 4h (Green)</span>
          </div>

          {/* ≥ 6h */}
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3.5px] bg-[#F59E0B] border border-[#FCD34D] shadow-[0_0_6px_rgba(245,158,11,0.3)]" />
            <span className="text-[11px]">≥ 6h (Golden)</span>
          </div>

          {/* ≥ 8h */}
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3.5px] bg-gradient-to-br from-[#818CF8] via-[#06B6D4] to-[#3B82F6] border border-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <span className="text-[11px]">≥ 8h (Diamond)</span>
          </div>
        </div>
      </div>

      {/* ── 5. SELECTED DAY INSPECTION HUD PANEL ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E121B]/80 backdrop-blur-md p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-3">
        {/* Top Row: Date, Focus Time, Tier Badge */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              DATE:
            </span>
            <span className="text-sm font-black uppercase text-[#F8FAFC]">
              {selectedDayHeader.dayName}
            </span>
            <span className="text-xs font-medium text-[#94A3B8]">
              {selectedDayHeader.formattedDate}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              FOCUS TIME:
            </span>
            <span className="text-sm font-black text-[#F8FAFC]">
              {formatDurationHoursMinutes(selectedDayInfo.seconds)}
            </span>
          </div>

          {renderTierBadge(selectedDayInfo.tier)}
        </div>

        {/* Bottom Row: Subjects Breakdown & Target Met Percentage */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mr-1">
              SUBJECTS:
            </span>
            {selectedDayInfo.subjects.length > 0 ? (
              selectedDayInfo.subjects.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.12] text-xs font-mono text-[#F1F5F9] font-medium shadow-sm"
                >
                  {item.subject}: {formatSubjectDuration(item.seconds)}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#64748B] italic">None</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              TARGET MET:
            </span>
            <span
              className={`text-sm font-black ${
                selectedDayInfo.targetMetPercent !== null && selectedDayInfo.targetMetPercent >= 100
                  ? 'text-[#38BDF8]'
                  : selectedDayInfo.targetMetPercent !== null
                  ? 'text-[#F8FAFC]'
                  : 'text-[#64748B]'
              }`}
            >
              {selectedDayInfo.targetMetPercent !== null
                ? `${selectedDayInfo.targetMetPercent}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

