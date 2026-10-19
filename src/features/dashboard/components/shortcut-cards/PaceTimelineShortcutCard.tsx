/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Zap, ExternalLink } from 'lucide-react';
import { usePace } from '../../../pace/context/PaceContext';
import { formatDisplayDate, formatPaceValue } from '../../../pace/utils/paceCalculations';
import { AppRoute } from '../../../../types/navigation';

interface PaceTimelineShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

/**
 * Format elapsed calendar time into "X MONTHS, Y DAYS PASSED" or "X DAYS PASSED"
 */
function formatElapsedString(startDateStr?: string, daysElapsed?: number): string {
  if (!startDateStr || daysElapsed === undefined || daysElapsed <= 0) {
    return '0 DAYS PASSED';
  }
  try {
    const start = new Date(startDateStr);
    const now = new Date();
    if (isNaN(start.getTime())) {
      return `${daysElapsed} ${daysElapsed === 1 ? 'DAY' : 'DAYS'} PASSED`;
    }
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    let days = now.getDate() - start.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }
    if (months > 0) {
      return `${months} ${months === 1 ? 'MONTH' : 'MONTHS'}, ${days} ${days === 1 ? 'DAY' : 'DAYS'} PASSED`;
    }
    return `${daysElapsed} ${daysElapsed === 1 ? 'DAY' : 'DAYS'} PASSED`;
  } catch {
    return `${daysElapsed} ${daysElapsed === 1 ? 'DAY' : 'DAYS'} PASSED`;
  }
}

/**
 * PACE & TIMELINE Shortcut Card
 * Displays live pacing metrics: Req. Pace, Actual Pace, Est. Finish, and Global Baseline.
 * Navigates directly to /pace-management/.
 */
