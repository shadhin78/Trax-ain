/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Play, Pause, RotateCcw, ExternalLink } from 'lucide-react';
import { useFocusTimer } from '../../../focus/context/FocusTimerContext';
import { AppRoute } from '../../../../types/navigation';

interface FocusTimerShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const FocusTimerShortcutCard: React.FC<FocusTimerShortcutCardProps> = React.memo(({ onNavigate }) => {
  const {
    mode,
    status,
    selectedSubject,
    displayHours,
    displayMinutes,
    displaySeconds,
    displayElapsedMs,
    progressPercent,
    startTimer,
    pauseTimer,
    resetTimer,
    sessions,
    dailyTargetHours,
  } = useFocusTimer();

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-cancel reset confirmation after 5 seconds
  useEffect(() => {
    if (isConfirmingReset) {
      resetTimeoutRef.current = setTimeout(() => {
        setIsConfirmingReset(false);
      }, 5000);
    }
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [isConfirmingReset]);

  const handleNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate('/focus/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/focus/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';
  const isActive = isRunning || isPaused || displayElapsedMs > 0;

  const elapsedSec = Math.floor((displayElapsedMs || 0) / 1000);

  // Calculate Today's Focus Stats
  const { todaySec, todaySessionsCount } = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let totalSec = 0;
    let count = 0;

    (sessions || []).forEach((s) => {
      const sDate = s.date || (s.createdAt ? s.createdAt.split('T')[0] : '');
      if (sDate === todayStr) {
        const dur = s.durationSeconds || 0;
        totalSec += dur;
        count += 1;
      }
    });

    if (isActive) {
      totalSec += elapsedSec;
    }

    return {
      todaySec: totalSec,
      todaySessionsCount: count,
    };
  }, [sessions, isActive, elapsedSec]);

  const handleToggleTimer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingReset(false);
    if (isRunning) {
      await pauseTimer();
    } else {
      await startTimer();
    }
  };

  const handlePromptReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingReset(true);
  };

  const handleCancelReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingReset(false);
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
  };

  const handleConfirmReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingReset(false);
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    await resetTimer();
  };

  const todayFormatted = formatDuration(todaySec);
  const targetSeconds = (dailyTargetHours || 0) * 3600;
  const targetPercent = targetSeconds > 0 ? Math.min(100, Math.round((todaySec / targetSeconds) * 100)) : 0;
  const todayHoursDecimal = (todaySec / 3600).toFixed(1);

  return (
    <div
      className={`w-full h-[270px] rounded-[24px] sm:rounded-[26px] border bg-[#0B0F19]/60 backdrop-blur-xl p-3 sm:p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] md:hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] group select-none overflow-hidden ${
        isActive ? 'border-[#A855F7]/40 shadow-[0_0_24px_rgba(168,85,247,0.15)]' : 'border-white/[0.08]'
      }`}
    >
      {/* ── TOP HEADER ROW (Only navigation icon navigates) ── */}
      <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-white/[0.06] mb-1 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-7 w-7 sm:h-7.5 sm:w-7.5 shrink-0 items-center justify-center rounded-xl bg-[#A855F7]/15 text-[#C084FC] border border-[#A855F7]/30 shadow-[0_0_12px_rgba(168,85,247,0.2)] transition-transform duration-300 md:group-hover:scale-105">
            <Clock className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate">
              FOCUS TIMER
            </h3>
            <p className="text-[8px] sm:text-[8.5px] font-bold text-[#64748B] tracking-widest uppercase truncate">
              {isActive ? `${mode} · ACTIVE` : "TODAY'S OVERVIEW"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isActive ? (
            <span
              className={`px-2 py-0.5 rounded-full border text-[8px] sm:text-[8.5px] font-bold tracking-tight flex items-center gap-1.5 ${
                isRunning
                  ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-[#34D399] animate-pulse' : 'bg-[#FBBF24]'}`} />
              {isRunning ? 'FOCUSING' : 'PAUSED'}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-[#94A3B8] text-[8px] sm:text-[8.5px] font-bold tracking-tight">
              STANDBY
            </span>
          )}

          <button
            type="button"
            onClick={handleNavigation}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]"
            title="Open Focus"
            aria-label="Open Focus"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── CARD BODY ── */}
      {isActive ? (
        /* ── ACTIVE TIMER VIEW ── */
        <div className="flex-1 min-h-0 flex flex-col justify-between py-1">
          {/* Subject & Mode Header */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] font-black text-[#F8FAFC] truncate tracking-tight">
              {selectedSubject || 'Focus Session'}
            </span>
            <span className="px-1.5 py-0.5 rounded border border-[#A855F7]/30 bg-[#A855F7]/10 text-[#C084FC] text-[7.5px] sm:text-[8px] font-bold uppercase tracking-wider shrink-0">
              {mode}
            </span>
          </div>

          {/* Hero Timer Digits */}
          <div className="text-center my-0.5">
            <div className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-[0_0_14px_rgba(192,132,252,0.35)]">
              {displayHours}:{displayMinutes}:{displaySeconds}
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden my-1">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7E22CE] via-[#A855F7] to-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleTimer}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#A855F7]/20 hover:bg-[#A855F7]/30 border border-[#A855F7]/40 text-[#C084FC] text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.2)]"
              >
                {isRunning ? (
                  <>
                    <Pause className="h-3 w-3" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" />
                    <span>RESUME</span>
                  </>
                )}
              </button>

              {isConfirmingReset ? (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="px-2.5 py-1 rounded-xl bg-[#F43F5E]/20 hover:bg-[#F43F5E]/30 border border-[#F43F5E]/40 text-[#FDA4AF] text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  >
                    CONFIRM?
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelReset}
                    className="px-2 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white/70 hover:text-white text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    NO
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePromptReset}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 hover:text-white text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  title="Reset Timer (requires confirmation)"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>RESET</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleNavigation}
              className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-[#C084FC] hover:text-white text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ml-auto"
            >
              OPEN →
            </button>
          </div>
        </div>
      ) : (
        /* ── INACTIVE / STANDBY VIEW (SHOWING ONLY TODAY'S FOCUS TIME) ── */
        <div className="flex-1 min-h-0 flex flex-col justify-between py-0.5">
          {/* Header Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A855F7] shadow-[0_0_6px_rgba(168,85,247,0.7)]" />
              <span className="text-[8.5px] sm:text-[9px] font-bold text-[#A78BFA] uppercase tracking-wider">
                TODAY'S FOCUS TIME
              </span>
            </div>
            <span className="text-[8px] sm:text-[8.5px] font-bold text-[#64748B] uppercase tracking-wider">
              {todaySessionsCount} {todaySessionsCount === 1 ? 'SESSION' : 'SESSIONS'}
            </span>
          </div>

          {/* Hero Today's Time Digits */}
          <div className="text-center my-0.5">
            <div className="text-3xl sm:text-4xl font-black text-[#F8FAFC] tracking-tight drop-shadow-sm font-mono">
              {todayFormatted}
            </div>
            <div className="text-[9px] sm:text-[9.5px] font-bold text-[#94A3B8] uppercase tracking-wider mt-0.5">
              {dailyTargetHours && dailyTargetHours > 0
                ? `${todayHoursDecimal}H / ${dailyTargetHours}H DAILY TARGET (${targetPercent}%)`
                : `${todaySessionsCount} SESSIONS COMPLETED TODAY`}
            </div>
          </div>

          {/* Daily Target Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden my-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7E22CE] via-[#A855F7] to-[#C084FC] shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${dailyTargetHours && dailyTargetHours > 0 ? targetPercent : Math.min(100, todaySessionsCount * 25)}%` }}
            />
          </div>

          {/* Compact Telemetry Row: Subject & Mode */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
              <div className="min-w-0">
                <span className="text-[7px] sm:text-[7.5px] font-bold text-[#64748B] uppercase tracking-wider block">
                  DEFAULT SUBJECT
                </span>
                <span className="text-xs font-black text-[#F8FAFC] truncate block">
                  {selectedSubject || 'General Study'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md">
              <div className="min-w-0">
                <span className="text-[7px] sm:text-[7.5px] font-bold text-[#64748B] uppercase tracking-wider block">
                  ACTIVE MODE
                </span>
                <span className="text-xs font-black text-[#C084FC] uppercase truncate block">
                  {mode}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
            <button
              type="button"
              onClick={handleToggleTimer}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#A855F7]/20 hover:bg-[#A855F7]/30 border border-[#A855F7]/40 text-[#C084FC] text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.2)]"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>START FOCUS</span>
            </button>

            <button
              type="button"
              onClick={handleNavigation}
              className="px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-[#C084FC] hover:text-white text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ml-auto"
            >
              OPEN →
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

FocusTimerShortcutCard.displayName = 'FocusTimerShortcutCard';

