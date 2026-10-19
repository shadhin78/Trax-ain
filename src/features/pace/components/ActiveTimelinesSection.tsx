/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Flame, 
  Eye, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Radio, 
  Check, 
  Calendar, 
  AlertTriangle 
} from 'lucide-react';
import { usePace } from '../context/PaceContext';
import { PaceGoal, PaceStats } from '../types';
import { formatDisplayDate, formatPaceValue } from '../utils/paceCalculations';

interface ActiveTimelinesSectionProps {
  onOpenTrend: (goal: PaceGoal) => void;
  onOpenCandle: (goal: PaceGoal) => void;
  onOpenDetails: (goal: PaceGoal) => void;
  onOpenEdit: (goal: PaceGoal) => void;
  onOpenDelete: (goal: PaceGoal) => void;
}

export const ActiveTimelinesSection: React.FC<ActiveTimelinesSectionProps> = React.memo(({
  onOpenTrend,
  onOpenCandle,
  onOpenDetails,
  onOpenEdit,
  onOpenDelete,
}) => {
  const { goals, activeGoalId, setActiveGoalId, calculateStatsForGoal } = usePace();

  // Active Timelines on Pace Management view only displays global, program & custom bundle targets (never single subject card paces)
  const timelineGoals = useMemo(() => {
    return goals.filter((g) => !g.id.startsWith('goal_subject_') && !g.id.startsWith('subject_pace_'));
  }, [goals]);

  return (
    <div className="w-full space-y-4 font-mono">
      {/* ── SECTION HEADER ── */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-xs sm:text-sm font-black uppercase tracking-widest text-[#94A3B8]">
            ACTIVE TIMELINES
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
            {timelineGoals.length} {timelineGoals.length === 1 ? 'GOAL' : 'GOALS'}
          </span>
        </div>
        <p className="font-mono text-[10px] text-[#64748B] hidden sm:block">
          Manage and track individual timeline goals
        </p>
      </div>

      {/* ── GOALS GRID ── */}
      {timelineGoals.length === 0 ? (
        <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/[0.1] rounded-3xl bg-transparent backdrop-blur-sm text-center p-6">
          <span className="text-3xl mb-2">🎯</span>
          <p className="font-mono text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
            No active timeline goals configured.
          </p>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm">
            Use the Pace Management form above to bundle subjects and set specific timeline goals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {timelineGoals.map((goal) => {
            const stats = calculateStatsForGoal(goal);

            const formattedStart = formatDisplayDate(goal.startDate);
            const formattedDeadline = formatDisplayDate(goal.deadline);
            const reqPaceStr = formatPaceValue(stats.reqPace);
            const curPaceStr = formatPaceValue(stats.curPace);

            const scopeBadgeText =
              goal.type === 'global'
                ? 'GLOBAL GOAL'
                : goal.type === 'programs'
                ? 'PROGRAM GOAL'
                : 'BUNDLE GOAL';

            // Selected summary text
            let scopeSummary = '';
            if (goal.type === 'global') {
              const secCount = goal.secondaryPaces?.length || 0;
              const subCount = stats.subjectDetails.length;
              if (subCount === 0 && secCount === 0) {
                scopeSummary = '0 Subjects Included • Edit to Add';
              } else if (secCount > 0) {
                scopeSummary = `${subCount} Subjects • ${secCount} Secondary ${secCount === 1 ? 'Pace' : 'Paces'} Linked`;
              } else {
                scopeSummary = `${subCount} ${subCount === 1 ? 'Subject' : 'Subjects'} Included`;
              }
            } else if (goal.type === 'programs') {
              scopeSummary = `${goal.programs?.length || 0} Programs Included`;
            } else {
              const subCount = goal.subjects?.length || stats.subjectDetails.length;
              scopeSummary = `${subCount} Selected ${subCount === 1 ? 'Subject' : 'Subjects'}`;
            }

            return (
              <div
                key={goal.id}
                id={`pace-timeline-card-${goal.id}`}
                className="rounded-[28px] border border-white/[0.08] hover:border-white/[0.18] bg-[#0B0F19]/60 p-5 sm:p-6 flex flex-col justify-between backdrop-blur-xl transition-all duration-300 relative overflow-hidden group shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              >
                {/* ── CARD TOP ROW: SCOPE BADGE & 5 ACTION BUTTONS ── */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                  {/* Left: Scope Badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className={`
                        font-mono text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border
                        ${
                          goal.type === 'global'
                            ? 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30 shadow-[0_0_10px_rgba(56,189,248,0.15)]'
                            : 'bg-[#818CF8]/15 text-[#818CF8] border-[#818CF8]/30'
                        }
                      `}
                    >
                      {scopeBadgeText}
                    </span>
                  </div>

                  {/* Right: Quick Action Toolstrip (5 Glass Buttons) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* 1. Trend Line Chart */}
                    <button
                      type="button"
                      onClick={() => onOpenTrend(goal)}
                      className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-[#6366F1]/20 hover:border-[#6366F1]/50 hover:text-[#818CF8] text-[#94A3B8] transition-all cursor-pointer"
                      title="Trajectory Burn-Up Chart"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                    </button>

                    {/* 2. Candlestick / Velocity Breakdown */}
                    <button
                      type="button"
                      onClick={() => onOpenCandle(goal)}
                      className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-[#F59E0B]/20 hover:border-[#F59E0B]/50 hover:text-[#F59E0B] text-[#94A3B8] transition-all cursor-pointer"
                      title="Velocity Breakdown"
                    >
                      <Flame className="h-3.5 w-3.5" />
                    </button>

                    {/* 3. Goal Details / Eye */}
                    <button
                      type="button"
                      onClick={() => onOpenDetails(goal)}
                      className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-[#38BDF8]/20 hover:border-[#38BDF8]/50 hover:text-[#38BDF8] text-[#94A3B8] transition-all cursor-pointer"
                      title="Subject Workload Details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>

                    {/* 4. Edit Goal */}
                    <button
                      type="button"
                      onClick={() => onOpenEdit(goal)}
                      className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-[#10B981]/20 hover:border-[#10B981]/50 hover:text-[#10B981] text-[#94A3B8] transition-all cursor-pointer"
                      title="Edit Goal Configuration"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    {/* 5. Delete Goal */}
                    <button
                      type="button"
                      onClick={() => onOpenDelete(goal)}
                      className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-[#EF4444]/20 hover:border-[#EF4444]/50 hover:text-[#EF4444] text-[#94A3B8] transition-all cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── GOAL INFO SECTION (Global Pace has no title) ── */}
                <div className="mt-3.5 space-y-1">
                  {goal.type !== 'global' && goal.target ? (
                    <h4 className="text-base sm:text-lg font-black tracking-tight text-[#F8FAFC] truncate font-mono">
                      {goal.target}
                    </h4>
                  ) : null}
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#94A3B8]">
                    <span>Timeline:</span>
                    <span className="text-[#38BDF8] font-bold">{formattedStart}</span>
                    <span className="text-white/30">—</span>
                    <span className="text-[#F59E0B] font-bold">{formattedDeadline}</span>
                  </div>
                  <div className="font-mono text-[10px] text-[#64748B] truncate">
                    {scopeSummary}
                  </div>
                </div>

                {/* ── PROGRESS BAR ── */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#94A3B8]">
                      <strong className="text-[#F8FAFC] font-black">{stats.completed}</strong> / {stats.total} Ch
                    </span>
                    <span className="text-[#818CF8] font-black">
                      {stats.percentage}%
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden p-0.5">
                    <div
                      className={`
                        h-full rounded-full transition-all duration-500
                        ${
                          stats.isBehind
                            ? 'bg-gradient-to-r from-[#F97316] to-[#EF4444]'
                            : 'bg-gradient-to-r from-[#6366F1] to-[#10B981]'
                        }
                      `}
                      style={{ width: `${Math.min(100, Math.max(0, stats.percentage))}%` }}
                    />
                  </div>
                </div>

                {/* ── 2-BOX SPLIT METRICS (REQ PACE & CUR PACE) ── */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {/* Left Box: REQ PACE */}
                  <div
                    className={`
                      p-3 rounded-2xl border transition-all flex flex-col justify-between
                      ${
                        stats.status === 'overdue'
                          ? 'bg-[#EF4444]/10 border-[#EF4444]/30'
                          : stats.isBehind
                          ? 'bg-[#F97316]/10 border-[#F97316]/30'
                          : 'bg-[#10B981]/10 border-[#10B981]/30'
                      }
                    `}
                  >
                    <div>
                      <span className="block font-mono text-[9px] font-black uppercase tracking-wider text-[#94A3B8]">
                        REQ PACE
                      </span>
                      <div className="text-lg sm:text-xl font-black font-mono text-[#F8FAFC] mt-0.5">
                        {reqPaceStr} <span className="text-[10px] font-normal text-[#94A3B8]">ch/d</span>
                      </div>
                    </div>
                    <div
                      className={`
                        font-mono text-[9px] font-black uppercase tracking-wider mt-2 truncate
                        ${
                          stats.isBehind ? 'text-[#F97316]' : 'text-[#10B981]'
                        }
                      `}
                    >
                      {stats.countdownText}
                    </div>
                  </div>

                  {/* Right Box: CUR PACE */}
                  <div className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex flex-col justify-between">
                    <div>
                      <span className="block font-mono text-[9px] font-black uppercase tracking-wider text-[#94A3B8]">
                        CUR PACE
                      </span>
                      <div className="text-lg sm:text-xl font-black font-mono text-[#F8FAFC] mt-0.5">
                        {curPaceStr} <span className="text-[10px] font-normal text-[#94A3B8]">ch/d</span>
                      </div>
                    </div>
                    <div className="font-mono text-[9px] font-black uppercase tracking-wider text-[#10B981] mt-2 truncate">
                      {stats.timeElapsedText}
                    </div>
                  </div>
                </div>

                {/* ── EST. FINISH FULL-WIDTH FOOTER BOX ── */}
                <div className="mt-3 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between gap-2">
                  <div>
                    <span className="block font-mono text-[9px] font-black uppercase tracking-wider text-[#94A3B8]">
                      EST. FINISH
                    </span>
                    <span className="block font-mono text-[11px] font-bold text-[#F59E0B] mt-0.5">
                      {stats.status === 'finished'
                        ? 'Goal Complete'
                        : stats.daysNeeded > 0
                        ? `${stats.daysNeeded} Days Needed`
                        : '-- Days Needed'}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-black font-mono text-[#F8FAFC] text-right truncate">
                    {stats.projectedFinishStr}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

ActiveTimelinesSection.displayName = 'ActiveTimelinesSection';
