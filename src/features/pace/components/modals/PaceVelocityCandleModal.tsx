/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Flame } from 'lucide-react';
import { PaceGoal } from '../../types';
import { usePace } from '../../context/PaceContext';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { 
  buildDailyVelocityBreakdown, 
  formatPaceValue, 
  parseLocalDate, 
  MS_PER_DAY 
} from '../../utils/paceCalculations';

interface PaceVelocityCandleModalProps {
  goal: PaceGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

type FilterMode = '14' | '30' | 'all';

export const PaceVelocityCandleModal: React.FC<PaceVelocityCandleModalProps> = ({
  goal,
  isOpen,
  onClose,
}) => {
  const { calculateStatsForGoal } = usePace();
  const { completionRecords } = useAcademicHierarchy();

  const [filterMode, setFilterMode] = useState<FilterMode>('14');
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Smooth exit animation handler (PC only; instant on mobile)
  const initiateClose = useCallback(() => {
    if (isClosing) return;
    const isPc = typeof window !== 'undefined' ? window.innerWidth >= 768 : false;
    if (!isPc) {
      onClose();
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 190);
  }, [isClosing, onClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        initiateClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  const start = useMemo(() => parseLocalDate(goal?.startDate), [goal?.startDate]);
  const deadline = useMemo(() => parseLocalDate(goal?.deadline), [goal?.deadline]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Compute number of days based on selected filter mode: 14D | 30D | ALL (pace time range)
  const daysRange = useMemo(() => {
    if (filterMode === '14') return 14;
    if (filterMode === '30') return 30;

    // 'all' represents the time range set for the pace
    const effectiveEnd = today > deadline ? deadline : today;
    if (effectiveEnd < start) {
      // Future pace: calculate full timeline days
      return Math.max(1, Math.ceil((deadline.getTime() - start.getTime()) / MS_PER_DAY) + 1);
    }
    return Math.max(1, Math.ceil((effectiveEnd.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  }, [filterMode, start, deadline, today]);

  if (!isOpen || !goal || typeof document === 'undefined') return null;

  const stats = calculateStatsForGoal(goal);
  const velocityData = buildDailyVelocityBreakdown(
    completionRecords, 
    stats.targetedSubjectIds, 
    daysRange
  );

  // Peak velocity & totals
  const peakDaily = Math.max(1, ...velocityData.map((d) => d.completedCount));
  const totalInPeriod = velocityData.reduce((acc, d) => acc + d.completedCount, 0);
  const averageVelocity = totalInPeriod / daysRange;
  const activeDaysCount = velocityData.filter((d) => d.completedCount > 0).length;

  const goalTitle = goal.type === 'global' ? 'Global Pace' : (goal.target || 'Pace Target');

  const scopeBadge = 
    goal.type === 'global'
      ? 'Global Cadence'
      : goal.type === 'programs'
      ? 'Program Velocity'
      : goal.type === 'subjects'
      ? 'Subject Velocity'
      : 'Bundle Velocity';

  const subtitleText = 
    filterMode === 'all'
      ? `Daily completion velocity & study cadence across pace timeline (${daysRange} days)`
      : `Daily completion velocity & study cadence over the last ${daysRange} days`;

  const velocityLabel = filterMode === 'all' ? 'Pace Velocity' : `${daysRange}-Day Velocity`;
  const finishedLabel = filterMode === 'all' ? 'Finished in Pace' : `Finished in ${daysRange}D`;

  // SVG Geometry Dimensions
  const chartWidth = 920;
  const chartHeight = 240;
  const padding = { top: 22, right: 20, bottom: 34, left: 48 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;
  const baselineY = padding.top + graphHeight;

  const N = velocityData.length;
  const slotWidth = N > 0 ? graphWidth / N : graphWidth;

  const barWidth =
    N <= 14
      ? Math.min(36, slotWidth * 0.58)
      : N <= 30
      ? Math.min(20, slotWidth * 0.68)
      : N <= 60
      ? Math.min(10, slotWidth * 0.75)
      : Math.max(1.8, slotWidth * 0.82);

  // Indices that should display date labels along X axis
  let visibleDateIndices: number[] = [];
  if (N <= 14) {
    visibleDateIndices = Array.from({ length: N }, (_, i) => i);
  } else if (N <= 30) {
    for (let i = 0; i < N - 1; i += 5) {
      visibleDateIndices.push(i);
    }
    visibleDateIndices.push(N - 1);
  } else {
    // For wide ranges (> 30 days, e.g. 282 days): 7 milestone dates evenly spaced
    const count = 7;
    const step = (N - 1) / (count - 1);
    for (let k = 0; k < count; k++) {
      visibleDateIndices.push(Math.round(k * step));
    }
    visibleDateIndices = Array.from(new Set(visibleDateIndices));
  }

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX === undefined) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const touchX = clientX - rect.left;
    const svgX = (touchX / rect.width) * chartWidth;
    if (svgX >= padding.left && svgX <= padding.left + graphWidth && N > 0) {
      const frac = (svgX - padding.left) / graphWidth;
      const idx = Math.floor(frac * N);
      const clampedIdx = Math.max(0, Math.min(N - 1, idx));
      setHoveredIndex(clampedIdx);
    } else {
      setHoveredIndex(null);
    }
  };

  const hoveredItem = hoveredIndex !== null && hoveredIndex < N ? velocityData[hoveredIndex] : null;
  const hoverSlotX = hoveredIndex !== null ? padding.left + hoveredIndex * slotWidth : 0;
  const hoverCenterX = hoveredIndex !== null ? hoverSlotX + slotWidth / 2 : 0;
  const hoverPctX = (hoverCenterX / chartWidth) * 100;

  return createPortal(
    <div 
      className={`
        fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md font-mono
        ${isClosing ? 'animate-trend-backdrop-out' : 'animate-trend-backdrop-in'}
      `}
      onClick={initiateClose}
    >
      <div 
        className={`
          w-full max-w-4xl lg:max-w-5xl rounded-3xl border border-white/[0.12] bg-[#0B0F19]/80 backdrop-blur-2xl
          p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col max-h-[92vh] overflow-hidden font-mono relative
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient legacy background glow orbs */}
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#F59E0B]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 shadow-[0_0_16px_rgba(245,158,11,0.2)]">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-[#F8FAFC] font-mono tracking-tight">
                  {goalTitle}
                </h3>
                <span className="font-mono text-[9px] uppercase px-2.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 font-bold">
                  {scopeBadge}
                </span>
              </div>
              <p className="font-mono text-xs text-[#94A3B8] mt-0.5">
                {subtitleText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Days Range Toggle (14D | 30D | ALL) */}
            <div className="flex items-center bg-[#070A11]/80 border border-white/[0.08] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => { setFilterMode('14'); setHoveredIndex(null); }}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  filterMode === '14'
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                14D
              </button>
              <button
                type="button"
                onClick={() => { setFilterMode('30'); setHoveredIndex(null); }}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  filterMode === '30'
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                30D
              </button>
              <button
                type="button"
                onClick={() => { setFilterMode('all'); setHoveredIndex(null); }}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
                title={`Pace Timeline Range (${daysRange} days)`}
              >
                ALL
              </button>
            </div>

            <button
              type="button"
              onClick={initiateClose}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 relative z-10">
          
          {/* 4 Metric Cards (Clean, Focused, Monospace) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 text-center backdrop-blur-md">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                {velocityLabel}
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-[#F8FAFC] mt-0.5 block">
                {formatPaceValue(averageVelocity)} <span className="text-[10px] font-normal text-[#94A3B8]">ch/d</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 text-center backdrop-blur-md">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Peak Single Day
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-[#10B981] mt-0.5 block drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                {peakDaily} <span className="text-[10px] font-normal text-[#94A3B8]">ch</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 text-center backdrop-blur-md">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                {finishedLabel}
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-[#818CF8] mt-0.5 block drop-shadow-[0_0_12px_rgba(129,140,248,0.3)]">
                {totalInPeriod} <span className="text-[10px] font-normal text-[#94A3B8]">ch</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0E121B]/60 text-center backdrop-blur-md">
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Active Days
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-[#F59E0B] mt-0.5 block drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                {activeDaysCount} <span className="text-[10px] font-normal text-[#94A3B8]">/ {daysRange}d</span>
              </span>
            </div>
          </div>

          {/* Daily Candlestick / Bar Visualizer (Full Width - NO SLIDER) */}
          <div className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#070A11]/75 backdrop-blur-md relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                Daily Output (Chapters / Day)
              </span>
              <span className="font-mono text-[9px] text-[#64748B]">
                Peak: <strong className="text-[#10B981]">{peakDaily} ch</strong>
              </span>
            </div>

            {/* Main Bar Chart Stage (Responsive SVG - No Flexbox blowout) */}
            <div className="relative h-60 sm:h-64 w-full select-none flex items-center justify-center">
              {/* Floating Tooltip */}
              {hoveredItem && (
                <div
                  className="absolute z-30 pointer-events-none transition-all duration-75"
                  style={{
                    left: `${hoverPctX}%`,
                    top: '8px',
                    transform: hoverPctX < 18 ? 'translateX(0%)' : hoverPctX > 82 ? 'translateX(-100%)' : 'translateX(-50%)',
                  }}
                >
                  <div className="bg-[#0B0F19]/95 border border-white/[0.18] rounded-xl px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.9)] text-center font-mono backdrop-blur-md whitespace-nowrap min-w-[120px]">
                    <div className="text-[10px] text-[#94A3B8] font-bold">
                      {hoveredItem.displayDate} {hoveredIndex === N - 1 ? '· Today' : ''}
                    </div>
                    <div className={`text-xs font-black mt-0.5 ${hoveredItem.completedCount > 0 ? 'text-[#10B981]' : 'text-white/40'}`}>
                      {hoveredItem.completedCount} {hoveredItem.completedCount === 1 ? 'Chapter' : 'Chapters'}
                    </div>
                    {filterMode === 'all' && (
                      <div className="text-[9px] text-[#64748B] mt-0.5">
                        Day {hoveredIndex! + 1} of {daysRange}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* The SVG Canvas */}
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full overflow-visible"
                onMouseMove={handlePointerMove}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchMove={handlePointerMove}
                onTouchEnd={() => setHoveredIndex(null)}
              >
                <defs>
                  {/* Vibrant amber-emerald vertical bar gradient */}
                  <linearGradient id="velBarGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
                    <stop offset="55%" stopColor="#10B981" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#34D399" stopOpacity="1" />
                  </linearGradient>

                  {/* Soft emerald neon glow filter */}
                  <filter id="velBarGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10B981" floodOpacity="0.45" />
                  </filter>
                </defs>

                {/* Reference Grid Lines */}
                {/* 100% Peak Line */}
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={padding.left + graphWidth}
                  y2={padding.top}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={padding.top + 3}
                  textAnchor="end"
                  className="text-[9.5px] font-mono fill-[#10B981] font-bold"
                >
                  {peakDaily} ch
                </text>

                {/* 50% Mid Line */}
                {peakDaily > 1 && (
                  <>
                    <line
                      x1={padding.left}
                      y1={padding.top + graphHeight / 2}
                      x2={padding.left + graphWidth}
                      y2={padding.top + graphHeight / 2}
                      stroke="rgba(255,255,255,0.04)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 8}
                      y={padding.top + graphHeight / 2 + 3}
                      textAnchor="end"
                      className="text-[9.5px] font-mono fill-[#64748B]"
                    >
                      {Math.round(peakDaily / 2)} ch
                    </text>
                  </>
                )}

                {/* Baseline Axis */}
                <line
                  x1={padding.left}
                  y1={baselineY}
                  x2={padding.left + graphWidth}
                  y2={baselineY}
                  stroke="rgba(255,255,255,0.12)"
                />
                <text
                  x={padding.left - 8}
                  y={baselineY + 3}
                  textAnchor="end"
                  className="text-[9.5px] font-mono fill-[#64748B]"
                >
                  0
                </text>

                {/* Vertical Cursor Guide when Hovered */}
                {hoveredIndex !== null && (
                  <g pointerEvents="none">
                    <rect
                      x={hoverSlotX}
                      y={padding.top}
                      width={Math.max(slotWidth, 3)}
                      height={graphHeight}
                      fill="rgba(255,255,255,0.06)"
                      rx={1.5}
                    />
                    <line
                      x1={hoverCenterX}
                      y1={padding.top}
                      x2={hoverCenterX}
                      y2={baselineY}
                      stroke="rgba(255,255,255,0.22)"
                      strokeDasharray="2 2"
                    />
                  </g>
                )}

                {/* Render All Bars Across Full Timeline */}
                {velocityData.map((d, i) => {
                  const slotX = padding.left + i * slotWidth;
                  const barX = slotX + (slotWidth - barWidth) / 2;
                  const hasActivity = d.completedCount > 0;
                  const isToday = i === N - 1;
                  const isHovered = hoveredIndex === i;

                  if (hasActivity) {
                    const heightPct = peakDaily > 0 ? d.completedCount / peakDaily : 0;
                    const barH = Math.max(14, heightPct * (graphHeight - 14));
                    const barY = baselineY - barH;

                    return (
                      <g key={d.dateStr} className="cursor-pointer">
                        {/* Active Bar Body */}
                        <rect
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={barH}
                          rx={Math.min(3, barWidth / 2)}
                          fill="url(#velBarGrad)"
                          filter="url(#velBarGlow)"
                          className="animate-bar-grow"
                          style={{
                            animationDelay: `${Math.min(25, i) * 12}ms`,
                            opacity: isHovered ? 1 : 0.95,
                          }}
                        />

                        {/* Bright Glowing Cap */}
                        <rect
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={Math.min(3.5, barH)}
                          rx={Math.min(1.5, barWidth / 2)}
                          fill="#FFFFFF"
                          fillOpacity={isHovered ? 1 : 0.85}
                        />

                        {/* Today Accent Ring */}
                        {isToday && (
                          <rect
                            x={barX - 1}
                            y={barY - 1}
                            width={barWidth + 2}
                            height={barH + 2}
                            rx={Math.min(4, (barWidth + 2) / 2)}
                            fill="none"
                            stroke="#38BDF8"
                            strokeWidth="1"
                            strokeOpacity="0.9"
                          />
                        )}

                        {/* Value Text Above Bar (Shown for comfortable range <= 18 days) */}
                        {N <= 18 && (
                          <text
                            x={barX + barWidth / 2}
                            y={barY - 5}
                            textAnchor="middle"
                            className="text-[9.5px] font-mono font-bold fill-[#F8FAFC]"
                          >
                            {d.completedCount}
                          </text>
                        )}
                      </g>
                    );
                  }

                  // Inactive day (0 completed): subtle baseline cadence tick
                  const notchH = 3;
                  const notchY = baselineY - notchH;
                  return (
                    <rect
                      key={d.dateStr}
                      x={barX}
                      y={notchY}
                      width={Math.max(1.2, barWidth)}
                      height={notchH}
                      rx={Math.min(1.5, barWidth / 2)}
                      fill={isHovered ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)'}
                      className="cursor-pointer transition-colors"
                    />
                  );
                })}

                {/* X-Axis Milestone Date Ticks */}
                {visibleDateIndices.map((idx) => {
                  const dateItem = velocityData[idx];
                  if (!dateItem) return null;
                  const xPos = padding.left + idx * slotWidth + slotWidth / 2;
                  const isToday = idx === N - 1;

                  return (
                    <text
                      key={idx}
                      x={xPos}
                      y={baselineY + 18}
                      textAnchor="middle"
                      className={`text-[9px] sm:text-[9.5px] font-mono ${
                        isToday ? 'fill-[#38BDF8] font-bold' : 'fill-[#94A3B8]'
                      }`}
                    >
                      {isToday ? 'Today' : dateItem.displayDate}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/[0.08] flex justify-end relative z-10">
          <button
            type="button"
            onClick={initiateClose}
            className="px-6 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono font-bold text-[#F8FAFC] transition-colors cursor-pointer border border-white/[0.08]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
