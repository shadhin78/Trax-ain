/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useDailySchedule } from '../../../daily-schedule/context/DailyScheduleContext';
import { AppRoute } from '../../../../types/navigation';

interface ActiveNowShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

function formatHourRange(hour: number): string {
  const startPeriod = hour >= 12 ? 'PM' : 'AM';
  const displayStart = hour % 12 === 0 ? 12 : hour % 12;

  const nextHour = (hour + 1) % 24;
  const endPeriod = nextHour >= 12 ? 'PM' : 'AM';
  const displayEnd = nextHour % 12 === 0 ? 12 : nextHour % 12;

  return `${displayStart}:00 ${startPeriod} - ${displayEnd}:00 ${endPeriod}`;
}

export const ActiveNowShortcutCard: React.FC<ActiveNowShortcutCardProps> = React.memo(({ onNavigate }) => {
  const {
    currentActiveBlock,
    currentHour,
    formattedCountdown,
    hourProgressPercent,
  } = useDailySchedule();

  const handleNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate('/daily-schedule/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/daily-schedule/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const activeColor = currentActiveBlock?.color || '#3B82F6';
  const timeRange = currentActiveBlock
    ? currentActiveBlock.startTime && currentActiveBlock.endTime
      ? `${currentActiveBlock.startTime} - ${currentActiveBlock.endTime}`
      : formatHourRange(currentActiveBlock.hour)
    : formatHourRange(currentHour);

  // Safe color alpha helper for transparent legacy styling
  const withAlpha = (hexAlpha: string) => {
    if (activeColor.startsWith('#') && activeColor.length === 7) {
      return `${activeColor}${hexAlpha}`;
    }
    return activeColor;
  };

  return (
    <div className="w-full h-[270px] rounded-[24px] sm:rounded-[26px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-3.5 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] select-none overflow-hidden relative group">
      {/* ── AMBIENT TINT GLOW (MATCHING BLOCK COLOR IN LEGACY TRANSPARENT THEME) ── */}
      {currentActiveBlock && (
        <div
          className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none opacity-20 blur-3xl transition-all duration-500"
          style={{ backgroundColor: activeColor }}
        />
      )}

      {/* ── TOP HEADER ROW: TITLE + GREEN LIVE PULSE DOT + NAVIGATION ICON ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-2 shrink-0 relative z-10">
        <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate">
          ACTIVE NOW
        </h3>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Green pulse indicator */}
          <span className="relative flex h-2.5 w-2.5" title={currentActiveBlock ? 'Routine Active' : 'Standby'}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]" />
          </span>

          {/* Only this navigation icon navigates to the Daily Schedule page */}
          <button
            type="button"
            onClick={handleNavigation}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            title="Open Daily Schedule"
            aria-label="Open Daily Schedule"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── INNER CONTAINER (LEGACY TRANSPARENCY COLOR TYPE) ── */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10">
        {currentActiveBlock ? (
          <div
            className="w-full h-full rounded-2xl border p-3 sm:p-3.5 flex flex-col justify-between relative overflow-hidden backdrop-blur-md transition-all duration-300"
            style={{
              background: `linear-gradient(145deg, ${withAlpha('24')} 0%, ${withAlpha('0E')} 60%, rgba(11, 15, 25, 0.4) 100%)`,
              borderColor: withAlpha('40'),
              boxShadow: `0 8px 30px rgba(0, 0, 0, 0.35), inset 0 0 24px ${withAlpha('14')}`,
            }}
          >
            {/* Ambient specular highlight */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background: `linear-gradient(135deg, ${withAlpha('20')} 0%, transparent 60%)`,
              }}
            />

            {/* Top Row: ROUTINE Badge + Time Range */}
            <div className="flex items-center justify-between relative z-10 gap-2">
              <span
                className="px-2 py-0.5 rounded-md border text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider shrink-0"
                style={{
                  backgroundColor: withAlpha('25'),
                  borderColor: withAlpha('50'),
                  color: activeColor,
                }}
              >
                ROUTINE
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-white/80 tracking-wider truncate">
                {timeRange}
              </span>
            </div>

            {/* Center: Block Title & Hero Countdown Timer */}
            <div className="my-auto py-1 relative z-10">
              <h4 className="text-xs sm:text-sm font-black text-[#F8FAFC] tracking-tight truncate drop-shadow-sm">
                {currentActiveBlock.title}
              </h4>
              <div
                className="font-mono text-3xl sm:text-4xl font-black text-center tracking-tight text-white my-1"
                style={{
                  textShadow: `0 0 20px ${withAlpha('70')}`,
                }}
              >
                {formattedCountdown}
              </div>
            </div>

            {/* Bottom Row: Progress Bar & Status Info */}
            <div className="space-y-1 relative z-10">
              <div className="h-1.5 sm:h-2 w-full rounded-full bg-black/40 border border-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, hourProgressPercent))}%`,
                    backgroundColor: activeColor,
                    boxShadow: `0 0 10px ${activeColor}`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[8px] sm:text-[8.5px] font-bold">
                <span className="text-white/70 uppercase truncate">
                  {currentActiveBlock.category || currentActiveBlock.groupName || 'ROUTINE'}
                </span>
                <span className="text-white/90">
                  {Math.round(hourProgressPercent)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Free Time / Standby State with Legacy Transparency */
          <div className="w-full h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-3.5 flex flex-col justify-between backdrop-blur-md text-center transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md border border-[#10B981]/30 bg-[#10B981]/15 text-[#34D399] text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider">
                STANDBY
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#94A3B8] tracking-wider">
                {formatHourRange(currentHour)}
              </span>
            </div>

            <div className="my-auto py-1">
              <h4 className="text-xs sm:text-sm font-black text-[#F59E0B] tracking-wider uppercase">
                FREE TIME
              </h4>
              <div className="font-mono text-2xl sm:text-3xl font-black text-white/90 my-1">
                {formattedCountdown}
              </div>
              <p className="text-[8px] text-[#94A3B8] uppercase tracking-wider">
                NO ACTIVE ROUTINE SCHEDULED
              </p>
            </div>

            <div className="space-y-1">
              <div className="h-1.5 sm:h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#10B981] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, hourProgressPercent))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[8px] sm:text-[8.5px] font-bold text-[#64748B] uppercase">
                <span>OPEN SLOT</span>
                <span>{Math.round(hourProgressPercent)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ActiveNowShortcutCard.displayName = 'ActiveNowShortcutCard';
