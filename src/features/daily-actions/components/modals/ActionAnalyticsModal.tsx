/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart2, CheckCircle2, Calendar, Check } from 'lucide-react';
import { DailyAction } from '../../types';
import { useDailyActions, toIsoDate } from '../../context/DailyActionsContext';

interface ActionAnalyticsModalProps {
  action: DailyAction | null;
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const ActionAnalyticsModal: React.FC<ActionAnalyticsModalProps> = ({
  action,
  isOpen,
  onClose,
}) => {
  const { dailyActions, toggleDailyActionDate, currentDayIso } = useDailyActions();

  // Keep reactive reference to the action so stats & completion states update in real-time
  const liveAction = useMemo(() => {
    return dailyActions.find((a) => a.id === action?.id) || action;
  }, [dailyActions, action]);

  const [timeRange, setTimeRange] = useState<'90D' | '180D' | '1Y'>('180D');
  const [isClosing, setIsClosing] = useState(false);

  // Selected date ISO for inspecting & toggling details below heatmap (defaults to today)
  const [selectedIso, setSelectedIso] = useState<string>(() => {
    return currentDayIso || toIsoDate(new Date());
  });

  // Reset selected date to today when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIso(currentDayIso || toIsoDate(new Date()));
    }
  }, [isOpen, currentDayIso]);

  // Smooth exit animation on PC, instant on mobile
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

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') initiateClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  // Calculate Heatmap & Stats reactively based on liveAction
  const { totalHits, streakDays, consistencyPct, daysInRange, weeksData, monthLabels } = useMemo(() => {
    if (!liveAction) {
      return { totalHits: 0, streakDays: 0, consistencyPct: 0, daysInRange: 180, weeksData: [], monthLabels: [] };
    }

    const numDays = timeRange === '90D' ? 90 : timeRange === '180D' ? 180 : 365;
    const completedSet = new Set(liveAction.completedDates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hitsInCurrentRange: string[] = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = toIsoDate(d);
      if (completedSet.has(iso)) {
        hitsInCurrentRange.push(iso);
      }
    }

    const totalHits = liveAction.completedDates.length;
    const streakDays = liveAction.streak;
    const consistencyPct = numDays > 0 ? Math.round((hitsInCurrentRange.length / numDays) * 100) : 0;

    // Build GitHub-style week grid (each week has 7 days, Sunday to Saturday)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));

    const numWeeks = Math.ceil(numDays / 7) + 1;
    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(endOfWeek.getDate() - (numWeeks * 7 - 1));

    const weeks: { 
      weekIndex: number;
      days: { date: Date; iso: string; isCompleted: boolean; isFuture: boolean; inMonth: number }[];
    }[] = [];

    const cur = new Date(startOfWeek);
    const months: { label: string; weekCol: number }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < numWeeks; w++) {
      const daysInThisWeek = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dateCopy = new Date(cur);
        const iso = toIsoDate(dateCopy);
        const isFuture = dateCopy.getTime() > today.getTime();
        const isCompleted = completedSet.has(iso);
        const month = dateCopy.getMonth();

        // Track month label at first occurrence
        if (month !== lastMonth && dayOfWeek === 0) {
          months.push({ label: MONTH_NAMES_SHORT[month], weekCol: w });
          lastMonth = month;
        }

        daysInThisWeek.push({
          date: dateCopy,
          iso,
          isCompleted,
          isFuture,
          inMonth: month,
        });

        cur.setDate(cur.getDate() + 1);
      }
      weeks.push({ weekIndex: w, days: daysInThisWeek });
    }

    return {
      totalHits,
      streakDays,
      consistencyPct,
      daysInRange: numDays,
      weeksData: weeks,
      monthLabels: months,
    };
  }, [liveAction, timeRange]);

  // Selected date completion status
  const isSelectedCompleted = useMemo(() => {
    if (!liveAction || !selectedIso) return false;
    return liveAction.completedDates.includes(selectedIso);
  }, [liveAction, selectedIso]);

  // Formatted selected date information
  const selectedDateDetails = useMemo(() => {
    if (!selectedIso) {
      const today = new Date();
      return {
        formatted: today.toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        relativeText: 'Today',
        relativeStyle: 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30',
        isFuture: false,
      };
    }

    const [y, m, d] = selectedIso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = dateObj.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const formatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let relativeText = '';
    let relativeStyle = 'bg-white/[0.05] text-[#94A3B8] border-white/[0.1]';
    const isFuture = diffDays > 0;

    if (diffDays === 0) {
      relativeText = 'Today';
      relativeStyle = 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30';
    } else if (diffDays === -1) {
      relativeText = 'Yesterday';
      relativeStyle = 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30';
    } else if (diffDays < -1) {
      relativeText = `${Math.abs(diffDays)}d ago`;
      relativeStyle = 'bg-white/[0.05] text-[#94A3B8] border-white/[0.1]';
    } else {
      relativeText = diffDays === 1 ? 'Tomorrow' : `In ${diffDays}d`;
      relativeStyle = 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30';
    }

    return {
      formatted,
      relativeText,
      relativeStyle,
      isFuture,
    };
  }, [selectedIso]);

  if (!isOpen || !liveAction || typeof document === 'undefined') return null;

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
          w-full max-w-3xl lg:max-w-[820px] max-h-[92vh] overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#0B0F19]/90 backdrop-blur-2xl p-5 sm:p-7
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col font-mono relative
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient legacy glow orbs */}
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#6366F1]/15 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-[#10B981]/15 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* ── MODAL HEADER ── */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 shadow-[0_0_16px_rgba(99,102,241,0.2)]">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#F8FAFC] tracking-tight">
                {liveAction.title} Analytics
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Historical performance record.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={initiateClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── 3 STATS CARDS ROW ── */}
        <div className="grid grid-cols-3 gap-3 my-5 relative z-10 shrink-0">
          {/* TOTAL HITS */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest">
              TOTAL HITS
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#F8FAFC] mt-1">
              {totalHits}
            </span>
          </div>

          {/* STREAK */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest">
              STREAK
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#818CF8] mt-1">
              {streakDays} Days
            </span>
          </div>

          {/* CONSISTENCY */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest">
              CONSISTENCY
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#38BDF8] mt-1">
              {consistencyPct}%
            </span>
          </div>
        </div>

        {/* ── ACTIVITY HEATMAP TREND SECTION ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] relative z-10 space-y-3.5">
          
          {/* Header of Section + Filter Pills */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#818CF8] animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-[#F8FAFC]">
                ACTIVITY HEATMAP TREND
              </span>
            </div>

            {/* Time range switcher */}
            <div className="inline-flex rounded-xl bg-[#0E121B] border border-white/[0.08] p-0.5">
              {(['90D', '180D', '1Y'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeRange === r
                      ? 'bg-[#6366F1] text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {r === '1Y' ? '1 Year' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Heatmap Grid (GitHub style with increased box size) */}
          <div className="overflow-x-auto pb-2 pt-1">
            <div className="min-w-fit space-y-1">
              
              {/* Month Header Row (aligned with week columns) */}
              <div className="flex gap-1 sm:gap-1.5 pl-6 sm:pl-7 text-[9px] sm:text-[10px] text-[#94A3B8] font-bold h-4">
                {weeksData.map((week, idx) => {
                  const monthItem = monthLabels.find((m) => m.weekCol === idx);
                  return (
                    <div key={idx} className="w-3.5 sm:w-4 shrink-0 relative">
                      {monthItem && (
                        <span className="absolute left-0 top-0 whitespace-nowrap text-[9px] sm:text-[10px] text-[#94A3B8]">
                          {monthItem.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Day Rows with Weekday labels (Mon, Wed, Fri aligned row-by-row) */}
              <div className="flex gap-1 sm:gap-1.5 items-start">
                {/* Weekday labels */}
                <div className="flex flex-col gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] text-[#64748B] pr-1 select-none shrink-0">
                  <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end"></span>
                  <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end font-semibold">Mon</span>
                  <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end"></span>
                  <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end font-semibold">Wed</span>
                  <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end"></span>
                  <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end font-semibold">Fri</span>
                  <span className="h-3.5 w-5 sm:h-4 sm:w-6 flex items-center justify-end"></span>
                </div>

                {/* Week Columns */}
                <div className="flex gap-1 sm:gap-1.5">
                  {weeksData.map((week) => (
                    <div key={week.weekIndex} className="flex flex-col gap-1 sm:gap-1.5">
                      {week.days.map((day) => {
                        const isSelected = selectedIso === day.iso;
                        return (
                          <div
                            key={day.iso}
                            onClick={() => setSelectedIso(day.iso)}
                            className={`
                              h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-[4px] cursor-pointer transition-all
                              md:transition-transform md:duration-150 md:hover:scale-125 md:hover:z-20
                              ${day.isFuture
                                ? 'bg-transparent border border-white/[0.04] opacity-50'
                                : day.isCompleted
                                ? 'bg-[#6366F1] shadow-[0_0_6px_rgba(99,102,241,0.7)] border border-[#818CF8]'
                                : 'bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.2]'
                              }
                              ${isSelected
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0B0F19] scale-110 z-10 shadow-[0_0_12px_rgba(255,255,255,0.7)]'
                                : ''
                              }
                            `}
                            title={`${day.iso}: ${day.isCompleted ? 'Completed ✓ (Click to view details)' : 'Not completed (Click to view details)'}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Footer of Heatmap */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-[#94A3B8] flex-wrap gap-2">
            <span>
              <strong className="text-[#818CF8]">{totalHits}</strong> / {daysInRange} days completed ({consistencyPct}%) • Best Streak: <strong className="text-[#FBBF24]">{liveAction.bestStreak}d 🔥</strong>
            </span>

            {/* Legend */}
            <div className="flex items-center gap-1.5 text-[9px]">
              <span>Less</span>
              <div className="h-3 w-3 rounded-[3px] bg-white/[0.04] border border-white/[0.08]" />
              <div className="h-3 w-3 rounded-[3px] bg-[#6366F1] shadow-[0_0_4px_rgba(99,102,241,0.5)]" />
              <span>More (Done)</span>
            </div>
          </div>

        </div>

        {/* ── SELECTED DATE DETAILS & SECTION CHECKBOX (ONLY CHECKBOX, NO SEPARATE YES/NO BUTTONS) ── */}
        <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden shrink-0">
          {/* Ambient subtle backglow */}
          <div 
            className={`absolute -right-10 -bottom-10 w-44 h-44 rounded-full blur-2xl pointer-events-none transition-all duration-300 ${
              isSelectedCompleted ? 'bg-[#10B981]/15' : 'bg-[#6366F1]/10'
            }`}
            aria-hidden="true" 
          />

          {/* Left: Selected Box Details Info */}
          <div className="flex items-center gap-3.5 relative z-10">
            <div className={`
              flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors
              ${isSelectedCompleted
                ? 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30 shadow-[0_0_14px_rgba(16,185,129,0.2)]'
                : 'bg-white/[0.04] text-[#94A3B8] border-white/[0.08]'
              }
            `}>
              <Calendar className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-[#F8FAFC] tracking-tight">
                  {selectedDateDetails.formatted}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${selectedDateDetails.relativeStyle}`}>
                  {selectedDateDetails.relativeText}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-[#94A3B8] font-mono tracking-wider uppercase">RECORD:</span>
                {isSelectedCompleted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#34D399]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    COMPLETED (YES)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#94A3B8]">
                    <span className="h-2 w-2 rounded-full bg-[#64748B]" />
                    NOT COMPLETED (NO)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Section Checkbox (ONLY Checkbox for Yes/No, NO separate buttons) */}
          <div className="relative z-10 flex sm:justify-end">
            <label
              htmlFor={`action-date-checkbox-${selectedIso}`}
              className={`
                group flex items-center gap-3.5 px-4 py-2.5 rounded-xl border cursor-pointer select-none
                md:transition-all md:duration-200
                ${isSelectedCompleted
                  ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#F8FAFC] shadow-[0_0_20px_rgba(16,185,129,0.18)] hover:bg-[#10B981]/20'
                  : 'bg-white/[0.03] border-white/[0.1] text-[#94A3B8] hover:border-white/[0.25] hover:text-[#F8FAFC]'
                }
              `}
            >
              {/* Checkbox Input Element */}
              <div className="relative flex items-center justify-center">
                <input
                  id={`action-date-checkbox-${selectedIso}`}
                  type="checkbox"
                  checked={isSelectedCompleted}
                  onChange={() => {
                    if (liveAction) {
                      toggleDailyActionDate(liveAction.id, selectedIso);
                    }
                  }}
                  className="sr-only"
                />
                <div
                  className={`
                    h-5 w-5 rounded-md border flex items-center justify-center
                    md:transition-all md:duration-150
                    ${isSelectedCompleted
                      ? 'bg-[#10B981] border-[#10B981] text-[#0B0F19] shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                      : 'border-white/30 bg-black/40 group-hover:border-white/60'
                    }
                  `}
                >
                  {isSelectedCompleted && (
                    <Check className="h-3.5 w-3.5 stroke-[3] text-black" />
                  )}
                </div>
              </div>

              {/* Checkbox Yes / No Title */}
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-wide uppercase text-[#F8FAFC] flex items-center gap-1.5">
                  {isSelectedCompleted ? 'Yes (Completed)' : 'No (Incomplete)'}
                </span>
                <span className="text-[10px] text-[#94A3B8]">
                  {isSelectedCompleted ? 'Click checkbox to unmark (No)' : 'Click checkbox to complete (Yes)'}
                </span>
              </div>
            </label>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};

