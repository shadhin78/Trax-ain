/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Calendar, ExternalLink, Clock } from 'lucide-react';
import { useExamRoutine } from '../../../exam-routine/context/ExamRoutineContext';
import { 
  isEligibleUpcomingExam, 
  getExamTimestamp, 
  THIRTY_MINUTES_MS 
} from '../../../exam-routine/utils/examTimeUtils';
import { AppRoute } from '../../../../types/navigation';

interface UpcomingExamsShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

/**
 * Live Countdown Formatter:
 * - Days, Hours, Minutes, Seconds (e.g. "25D 18H 15M 22S")
 * - Handles LIVE NOW (within 30m window) and ENDED
 */
function getCountdownBadge(examDate: string, examTime?: string, nowMs: number = Date.now()): string {
  const targetTs = getExamTimestamp(examDate, examTime);
  if (!targetTs) return 'NO DATE';

  const diffMs = targetTs - nowMs;
  if (diffMs <= 0) {
    if (nowMs - targetTs <= THIRTY_MINUTES_MS) {
      return 'LIVE NOW';
    }
    return 'ENDED';
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) {
    return `${days}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`;
  }
  if (hours > 0) {
    return `${hours}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`;
  }
  return `${minutes}M ${String(seconds).padStart(2, '0')}S`;
}

export const UpcomingExamsShortcutCard: React.FC<UpcomingExamsShortcutCardProps> = React.memo(({ onNavigate }) => {
  const { allExamSubjects } = useExamRoutine();

  // Client-side ticking clock for live countdowns (second-by-second precision, zero Firestore writes)
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNavigate = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onNavigate) {
      onNavigate('/exam-routine/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/exam-routine/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onNavigate]);

  // Compute eligible upcoming exams strictly ordered by scheduled timestamp (soonest first)
  const upcomingExams = useMemo(() => {
    return (allExamSubjects || [])
      .filter((item) => isEligibleUpcomingExam(item.subject, now))
      .map((item) => ({
        ...item,
        timestamp: getExamTimestamp(item.subject.examDate, item.subject.examTime),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [allExamSubjects, now]);

  const upcomingCount = upcomingExams.length;

  return (
    <div className="w-full h-[270px] rounded-[24px] sm:rounded-[26px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-3 sm:p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] select-none overflow-hidden relative group">
      {/* ── AMBIENT TINT GLOW (LEGACY THEME ACCENT) ── */}
      <div
        className="absolute -top-12 -right-12 w-44 h-44 rounded-full pointer-events-none opacity-20 blur-3xl transition-all duration-500 bg-[#F43F5E]"
      />

      {/* ── TOP HEADER ROW: TITLE + LIVE COUNT + NAVIGATION ICON ONLY ── */}
      <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-white/[0.06] mb-1.5 shrink-0 relative z-10">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-7 w-7 sm:h-7.5 sm:w-7.5 shrink-0 items-center justify-center rounded-xl bg-[#F43F5E]/15 text-[#FB7185] border border-[#F43F5E]/30 shadow-[0_0_12px_rgba(244,63,94,0.2)] transition-transform duration-300 md:group-hover:scale-105">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate">
              UPCOMING EXAMS
            </h3>
            <p className="text-[8px] sm:text-[8.5px] font-bold text-[#64748B] tracking-widest uppercase truncate">
              [ SUBJECT · SESSION · COUNTDOWN ]
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full border text-[8px] sm:text-[8.5px] font-bold tracking-tight flex items-center gap-1.5 ${
              upcomingCount > 0
                ? 'bg-[#F43F5E]/15 text-[#FB7185] border-[#F43F5E]/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                : 'bg-white/[0.04] text-[#94A3B8] border-white/10'
            }`}
          >
            {upcomingCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#FB7185] animate-pulse" />}
            {upcomingCount} UPCOMING
          </span>

          <button
            type="button"
            onClick={handleNavigate}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F43F5E]"
            title="Open Exam Routine"
            aria-label="Open Exam Routine"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── CARD BODY: LIST OF UPCOMING EXAMS (EXAM SUBJECT NAME & SESSION NAME) ── */}
      <div className="flex-1 min-h-0 flex flex-col justify-start space-y-1.5 sm:space-y-2 overflow-y-auto pr-0.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full relative z-10 py-0.5">
        {upcomingExams.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-3 my-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02] text-[#64748B] mb-2">
              <Clock className="h-5 w-5 opacity-60" />
            </div>
            <p className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">NO UPCOMING EXAMS</p>
            <p className="text-[9px] text-[#64748B] mt-0.5 max-w-[200px]">All scheduled exams completed or none set.</p>
            <button
              type="button"
              onClick={handleNavigate}
              className="mt-2 text-[9px] font-bold text-[#FB7185] hover:underline uppercase transition-colors"
            >
              Configure in Exam Routine →
            </button>
          </div>
        ) : (
          upcomingExams.map(({ subject, session }, idx) => {
            const countdownStr = getCountdownBadge(subject.examDate, subject.examTime, now);
            const isLive = countdownStr === 'LIVE NOW';
            const isFirst = idx === 0;

            const sessionName = session?.title || subject.programName || 'SESSION';

            return (
              <div
                key={subject.id}
                className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl border transition-all duration-200 backdrop-blur-md flex items-center justify-between gap-2.5 ${
                  isLive
                    ? 'bg-[#10B981]/10 border-[#10B981]/40 shadow-[0_0_16px_rgba(16,185,129,0.15)]'
                    : isFirst
                    ? 'bg-[#F43F5E]/[0.06] border-[#F43F5E]/30 shadow-[0_4px_16px_rgba(244,63,94,0.1)]'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
                }`}
              >
                {/* Left Side: Status Dot + Exam Subject Name + Session Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      isLive
                        ? 'bg-[#10B981] shadow-[0_0_8px_#10B981] animate-ping'
                        : 'bg-[#FB7185] shadow-[0_0_8px_rgba(251,113,133,0.7)]'
                    }`}
                  />
                  <div className="min-w-0">
                    {/* Exam Subject Name */}
                    <h4 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-tight truncate drop-shadow-sm">
                      {subject.subjectName}
                    </h4>
                    {/* Session Name */}
                    <p className="text-[8.5px] sm:text-[9px] font-bold text-[#FB7185]/90 tracking-wide uppercase truncate mt-0.5">
                      {sessionName}
                    </p>
                  </div>
                </div>

                {/* Right Side: Live Dynamic Countdown Badge */}
                <div
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-[9.5px] sm:text-[10.5px] font-black font-mono tracking-wider whitespace-nowrap shrink-0 border ${
                    isLive
                      ? 'bg-[#10B981]/20 text-[#34D399] border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse'
                      : 'bg-[#F43F5E]/15 text-[#FB7185] border-[#F43F5E]/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                  }`}
                >
                  {countdownStr}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── CARD FOOTER DYNAMIC TELEMETRY ── */}
      <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[8px] sm:text-[8.5px] text-[#64748B] shrink-0 font-medium relative z-10">
        <span>EXAM SCHEDULE</span>
        <span className="text-[#FB7185] font-bold">
          {upcomingCount > 0 ? `${upcomingCount} ACTIVE` : 'STANDBY'}
        </span>
      </div>
    </div>
  );
});

UpcomingExamsShortcutCard.displayName = 'UpcomingExamsShortcutCard';
