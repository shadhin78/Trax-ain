/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { usePace } from '../../features/pace/context/PaceContext';
import { 
  parseLocalDate, 
  calculateYMDDiff, 
  formatYMDString,
  differenceInCalendarDays,
} from '../../features/pace/utils/paceCalculations';
import { useUpcomingExamHeader } from '../../features/exam-routine/utils/useUpcomingExamHeader';
import { useOutcome } from '../../features/outcome/context/OutcomeContext';

/**
 * 2. Header Container
 * Moves the 5 existing header information blocks inside ONE transparent header container:
 * - Upcoming Exam + countdown
 * - Clock
 * - Success Score
 * - Day Elapsed / Time Elapsed
 * - Final Deadline
 *
 * The parent Header Container is:
 * - Fully transparent
 * - No background
 * - No blur
 * - No visible fill
 * - No redesign
 * - No visual effect that changes the existing header blocks
 * An invisible structural boundary for spacing and alignment.
 */
export const HeaderContainer: React.FC = () => {
  const upcomingExam = useUpcomingExamHeader();
  const { coreCoursesPassedPercent, overallPassedCount, totalCoreCoursesCount } = useOutcome();
  const { globalGoal, globalBaseline, hasGlobalGoal } = usePace();

  const startDateStr = (hasGlobalGoal && globalGoal?.startDate) || globalBaseline?.startDate;
  const deadlineStr = (hasGlobalGoal && globalGoal?.deadline) || globalBaseline?.endDate;

  const { timeElapsedDisplay, finalDeadlineDisplay } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Time Elapsed: how many fully elapsed calendar days from global pace startDate (exclusive day counting)
    let timeElapsedDisplay = '--';
    if (startDateStr) {
      const elapsedDays = Math.max(0, differenceInCalendarDays(today, startDateStr));
      timeElapsedDisplay = `${elapsedDays} ${elapsedDays === 1 ? 'Day' : 'Days'}`;
    }

    // 2. Final Deadline: how many calendar days remain until global pace deadline
    let finalDeadlineDisplay = '--';
    if (deadlineStr) {
      const diffDays = differenceInCalendarDays(deadlineStr, today);
      const remainingDays = Math.max(0, diffDays);
      finalDeadlineDisplay = `${remainingDays} ${remainingDays === 1 ? 'Day' : 'Days'}`;
    }

    return {
      timeElapsedDisplay,
      finalDeadlineDisplay,
    };
  }, [startDateStr, deadlineStr]);

  const [currentTime, setCurrentTime] = useState('');
  const [examCountdownSeconds, setExamCountdownSeconds] = useState(
    21 * 3600 + 32 * 60 + 25
  );

  // Live 12-hour clock (AM/PM)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Live countdown timer
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setExamCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, []);

  const formatExamCountdown = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="header-container"
      data-container="header"
      className="flex-1 min-w-0 bg-transparent flex items-center justify-start lg:justify-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1"
    >
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        {/* Block 1: Upcoming Exam */}
        <div className="flex items-center justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-5 sm:px-6 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/[0.18] hover:bg-[#131722]/55 w-[520px] max-w-full h-[66px] shrink-0">
          {upcomingExam.hasUpcomingExam ? (
            <div className="flex items-center justify-center w-full min-w-0 font-mono tracking-tight select-none">
              {(upcomingExam.subjectName || '').length > 20 ? (
                <div className="min-w-0 max-w-[265px] flex items-center justify-center text-center px-1">
                  <span 
                    className="font-black text-[#F8FAFC] text-xs sm:text-sm lg:text-[14px] xl:text-[15px] leading-tight line-clamp-2 break-words"
                    title={upcomingExam.subjectName}
                  >
                    {upcomingExam.subjectName}
                  </span>
                </div>
              ) : (
                <span 
                  className="font-black text-[#F8FAFC] text-base sm:text-lg lg:text-xl xl:text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] truncate max-w-[265px]"
                  title={upcomingExam.subjectName}
                >
                  {upcomingExam.subjectName}
                </span>
              )}
              <span className="font-bold text-[#64748B] text-base sm:text-lg mx-2 sm:mx-2.5 xl:mx-3 shrink-0 select-none">
                -
              </span>
              {upcomingExam.status === 'LIVE_IN_PROGRESS' ? (
                <span className="inline-flex items-center gap-1.5 font-black text-[#F43F5E] text-base shrink-0">
                  <span className="h-2 w-2 rounded-full bg-[#F43F5E]" />
                  LIVE NOW
                </span>
              ) : upcomingExam.units && upcomingExam.units.length > 0 ? (
                <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                  {upcomingExam.units.map((unit, idx) => (
                    <span key={idx} className="inline-flex items-baseline font-mono">
                      <span className="font-black text-[#F43F5E] text-base sm:text-lg">
                        {unit.value}
                      </span>
                      <span className="font-bold text-[#F8FAFC]/90 text-xs lowercase ml-0.5 select-none">
                        {unit.unit}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="font-black text-[#F43F5E] text-base sm:text-lg shrink-0 tabular-nums">
                  {upcomingExam.countdownDisplay}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full font-mono">
              <span className="font-mono text-sm font-semibold text-[#94A3B8] truncate">
                {upcomingExam.subjectName}
              </span>
            </div>
          )}
        </div>

        {/* Block 2: Clock */}
        <div className="flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-4 py-2.5 sm:px-5 sm:py-3 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.18] hover:bg-[#131722]/55 min-w-[110px] shrink-0">
          <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-[#94A3B8]">
            Clock
          </span>
          <span className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#F8FAFC] whitespace-nowrap">
            {currentTime || '12:00:00 AM'}
          </span>
        </div>

        {/* Block 3: Success Score */}
        <div 
          className="flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-4 py-2.5 sm:px-5 sm:py-3 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.18] hover:bg-[#131722]/55 min-w-[105px] shrink-0"
          title={`Milestone Celebration Core Targets: ${overallPassedCount} of ${totalCoreCoursesCount} Passed (${coreCoursesPassedPercent}%)`}
        >
          <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-[#94A3B8]">
            Success Score
          </span>
          <span className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#10B981]">
            {coreCoursesPassedPercent}%
          </span>
        </div>

        {/* Block 4: Day Elapsed / Time Elapsed */}
        <div className="flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-4 py-2.5 sm:px-5 sm:py-3 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.18] hover:bg-[#131722]/55 min-w-[100px] shrink-0">
          <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-[#94A3B8]">
            Time Elapsed
          </span>
          <span className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#F8FAFC]">
            {timeElapsedDisplay}
          </span>
        </div>

        {/* Block 5: Final Deadline */}
        <div className="flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-4 py-2.5 sm:px-5 sm:py-3 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.18] hover:bg-[#131722]/55 min-w-[105px] shrink-0">
          <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-[#94A3B8]">
            Final Deadline
          </span>
          <span className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#F43F5E]">
            {finalDeadlineDisplay}
          </span>
        </div>
      </div>
    </div>
  );
};
