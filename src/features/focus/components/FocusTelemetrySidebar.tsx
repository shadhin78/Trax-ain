/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Clock, BarChart2, Calendar } from 'lucide-react';
import { useFocusTimer } from '../context/FocusTimerContext';

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatBreakdownDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00 hr 00 min';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const displayM = h === 0 && m === 0 ? 1 : m;
  return `${String(h).padStart(2, '0')} hr ${String(displayM).padStart(2, '0')} min`;
}

export const FocusTelemetrySidebar: React.FC = () => {
  const { sessions, displayElapsedMs } = useFocusTimer();

  // Aggregate historical sessions only when `sessions` array changes
  const { pastTodaySec, pastWeekSec, pastMonthSec, subjectBreakdown } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Compute start of current week (Saturday - Friday week definition)
    const dayOfWeek = (now.getDay() + 1) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    // Compute start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let week = 0;
    let month = 0;
    const breakdownMap: Record<string, number> = {};

    sessions.forEach((s) => {
      const dateStr = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
      const sDate = new Date(`${dateStr}T12:00:00`);
      const dur = s.durationSeconds || 0;

      if (dateStr === todayStr) {
        today += dur;
      }
      if (sDate >= startOfWeek) {
        week += dur;
      }
      if (sDate >= startOfMonth) {
        month += dur;
      }

      breakdownMap[s.subject] = (breakdownMap[s.subject] || 0) + dur;
    });

    const breakdownList = Object.entries(breakdownMap).map(([subject, seconds]) => ({
      subject,
      seconds,
    })).sort((a, b) => b.seconds - a.seconds);

    return {
      pastTodaySec: today,
      pastWeekSec: week,
      pastMonthSec: month,
      subjectBreakdown: breakdownList,
    };
  }, [sessions]);

  // Add currently active ticking elapsed time in O(1)
  const currentActiveSec = Math.floor(displayElapsedMs / 1000);
  const todaySec = pastTodaySec + currentActiveSec;
  const weekSec = pastWeekSec + currentActiveSec;
  const monthSec = pastMonthSec + currentActiveSec;

  return (
    <div className="w-full flex flex-col gap-3.5 sm:gap-4 font-mono select-none">
      {/* ── CARD 1: TODAY'S FOCUS ── */}
      <div className="w-full rounded-[22px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] flex items-center justify-between transition-all duration-300 md:hover:border-white/[0.14]">
        <div>
          <span className="text-[10px] sm:text-[11px] font-black text-[#94A3B8] tracking-widest uppercase">
            TODAY'S FOCUS
          </span>
          <div className="mt-1 font-mono text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
            {formatDuration(todaySec)}
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#60A5FA] shadow-[0_0_14px_rgba(59,130,246,0.2)]">
          <Clock className="h-5 w-5" />
        </div>
      </div>

      {/* ── CARD 2: WEEKLY FOCUS ── */}
      <div className="w-full rounded-[22px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] flex items-center justify-between transition-all duration-300 md:hover:border-white/[0.14]">
        <div>
          <span className="text-[10px] sm:text-[11px] font-black text-[#94A3B8] tracking-widest uppercase">
            WEEKLY FOCUS
          </span>
          <div className="mt-1 font-mono text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
            {formatDuration(weekSec)}
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#10B981]/30 bg-[#10B981]/10 text-[#34D399] shadow-[0_0_14px_rgba(16,185,129,0.2)]">
          <BarChart2 className="h-5 w-5" />
        </div>
      </div>

      {/* ── CARD 3: MONTHLY FOCUS ── */}
      <div className="w-full rounded-[22px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] flex items-center justify-between transition-all duration-300 md:hover:border-white/[0.14]">
        <div>
          <span className="text-[10px] sm:text-[11px] font-black text-[#94A3B8] tracking-widest uppercase">
            MONTHLY FOCUS
          </span>
          <div className="mt-1 font-mono text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
            {formatDuration(monthSec)}
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#818CF8]/30 bg-[#818CF8]/10 text-[#A5B4FC] shadow-[0_0_14px_rgba(129,140,248,0.2)]">
          <Calendar className="h-5 w-5" />
        </div>
      </div>

      {/* ── CARD 4: SUBJECT TIME BREAKDOWN ── */}
      <div className="w-full rounded-[22px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] flex flex-col justify-between min-h-[140px] transition-all duration-300 md:hover:border-white/[0.14]">
        <div>
          <h4 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase">
            SUBJECT TIME BREAKDOWN
          </h4>
          <p className="text-[10px] text-[#94A3B8] tracking-widest uppercase mt-0.5">
            FOCUS TIME ALLOCATION BY TOPIC
          </p>
        </div>

        <div className="my-auto py-3">
          {subjectBreakdown.length === 0 ? (
            <div className="text-center text-xs font-mono font-bold text-[#64748B] tracking-wider py-4">
              NO STUDY RECORDS YET
            </div>
          ) : (
            <div className="space-y-3">
              {subjectBreakdown.slice(0, 4).map(({ subject, seconds }) => {
                const total = Math.max(1, todaySec);
                const pct = Math.min(100, Math.round((seconds / total) * 100));
                return (
                  <div key={subject} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-mono gap-2">
                      <span className="text-[#F8FAFC] font-semibold truncate" title={subject}>
                        {subject}
                      </span>
                      <span className="text-[#3B82F6] font-bold shrink-0">
                        {formatBreakdownDuration(seconds)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
