/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { BarChart2, ExternalLink } from 'lucide-react';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { useOutcome } from '../../../outcome/context/OutcomeContext';
import { AppRoute } from '../../../../types/navigation';

interface GlobalCompletionShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

export const GlobalCompletionShortcutCard: React.FC<GlobalCompletionShortcutCardProps> = React.memo(({ onNavigate }) => {
  const { chapters, subjects, programs } = useAcademicHierarchy();
  const { freezeConfig } = useOutcome();

  const {
    totalChapters,
    completedChapters,
    percentage,
    skippedChapters,
    notCompletedChapters,
    totalAllChapters,
  } = useMemo(() => {
    // 1. All chapters in syllabus (skipped + active/other chapters)
    const allTotal = chapters.length;

    // 2. Skipped chapters
    const skipped = chapters.filter(
      (c) => Boolean(c.isSkipped || c.status === 'skipped')
    ).length;

    // 3. Active non-skipped chapters
    const activeChapters = chapters.filter(
      (c) => !c.isSkipped && c.status !== 'skipped'
    );
    const activeTotal = activeChapters.length;

    // 4. Completed chapters including freeze-passed programs
    const completed = activeChapters.filter((c) => {
      if (c.completed || c.status === 'completed') return true;
      const isProgFrozen = Boolean(
        freezeConfig?.frozenProgramIds?.includes(c.programId) ||
        freezeConfig?.manualFrozenProgramIds?.includes(c.programId)
      );
      if (isProgFrozen) return true;
      const isSubjFrozen = Boolean(
        freezeConfig?.frozenSubjectIds?.includes(c.subjectId) ||
        freezeConfig?.manualFrozenSubjectIds?.includes(c.subjectId)
      );
      return isSubjFrozen;
    }).length;

    // 5. Not completed active chapters
    const notCompleted = Math.max(0, activeTotal - completed);

    // 6. Percentage
    const pct = activeTotal > 0 ? Math.round((completed / activeTotal) * 100) : 0;

    return {
      totalChapters: activeTotal,
      completedChapters: completed,
      percentage: pct,
      skippedChapters: skipped,
      notCompletedChapters: notCompleted,
      totalAllChapters: allTotal,
    };
  }, [chapters, subjects, programs, freezeConfig]);

  const handleNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate('/subjects/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/subjects/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // SVG Radial Gauge Calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius; // ~138.23
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const dashLength = (clampedPercentage / 100) * circumference;

  return (
    <div
      className="w-full h-[270px] rounded-[24px] sm:rounded-[26px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-3.5 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] md:hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] group select-none overflow-hidden"
    >
      {/* ── TOP HEADER ROW (Only navigation icon navigates) ── */}
      <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-white/[0.06] mb-1.5 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]/15 text-[#38BDF8] border border-[#0EA5E9]/30 shadow-[0_0_12px_rgba(14,165,233,0.2)] transition-transform duration-300 md:group-hover:scale-105">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate">
              GLOBAL COMPLETION
            </h3>
            <p className="text-[8.5px] sm:text-[9px] font-bold text-[#64748B] tracking-widest uppercase truncate">
              SYLLABUS OVERVIEW
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded-full border border-[#0EA5E9]/30 bg-[#0EA5E9]/10 text-[#38BDF8] text-[8.5px] sm:text-[9px] font-bold tracking-tight">
            {completedChapters} COMPLETED
          </span>
          <button
            type="button"
            onClick={handleNavigation}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            title="Open Subjects"
            aria-label="Open Subjects"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── METRIC STATS & RADIAL GAUGE (Exact sizing preserved from IMG 2) ── */}
      <div className="flex-1 min-h-0 flex flex-col justify-between py-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-3xl sm:text-4xl font-black text-[#38BDF8] tracking-tight drop-shadow-sm">
              {percentage}%
            </div>
            <div className="text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mt-0.5">
              {completedChapters} / {totalChapters} CHAPTERS
            </div>
          </div>

          {/* Radial Mini Gauge Ring */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 54 54">
              <circle
                cx="27"
                cy="27"
                r={radius}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="4.5"
                fill="transparent"
              />
              <circle
                cx="27"
                cy="27"
                r={radius}
                stroke="#38BDF8"
                strokeWidth="4.5"
                strokeDasharray={`${dashLength} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.7))',
                  transition: 'stroke-dasharray 0.5s ease-out',
                }}
              />
            </svg>
          </div>
        </div>

        {/* Horizontal Gradient Progress Bar */}
        <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden my-1">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0284C7] via-[#0EA5E9] to-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.5)] transition-all duration-500 ease-out"
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>

        {/* ── COMPACT 3-STAT GRID (TOTAL [SKIP+OTHER], NOT COMPLETED, SKIPPED) ── */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5">
          {/* 1. Total [ Skip + Other Chapter ] */}
          <div
            className="flex flex-col justify-between p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
            title={`Total chapters in syllabus (skipped + active): ${totalAllChapters}`}
          >
            <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] shrink-0 shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
              <span className="text-[7.5px] sm:text-[8px] font-bold text-[#64748B] uppercase tracking-wider truncate">
                TOTAL [ALL]
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight">
                {totalAllChapters}
              </span>
              <span className="text-[7px] sm:text-[7.5px] font-bold text-[#38BDF8] uppercase tracking-tight truncate">
                SKIP+OTHER
              </span>
            </div>
          </div>

          {/* 2. Not Completed */}
          <div
            className="flex flex-col justify-between p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
            title={`Active chapters remaining to complete: ${notCompletedChapters}`}
          >
            <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] shrink-0 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
              <span className="text-[7.5px] sm:text-[8px] font-bold text-[#64748B] uppercase tracking-wider truncate">
                NOT COMPLETED
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight">
                {notCompletedChapters}
              </span>
              <span className="text-[7px] sm:text-[7.5px] font-bold text-[#F59E0B] uppercase tracking-tight truncate">
                PENDING
              </span>
            </div>
          </div>

          {/* 3. Skipped */}
          <div
            className="flex flex-col justify-between p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
            title={`Chapters marked as skipped: ${skippedChapters}`}
          >
            <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#94A3B8] shrink-0" />
              <span className="text-[7.5px] sm:text-[8px] font-bold text-[#64748B] uppercase tracking-wider truncate">
                SKIPPED
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight">
                {skippedChapters}
              </span>
              <span className="text-[7px] sm:text-[7.5px] font-bold text-[#94A3B8] uppercase tracking-tight truncate">
                SKIP
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

GlobalCompletionShortcutCard.displayName = 'GlobalCompletionShortcutCard';
