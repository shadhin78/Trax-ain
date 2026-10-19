/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface CompletionCardProps {
  id: string;
  name: string;
  completedChapters: number;
  totalChapters: number;
  percentage: number;
  color: string;
  onClick?: () => void;
  onProgressClick?: () => void;
}

/**
 * Reusable Completion Card for Dashboard (Program Completion & Track Completion).
 * Features a circular progress gauge starting at 9 o'clock (180deg) sweeping clockwise,
 * matching the exact visual aesthetics of X-29 Legacy theme with zero hardcoded data.
 * The circular progress gauge can act as an interactive button to trigger breakdown popups.
 */
export const CompletionCard: React.FC<CompletionCardProps> = React.memo(({
  name,
  completedChapters,
  totalChapters,
  percentage,
  color,
  onClick,
  onProgressClick,
}) => {
  // SVG Radial Gauge Calculations
  const radius = 24;
  const circumference = 2 * Math.PI * radius; // ~150.796447
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const dashLength = (clampedPercentage / 100) * circumference;

  // Path starts at 9 o'clock (x: 10, y: 34) and sweeps clockwise through 12 o'clock and 3 o'clock back to 9 o'clock
  const circlePath = "M 10 34 A 24 24 0 0 1 58 34 A 24 24 0 0 1 10 34";

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`w-full rounded-[26px] sm:rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl px-6 py-4.5 sm:px-7 sm:py-5 font-mono flex items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-white/[0.18] transition-all duration-300 min-h-[92px] group ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      {/* ── LEFT: TITLE & CHAPTER STATS ── */}
      <div className="space-y-1 min-w-0 flex-1">
        <h4 className="font-mono text-sm sm:text-base font-bold uppercase tracking-wider text-[#F8FAFC] truncate">
          {name}
        </h4>
        <div className="font-mono text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] whitespace-nowrap">
          {completedChapters} / {totalChapters} CHAPTERS
        </div>
      </div>

      {/* ── RIGHT: CIRCULAR PROGRESS GAUGE (INTERACTIVE BUTTON WHEN onProgressClick PROVIDED) ── */}
      {onProgressClick ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onProgressClick();
          }}
          aria-label={`View completion breakdown for ${name}`}
          title={`View completion breakdown for ${name}`}
          className="relative w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full bg-[#080B13]/70 border border-white/[0.06] flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 active:scale-95 hover:border-white/25 transition-all duration-300 group/circle focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `inset 0 2px 8px rgba(0,0,0,0.6), 0 0 18px ${color}45`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.6)';
          }}
        >
          <svg
            className="w-full h-full overflow-visible p-1 pointer-events-none"
            viewBox="0 0 68 68"
            aria-hidden="true"
          >
            {/* Background circle track */}
            <path
              d={circlePath}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="5.5"
              fill="transparent"
            />
            {/* Active progress arc: starts at 9 o'clock sweeping clockwise */}
            <path
              d={circlePath}
              stroke={color}
              strokeWidth="5.5"
              strokeDasharray={`${dashLength} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              fill="transparent"
              style={{
                filter: `drop-shadow(0 0 7px ${color}90)`,
                transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </svg>

          {/* Center percentage readout */}
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
            <span
              className="font-mono text-xs sm:text-[13px] font-bold tracking-tight"
              style={{ color }}
            >
              {clampedPercentage}%
            </span>
          </div>
        </button>
      ) : (
        <div className="relative w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full bg-[#080B13]/70 border border-white/[0.04] flex items-center justify-center shrink-0 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
          <svg
            className="w-full h-full overflow-visible p-1"
            viewBox="0 0 68 68"
            aria-hidden="true"
          >
            {/* Background circle track */}
            <path
              d={circlePath}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="5.5"
              fill="transparent"
            />
            {/* Active progress arc: starts at 9 o'clock sweeping clockwise */}
            <path
              d={circlePath}
              stroke={color}
              strokeWidth="5.5"
              strokeDasharray={`${dashLength} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              fill="transparent"
              style={{
                filter: `drop-shadow(0 0 7px ${color}90)`,
                transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </svg>

          {/* Center percentage readout */}
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
            <span
              className="font-mono text-xs sm:text-[13px] font-bold tracking-tight"
              style={{ color }}
            >
              {clampedPercentage}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

CompletionCard.displayName = 'CompletionCard';

