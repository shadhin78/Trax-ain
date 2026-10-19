/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useDailySchedule } from '../context/DailyScheduleContext';

function formatHourRange(hour: number): string {
  const startPeriod = hour >= 12 ? 'PM' : 'AM';
  const displayStart = hour % 12 === 0 ? 12 : hour % 12;

  const nextHour = (hour + 1) % 24;
  const endPeriod = nextHour >= 12 ? 'PM' : 'AM';
  const displayEnd = nextHour % 12 === 0 ? 12 : nextHour % 12;

  return `${displayStart}:00 ${startPeriod} - ${displayEnd}:00 ${endPeriod}`;
}

export const ActiveNowCard: React.FC = () => {
  const {
    currentActiveBlock,
    currentHour,
    formattedCountdown,
    hourProgressPercent,
  } = useDailySchedule();

  const activeColor = currentActiveBlock?.color || '#E11D48';

  const withAlpha = (hexAlpha: string) => {
    if (activeColor.startsWith('#') && activeColor.length === 7) {
      return `${activeColor}${hexAlpha}`;
    }
    return activeColor;
  };

  return (
    <div className="w-full rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono select-none transition-all duration-300 relative overflow-hidden">
      {/* ── AMBIENT TINT GLOW ── */}
      {currentActiveBlock && (
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none opacity-20 blur-3xl transition-all duration-500"
          style={{ backgroundColor: activeColor }}
        />
      )}

      {/* ── HEADER ROW: TITLE + GREEN LIVE PULSE DOT ── */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] relative z-10">
        <span className="text-xs sm:text-sm font-black text-[#F8FAFC] tracking-wider uppercase">
          ACTIVE NOW
        </span>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]" />
          </span>
        </div>
      </div>

      {/* ── ACTIVE ROUTINE DISPLAY CARD (LEGACY TRANSPARENCY THEME) ── */}
      <div className="mt-4 relative z-10">
        {currentActiveBlock ? (
          <div
            className="w-full rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden transition-all duration-300 md:hover:scale-[1.01] border backdrop-blur-md"
            style={{
              background: `linear-gradient(145deg, ${withAlpha('24')} 0%, ${withAlpha('0E')} 60%, rgba(11, 15, 25, 0.4) 100%)`,
              borderColor: withAlpha('40'),
              boxShadow: `0 12px 36px rgba(0,0,0,0.4), inset 0 0 24px ${withAlpha('14')}`,
            }}
          >
            {/* Ambient specular highlight */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background: `linear-gradient(135deg, ${withAlpha('20')} 0%, transparent 60%)`,
              }}
            />

            <div className="relative z-10 flex flex-col justify-between min-h-[140px] sm:min-h-[150px]">
              {/* Top Row: ROUTINE Badge */}
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-0.5 rounded-md border text-[9px] font-black tracking-widest uppercase backdrop-blur-sm"
                  style={{
                    backgroundColor: withAlpha('25'),
                    borderColor: withAlpha('50'),
                    color: activeColor,
                  }}
                >
                  ROUTINE
                </span>
              </div>

              {/* Center Row: Block Title & Big Countdown Timer */}
              <div className="my-2">
                <h4 className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-sm">
                  {currentActiveBlock.title}
                </h4>

                <div className="mt-2 text-center">
                  <div className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-md">
                    {formattedCountdown}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Dynamic Progress Bar & Time Interval */}
              <div className="space-y-2 mt-1">
                {/* Progress bar track */}
                <div className="h-2 w-full bg-black/25 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                    style={{ width: `${hourProgressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-white/90">
                  <span>{currentActiveBlock.startTime && currentActiveBlock.endTime ? `${currentActiveBlock.startTime} - ${currentActiveBlock.endTime}` : formatHourRange(currentActiveBlock.hour)}</span>
                  <span className="text-white/70 text-[10px]">{Math.round(hourProgressPercent)}%</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standby State when no routine is scheduled for the current hour */
          <div className="w-full rounded-2xl p-6 border border-white/[0.08] bg-[#131722]/50 text-center flex flex-col items-center justify-center min-h-[150px]">
            <span className="text-[10px] text-[#94A3B8] tracking-widest uppercase font-bold">
              CURRENT HOUR ({formatHourRange(currentHour)})
            </span>
            <h4 className="mt-2 text-base font-black text-[#F8FAFC]">
              NO ACTIVE ROUTINE
            </h4>
            <div className="mt-2 font-mono text-2xl font-bold text-[#64748B]">
              {formattedCountdown}
            </div>
            <p className="mt-1 text-[10px] text-white/40">
              Time remaining in current 1-hour block
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