export const PaceTimelineShortcutCard: React.FC<PaceTimelineShortcutCardProps> = React.memo(({ onNavigate }) => {
  const {
    goals,
    activeGoalId,
    globalGoal,
    globalBaseline,
    globalBaselineStats,
    globalStats,
    activeStats,
    calculateStatsForGoal,
  } = usePace();

  // Find linked timeline goal
  const linkedGoal = useMemo(() => {
    if (!activeGoalId) return null;
    return goals.find((g) => g.id === activeGoalId) || null;
  }, [activeGoalId, goals]);

  // Compute stats reactively
  const stats = useMemo(() => {
    if (linkedGoal) {
      return calculateStatsForGoal(linkedGoal);
    }
    return globalStats || globalBaselineStats || activeStats || null;
  }, [linkedGoal, calculateStatsForGoal, globalStats, globalBaselineStats, activeStats]);

  // Metric 1: Req. Pace
  const reqPaceNumber = stats && stats.reqPace !== undefined && stats.reqPace > 0
    ? formatPaceValue(stats.reqPace)
    : stats && stats.status === 'finished'
    ? '0.00'
    : '--';

  const daysLeftValue = stats && stats.daysRemaining !== undefined && stats.daysRemaining >= 0
    ? `${stats.daysRemaining} ${stats.daysRemaining === 1 ? 'DAY' : 'DAYS'} LEFT`
    : '-- DAYS LEFT';

  // Metric 2: Actual Pace
  const curPaceNumber = stats && stats.curPace !== undefined
    ? formatPaceValue(stats.curPace)
    : '--';

  const startDateStr = linkedGoal?.startDate || globalGoal?.startDate || globalBaseline?.startDate || '';
  const daysPassedValue = formatElapsedString(startDateStr, stats?.daysElapsed);

  // Metric 3: Est. Finish
  const estFinishValue = stats?.projectedFinishStr || '--';
  const daysNeededValue = stats && stats.daysNeeded !== undefined && stats.daysNeeded > 0
    ? `${stats.daysNeeded.toLocaleString()} ${stats.daysNeeded === 1 ? 'DAY' : 'DAYS'} NEEDED`
    : stats?.status === 'finished'
    ? 'TARGET COMPLETED'
    : '-- DAYS NEEDED';

  // Metric 4: Global Baseline
  const baselineStart = globalGoal?.startDate || globalBaseline?.startDate;
  const baselineEnd = globalGoal?.deadline || globalBaseline?.endDate;
  const hasBaseline = Boolean(baselineStart && baselineEnd);

  const baselineTargetDate = baselineEnd ? formatDisplayDate(baselineEnd) : 'NOT SET';
  const baselineRangeSubtitle = hasBaseline
    ? `RANGE: ${formatDisplayDate(baselineStart).toUpperCase()} — ${formatDisplayDate(baselineEnd).toUpperCase()}`
    : 'TARGET: NOT SET';

  // Pacing status for top header badge
  const isFinished = stats?.status === 'finished';
  const isBehind = stats?.isBehind ?? (stats?.reqPace !== undefined && stats?.curPace !== undefined && stats.curPace < stats.reqPace);
  const statusLabel = isFinished ? 'COMPLETED' : isBehind ? 'BEHIND PACE' : 'ON TRACK';
  const statusStyle = isFinished
    ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
    : isBehind
    ? 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
    : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30';

  const handleNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate('/pace-management/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/pace-management/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div
      className="w-full h-[270px] rounded-[24px] sm:rounded-[26px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-3.5 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] md:hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] group select-none overflow-hidden"
    >
      {/* ── TOP HEADER ROW ── */}
      <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-white/[0.06] mb-2 sm:mb-2.5 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 shadow-[0_0_12px_rgba(99,102,241,0.2)] transition-transform duration-300 md:group-hover:scale-105">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate">
              PACE &amp; TIMELINE
            </h3>
            <p className="text-[8.5px] sm:text-[9px] font-bold text-[#64748B] tracking-widest uppercase">
              OVERVIEW &amp; BASELINE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-lg border text-[8.5px] sm:text-[9px] font-bold tracking-wider uppercase ${statusStyle}`}>
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={handleNavigation}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
            title="Open Pace Management"
            aria-label="Open Pace Management"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── 2x2 METRIC GRID ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 flex-1 min-h-0">
        {/* Block 1: REQ. PACE */}
        <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 hover:border-[#38BDF8]/20 hover:bg-white/[0.035]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] shrink-0 shadow-[0_0_6px_rgba(56,189,248,0.5)]" />
            <span className="text-[9px] sm:text-[9.5px] font-bold text-[#94A3B8] tracking-wider uppercase truncate">
              REQ. PACE
            </span>
          </div>
          <div className="my-auto py-0.5">
            <span className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight">
              {reqPaceNumber}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#64748B] ml-1">
              Ch/Day
            </span>
          </div>
          <span className="text-[8.5px] sm:text-[9px] font-bold text-[#38BDF8] tracking-wide uppercase truncate">
            {daysLeftValue}
          </span>
        </div>

        {/* Block 2: ACTUAL PACE */}
        <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 hover:border-[#10B981]/20 hover:bg-white/[0.035]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span className="text-[9px] sm:text-[9.5px] font-bold text-[#94A3B8] tracking-wider uppercase truncate">
              ACTUAL PACE
            </span>
          </div>
          <div className="my-auto py-0.5">
            <span className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight">
              {curPaceNumber}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#64748B] ml-1">
              Ch/Day
            </span>
          </div>
          <span className="text-[8.5px] sm:text-[9px] font-bold text-[#10B981] tracking-wide uppercase truncate">
            {daysPassedValue}
          </span>
        </div>

        {/* Block 3: EST. FINISH */}
        <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 hover:border-[#818CF8]/20 hover:bg-white/[0.035]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-[#818CF8] shrink-0 shadow-[0_0_6px_rgba(129,140,248,0.5)]" />
            <span className="text-[9px] sm:text-[9.5px] font-bold text-[#94A3B8] tracking-wider uppercase truncate">
              EST. FINISH
            </span>
          </div>
          <div className="my-auto py-0.5">
            <span className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight truncate block">
              {estFinishValue}
            </span>
          </div>
          <span className="text-[8.5px] sm:text-[9px] font-bold text-[#818CF8] tracking-wide uppercase truncate">
            {daysNeededValue}
          </span>
        </div>

        {/* Block 4: GLOBAL BASELINE */}
        <div className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 hover:border-[#F59E0B]/20 hover:bg-white/[0.035]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
            <span className="text-[9px] sm:text-[9.5px] font-bold text-[#94A3B8] tracking-wider uppercase truncate">
              GLOBAL BASELINE
            </span>
          </div>
          <div className="my-auto py-0.5">
            <span className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight truncate block">
              {baselineTargetDate}
            </span>
          </div>
          <span className="text-[8.5px] sm:text-[9px] font-bold text-[#94A3B8] tracking-wide uppercase truncate">
            {baselineRangeSubtitle}
          </span>
        </div>
      </div>
    </div>
  );
});

PaceTimelineShortcutCard.displayName = 'PaceTimelineShortcutCard';
