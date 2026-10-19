/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrendingUp, Clock, Target } from 'lucide-react';
import { usePace } from '../context/PaceContext';
import { formatDisplayDate, formatPaceValue } from '../utils/paceCalculations';

interface TopKpiMetricsRowProps {
  onOpenTrendModal: () => void;
}

export const TopKpiMetricsRow: React.FC<TopKpiMetricsRowProps> = React.memo(({ onOpenTrendModal }) => {
  const { globalGoal, globalStats, hasGlobalGoal } = usePace();

  const formattedDeadline = hasGlobalGoal && globalGoal?.deadline
    ? formatDisplayDate(globalGoal.deadline)
    : '--';

  const reqPaceDisplay = hasGlobalGoal ? formatPaceValue(globalStats.reqPace) : '--';
  const curPaceDisplay = formatPaceValue(globalStats.curPace);
  const estFinishDisplay = hasGlobalGoal ? globalStats.projectedFinishStr : '--';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 w-full font-mono">
      {/* ── CARD 1: TARGET / TO HIT TARGET ── */}
      <div 
        id="kpi-card-target"
        className="rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden group hover:border-[#F97316]/40 transition-all duration-300 font-mono"
      >
        <div 
          className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#F97316]/10 blur-2xl pointer-events-none" 
          aria-hidden="true" 
        />

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#F87171]">
              TARGET: {formattedDeadline}
            </span>
            <Target className="h-4 w-4 text-[#F97316]/60 group-hover:text-[#F97316] transition-colors" />
          </div>

          <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] mt-1 font-mono">
            To Hit Target
          </h3>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight text-[#F97316] drop-shadow-[0_0_24px_rgba(249,115,22,0.35)]">
              {reqPaceDisplay}
            </span>
            <span className="text-xl sm:text-2xl font-mono font-black text-[#F97316]">
              Ch/Day
            </span>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs font-mono">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            TO HIT DEADLINE
          </span>
          <span className="font-mono text-xs font-bold text-[#38BDF8] drop-shadow-[0_0_12px_rgba(56,189,248,0.3)]">
            {hasGlobalGoal ? globalStats.countdownText : '--'}
          </span>
        </div>
      </div>

      {/* ── CARD 2: CURRENT PERFORMANCE / ACTUAL PACE ── */}
      <div 
        id="kpi-card-actual"
        className="rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden group hover:border-[#10B981]/40 transition-all duration-300 font-mono"
      >
        <div 
          className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#10B981]/10 blur-2xl pointer-events-none" 
          aria-hidden="true" 
        />

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#94A3B8]">
              CURRENT PERFORMANCE
            </span>
            <Clock className="h-4 w-4 text-[#10B981]/60 group-hover:text-[#10B981] transition-colors" />
          </div>

          <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] mt-1 font-mono">
            My Actual Pace
          </h3>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight text-[#F8FAFC]">
              {curPaceDisplay}
            </span>
            <span className="text-xl sm:text-2xl font-mono font-black text-[#F8FAFC]">
              Ch/Day
            </span>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs font-mono">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            MY CURRENT SPEED
          </span>
          <span className="font-mono text-xs font-bold text-[#10B981] drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            {hasGlobalGoal ? globalStats.timeElapsedText : '--'}
          </span>
        </div>
      </div>

      {/* ── CARD 3: TREND FORECAST / EST. FINISH ── */}
      <div 
        id="kpi-card-forecast"
        className="rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden group hover:border-[#6366F1]/40 transition-all duration-300 font-mono"
      >
        <div 
          className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#6366F1]/10 blur-2xl pointer-events-none" 
          aria-hidden="true" 
        />

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#818CF8]">
              TREND FORECAST
            </span>
            <button
              type="button"
              id="open-top-trend-forecast-btn"
              onClick={onOpenTrendModal}
              disabled={!hasGlobalGoal}
              className={`p-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-[#818CF8] transition-all ${
                hasGlobalGoal 
                  ? 'hover:bg-[#6366F1]/20 hover:border-[#6366F1]/50 hover:text-white cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.2)]' 
                  : 'opacity-40 cursor-not-allowed'
              }`}
              title={hasGlobalGoal ? "Open Burn-Up Trajectory Forecast Chart" : "No Global Pace configured"}
            >
              <TrendingUp className="h-4 w-4" />
            </button>
          </div>

          <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] mt-1 font-mono">
            Est. Finish
          </h3>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-[#818CF8] drop-shadow-[0_0_24px_rgba(129,140,248,0.35)] truncate">
              {estFinishDisplay}
            </span>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs font-mono">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            BASED ON MY CURRENT SPEED
          </span>
          <span className="font-mono text-xs font-bold text-[#F59E0B] drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            {hasGlobalGoal && globalStats.daysNeeded > 0
              ? `${globalStats.daysNeeded} Days Needed`
              : hasGlobalGoal ? '0 Days Needed' : '--'}
          </span>
        </div>
      </div>
    </div>
  );
});

TopKpiMetricsRow.displayName = 'TopKpiMetricsRow';
