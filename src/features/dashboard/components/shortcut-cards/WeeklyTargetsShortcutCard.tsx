/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CalendarDays, ExternalLink, Plus, Check } from 'lucide-react';
import { useDailyActions } from '../../../daily-actions/context/DailyActionsContext';
import { useAcademicHierarchy } from '../../../../context/AcademicHierarchyContext';
import { formatChapterTargetDisplay } from '../../../daily-actions/utils/targetDisplayUtils';
import { AppRoute } from '../../../../types/navigation';

interface WeeklyTargetsShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

export const WeeklyTargetsShortcutCard: React.FC<WeeklyTargetsShortcutCardProps> = React.memo(({ onNavigate }) => {
  const {
    currentWeekTargets,
    formattedWeekRange,
    weeklyPaceStats,
    toggleWeeklyTargetComplete,
  } = useDailyActions();

  const { chapters, subjects, programs } = useAcademicHierarchy();

  const pendingCount = currentWeekTargets.filter((t) => !t.isCompleted).length;
  const totalTargets = weeklyPaceStats?.totalTargets ?? currentWeekTargets.length;
  const completedTargets = weeklyPaceStats?.completedTargets ?? currentWeekTargets.filter((t) => t.isCompleted).length;
  const completionPercentage = totalTargets > 0 ? Math.round((completedTargets / totalTargets) * 100) : 0;

  // Clean formatted week range string: remove surrounding brackets and prefix
  const cleanRange = formattedWeekRange.replace(/\[|\]/g, '').replace(/^WEEK\s*\d+\s*:\s*/i, '').trim();
  const subtitleText = `WEEK: ${cleanRange} (${pendingCount} PENDING)`;

  const handleCardClick = () => {
    if (onNavigate) {
      onNavigate('/daily-actions/#weekly-targets-section');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/daily-actions/#weekly-targets-section');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div
      className="w-full h-[270px] rounded-[24px] sm:rounded-[26px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-3 sm:p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] md:hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] group select-none overflow-hidden"
    >
      {/* ── TOP HEADER ROW (Clickable to navigate to Weekly Targets section) ── */}
      <div
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className="flex items-center justify-between pb-1.5 shrink-0 cursor-pointer group/header transition-colors"
        title="Open Weekly Targets in Daily Actions"
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-7 w-7 sm:h-7.5 sm:w-7.5 shrink-0 items-center justify-center rounded-xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-transform duration-300 group-hover/header:scale-105">
            <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate group-hover/header:text-[#10B981] transition-colors">
              WEEKLY TARGETS
            </h3>
            <p className="text-[8.5px] sm:text-[9px] font-bold text-[#64748B] tracking-widest uppercase truncate max-w-[200px] sm:max-w-xs">
              {subtitleText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs sm:text-sm font-black text-[#10B981] tracking-tight">
            {completionPercentage}%
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
            title="Open Weekly Targets in Daily Actions"
            aria-label="Open Weekly Targets in Daily Actions"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── THIN PROGRESS BAR BELOW HEADER ── */}
      <div
        onClick={handleCardClick}
        className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden mb-2 shrink-0 cursor-pointer"
        role="progressbar"
        aria-valuenow={completionPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        title={`Weekly Targets: ${completionPercentage}% completed (${completedTargets}/${totalTargets})`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
        />
      </div>

      {/* ── TARGETS LIST CONTAINER (MAX 3 ROWS, 2 GOALS PER ROW, SCROLLABLE BEYOND LIMIT) ── */}
      <div className="flex-1 min-h-0 flex flex-col justify-start overflow-hidden">
        {currentWeekTargets.length === 0 ? (
          <div className="w-full h-full rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] flex flex-col items-center justify-center text-center p-3">
            <p className="text-[10px] sm:text-[11px] font-bold text-white/40 uppercase tracking-wider">
              NO WEEKLY TARGETS SET FOR THIS WEEK
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/30 text-[10px] font-bold text-[#10B981] hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Set First Weekly Target</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex-1 min-h-0 overflow-y-auto pr-0.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 content-start pb-0.5">
              {currentWeekTargets.map((target) => {
                const displayInfo = formatChapterTargetDisplay(target, chapters, subjects);
                const matchedChapter = target.chapterId ? chapters.find((c) => c.id === target.chapterId) : null;
                const subjectObj = matchedChapter ? subjects.find((s) => s.id === matchedChapter.subjectId) : null;
                const progObj = subjectObj ? programs.find((p) => p.id === subjectObj.programId) : null;
                const programName = (progObj?.name || target.track || '').toUpperCase();

                const chLabel = displayInfo.chapterNumber
                  ? (String(displayInfo.chapterNumber).trim().toLowerCase().startsWith('ch')
                      ? displayInfo.chapterNumber
                      : `Ch. ${displayInfo.chapterNumber}`)
                  : target.title;

                const itemTitle = displayInfo.isChapterTarget && displayInfo.subjectName
                  ? `${chLabel}: ${displayInfo.subjectName}`
                  : (displayInfo.displayText || target.title);

                return (
                  <div
                    key={target.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWeeklyTargetComplete(target.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWeeklyTargetComplete(target.id);
                      }
                    }}
                    className={`
                      px-2 sm:px-2.5 py-1.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-2 h-[54px] sm:h-[56px] min-h-[54px] sm:min-h-[56px] cursor-pointer group/goal
                      ${target.isCompleted
                        ? 'bg-[#10B981]/[0.06] border-[#10B981]/25 hover:border-[#10B981]/40'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    {/* Left: Chapter Number, Subject Name & Program Name */}
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div 
                        className={`text-[10px] sm:text-[11px] font-black truncate leading-tight ${target.isCompleted ? 'line-through text-[#94A3B8]' : 'text-[#F8FAFC]'}`}
                        title={itemTitle}
                      >
                        {itemTitle}
                      </div>
                      {programName && (
                        <div className="text-[7.5px] sm:text-[8px] font-bold text-[#64748B] uppercase tracking-wider truncate leading-none mt-1">
                          {programName}
                        </div>
                      )}
                    </div>

                    {/* Right: Done / Undone check button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleWeeklyTargetComplete(target.id);
                      }}
                      className={`
                        h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 relative z-10
                        ${target.isCompleted
                          ? 'bg-[#10B981] border-[#10B981] text-black shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                          : 'border-white/30 hover:border-[#10B981] hover:scale-105 bg-white/[0.04]'
                        }
                      `}
                      title={target.isCompleted ? 'Mark undone' : 'Mark done'}
                      aria-label={target.isCompleted ? 'Mark undone' : 'Mark done'}
                    >
                      {target.isCompleted && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[3]" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

WeeklyTargetsShortcutCard.displayName = 'WeeklyTargetsShortcutCard';
