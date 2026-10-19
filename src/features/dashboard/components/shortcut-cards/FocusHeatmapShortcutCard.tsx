/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { LayoutGrid, ExternalLink } from 'lucide-react';
import { useFocusTimer } from '../../../focus/context/FocusTimerContext';
import { AppRoute } from '../../../../types/navigation';

interface FocusHeatmapShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatBadgeDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${d}/${m}/${y}`;
}

function formatDurationHhMm(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0h 0m';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

const DAY_NAMES_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatCellHeaderDate(date: Date, isToday: boolean): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = SHORT_MONTH_NAMES[date.getMonth()].toUpperCase();
  const y = date.getFullYear();
  const dayName = DAY_NAMES_SHORT[date.getDay()];
  return isToday ? `${d} ${m} ${y} • TODAY` : `${d} ${m} ${y} • ${dayName}`;
}

interface MatrixDay {
  date: Date;
  iso: string;
  isToday: boolean;
  isFuture: boolean;
  seconds: number;
}

interface MatrixWeek {
  weekIndex: number;
  monthLabel?: string;
  isCurrentWeek: boolean;
  days: MatrixDay[];
}

export const FocusHeatmapShortcutCard: React.FC<FocusHeatmapShortcutCardProps> = React.memo(({ onNavigate }) => {
  const { sessions, displayElapsedMs } = useFocusTimer();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayIso = useMemo(() => formatIsoDate(today), [today]);

  const liveSec = Math.floor((displayElapsedMs || 0) / 1000);

  // Aggregate session durations by date ISO
  const { daySecondsMap, totalFocusSeconds } = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;

    sessions.forEach((s) => {
      const dStr = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
      if (!dStr) return;
      const dur = s.durationSeconds || 0;
      map.set(dStr, (map.get(dStr) || 0) + dur);
      total += dur;
    });

    // Add currently active live elapsed time
    if (liveSec > 0) {
      map.set(todayIso, (map.get(todayIso) || 0) + liveSec);
      total += liveSec;
    }

    return { daySecondsMap: map, totalFocusSeconds: total };
  }, [sessions, liveSec, todayIso]);

  // Build 10-week grid ending at the current week's end (Sunday)
  const weeks = useMemo(() => {
    const result: MatrixWeek[] = [];
    const NUM_WEEKS = 10;

    // Find the Sunday of the current week (ISO Monday-Sunday week)
    const currentDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon... 6 is Sat
    const diffToSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
    const currentWeekEnd = new Date(today);
    currentWeekEnd.setDate(today.getDate() + diffToSunday);
    currentWeekEnd.setHours(0, 0, 0, 0);

    // Start date is NUM_WEEKS * 7 - 1 days before currentWeekEnd
    const startDate = new Date(currentWeekEnd);
    startDate.setDate(currentWeekEnd.getDate() - (NUM_WEEKS * 7 - 1));
    startDate.setHours(0, 0, 0, 0);

    let lastMonth = -1;

    for (let w = 0; w < NUM_WEEKS; w++) {
      const days: MatrixDay[] = [];
      let weekMonthLabel: string | undefined = undefined;
      let isCurrentWeek = false;

      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + (w * 7 + d));
        const iso = formatIsoDate(cellDate);
        const isToday = iso === todayIso;
        const isFuture = cellDate.getTime() > today.getTime();
        const seconds = daySecondsMap.get(iso) || 0;

        if (isToday) {
          isCurrentWeek = true;
        }

        // Detect month boundary for header
        const cellMonth = cellDate.getMonth();
        if (cellMonth !== lastMonth && !weekMonthLabel && (d === 0 || d === 1)) {
          weekMonthLabel = SHORT_MONTH_NAMES[cellMonth];
          lastMonth = cellMonth;
        }

        days.push({
          date: cellDate,
          iso,
          isToday,
          isFuture,
          seconds,
        });
      }

      result.push({
        weekIndex: w,
        monthLabel: weekMonthLabel,
        isCurrentWeek,
        days,
      });
    }

    return result;
  }, [today, todayIso, daySecondsMap]);

  const [hoveredCell, setHoveredCell] = React.useState<{
    iso: string;
    formattedDate: string;
    seconds: number;
    durationText: string;
    hasFocus: boolean;
  } | null>(null);

  const handleNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate('/analytics/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/analytics/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const defaultBadgeText = `${formatBadgeDate(today)} - ${formatDurationHhMm(totalFocusSeconds)}`;

  return (
    <div
      className="w-full h-[270px] rounded-[24px] sm:rounded-[26px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-3.5 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] md:hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] group select-none overflow-hidden"
    >
      {/* ── TOP HEADER ROW (Displays hover info dynamically) ── */}
      <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-white/[0.06] mb-1.5 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#F43F5E]/15 text-[#FB7185] border border-[#F43F5E]/30 shadow-[0_0_12px_rgba(244,63,94,0.2)] transition-transform duration-300 md:group-hover:scale-105">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate">
              FOCUS HEATMAP
            </h3>
            <p
              className={`text-[8.5px] sm:text-[9px] font-bold tracking-widest uppercase truncate transition-colors duration-150 ${
                hoveredCell ? 'text-[#38BDF8]' : 'text-[#64748B]'
              }`}
            >
              {hoveredCell ? hoveredCell.formattedDate : '2 MONTH GRID'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full border text-[8.5px] sm:text-[9px] font-bold tracking-tight transition-all duration-150 ${
              hoveredCell
                ? hoveredCell.hasFocus
                  ? 'bg-[#F43F5E]/15 border-[#F43F5E]/40 text-[#FB7185] shadow-[0_0_8px_rgba(244,63,94,0.25)]'
                  : 'bg-white/[0.04] border-white/[0.08] text-[#94A3B8]'
                : 'bg-white/[0.06] border-white/[0.1] text-[#F8FAFC]'
            }`}
          >
            {hoveredCell ? hoveredCell.durationText : defaultBadgeText}
          </span>
          <button
            type="button"
            onClick={handleNavigation}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F43F5E]"
            title="Open Focus Analytics"
            aria-label="Open Focus Analytics"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── HEATMAP GRID DISPLAY (Pure tiles without cell clutter; hover updates header) ── */}
      <div
        className="flex-1 min-h-0 flex flex-col justify-center py-1"
        onMouseLeave={() => setHoveredCell(null)}
        onPointerLeave={() => setHoveredCell(null)}
      >
        {/* Month Labels Row */}
        <div className="flex items-center pl-4 sm:pl-5 mb-1">
          <div className="grid grid-cols-10 gap-1 sm:gap-1.5 w-full">
            {weeks.map((week, idx) => (
              <div key={idx} className="text-[8px] sm:text-[9px] font-bold text-[#94A3B8] text-center uppercase tracking-tight">
                {week.monthLabel || ''}
              </div>
            ))}
          </div>
        </div>

        {/* 7-Row Grid (Mon to Sun) */}
        <div className="flex items-stretch gap-1.5 sm:gap-2">
          {/* Left Day Labels: M, W, F */}
          <div className="flex flex-col justify-between py-0.5 text-[8px] sm:text-[8.5px] font-bold text-[#64748B] select-none w-3 sm:w-3.5 shrink-0 text-right">
            <span>M</span>
            <span className="opacity-0">T</span>
            <span>W</span>
            <span className="opacity-0">T</span>
            <span>F</span>
            <span className="opacity-0">S</span>
            <span className="opacity-0">S</span>
          </div>

          {/* Matrix Columns (10 Weeks) */}
          <div className="grid grid-cols-10 gap-1 sm:gap-1.5 flex-1 relative">
            {weeks.map((week, wIdx) => {
              return (
                <div
                  key={wIdx}
                  className={`flex flex-col gap-1 sm:gap-1.5 relative p-0.5 rounded-lg transition-all ${
                    week.isCurrentWeek
                      ? 'bg-white/[0.02] ring-1 ring-[#F43F5E]/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                      : ''
                  }`}
                >
                  {week.days.map((day, dIdx) => {
                    const hasFocus = day.seconds > 0;
                    const hours = day.seconds / 3600;

                    // Dynamic tier styling
                    let cellStyle = 'bg-white/[0.02] border border-white/[0.05] hover:border-white/30 hover:bg-white/[0.07]';
                    if (hours >= 8) {
                      cellStyle = 'bg-gradient-to-br from-[#818CF8]/30 via-[#06B6D4]/30 to-[#3B82F6]/30 border border-[#38BDF8]/60 shadow-[0_0_12px_rgba(56,189,248,0.4)] hover:border-[#38BDF8]';
                    } else if (hours >= 6) {
                      cellStyle = 'bg-[#F59E0B]/20 border border-[#F59E0B]/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] hover:border-[#FCD34D]';
                    } else if (hours >= 4) {
                      cellStyle = 'bg-[#10B981]/20 border border-[#10B981]/50 shadow-[0_0_8px_rgba(16,185,129,0.3)] hover:border-[#34D399]';
                    } else if (hours >= 2) {
                      cellStyle = 'bg-[#3B82F6]/20 border border-[#3B82F6]/50 shadow-[0_0_8px_rgba(59,130,246,0.3)] hover:border-[#60A5FA]';
                    } else if (hours > 0) {
                      cellStyle = 'bg-[#F43F5E]/15 border border-[#F43F5E]/40 shadow-[0_0_8px_rgba(244,63,94,0.25)] hover:border-[#F43F5E]';
                    }

                    const handleHover = () => {
                      setHoveredCell({
                        iso: day.iso,
                        formattedDate: formatCellHeaderDate(day.date, day.isToday),
                        seconds: day.seconds,
                        durationText: hasFocus ? `${formatDurationHhMm(day.seconds)} FOCUS` : 'NO FOCUS',
                        hasFocus,
                      });
                    };

                    return (
                      <button
                        type="button"
                        key={dIdx}
                        tabIndex={0}
                        aria-label={`Heatmap cell for ${day.iso}: ${hasFocus ? formatDurationHhMm(day.seconds) : 'no focus'}`}
                        data-cell-iso={day.iso}
                        onMouseEnter={handleHover}
                        onMouseOver={handleHover}
                        onPointerEnter={handleHover}
                        onFocus={handleHover}
                        onTouchStart={handleHover}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleHover();
                        }}
                        className={`
                          w-full h-4 sm:h-4.5 rounded-[5px] select-none cursor-pointer transition-all duration-150 md:hover:scale-125 md:hover:z-30 p-0 outline-none
                          ${day.isToday ? 'ring-1.5 ring-white/90 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}
                          ${cellStyle}
                        `}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM FOOTER / LEGEND ── */}
      <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] text-[8px] sm:text-[8.5px] font-bold text-[#64748B] shrink-0">
        <span className="uppercase tracking-wider">
          70 DAYS • {sessions.length} SESSIONS
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[7.5px] uppercase tracking-wider text-[#64748B]">LESS</span>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-white/[0.04] border border-white/[0.08]" title="0h" />
            <span className="h-2 w-2 rounded-xs bg-[#F43F5E]/30 border border-[#F43F5E]/60" title="< 2h" />
            <span className="h-2 w-2 rounded-xs bg-[#3B82F6]/30 border border-[#3B82F6]/60" title="2-4h" />
            <span className="h-2 w-2 rounded-xs bg-[#10B981]/30 border border-[#10B981]/60" title="4-6h" />
            <span className="h-2 w-2 rounded-xs bg-[#F59E0B]/30 border border-[#F59E0B]/60" title="6-8h" />
            <span className="h-2 w-2 rounded-xs bg-[#06B6D4]/40 border border-[#06B6D4]/70" title="≥ 8h" />
          </div>
          <span className="text-[7.5px] uppercase tracking-wider text-[#64748B]">MORE</span>
        </div>
      </div>
    </div>
  );
});

FocusHeatmapShortcutCard.displayName = 'FocusHeatmapShortcutCard';
