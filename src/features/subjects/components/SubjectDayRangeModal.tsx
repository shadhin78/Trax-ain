/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Clock, 
  TrendingUp, 
  RotateCcw, 
  Check, 
  Save, 
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { Subject } from '../../../types/academic';
import { PaceGoal, GlobalBaseline } from '../../pace/types';
import { 
  parseLocalDate, 
  toIsoDateString, 
  formatDisplayDate,
  differenceInCalendarDays,
  MS_PER_DAY 
} from '../../pace/utils/paceCalculations';

interface SubjectDayRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
  currentGoal: PaceGoal | null;
  globalBaseline: GlobalBaseline;
  activeChaptersCount: number;
  remainingChaptersCount: number;
  onSaveGoal: (startDate: string, deadline: string) => void;
  onClearGoal?: () => void;
}

export const SubjectDayRangeModal: React.FC<SubjectDayRangeModalProps> = ({
  isOpen,
  onClose,
  subject,
  currentGoal,
  globalBaseline,
  activeChaptersCount,
  remainingChaptersCount,
  onSaveGoal,
  onClearGoal,
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize dates when modal opens or goal changes
  useEffect(() => {
    if (isOpen) {
      const initialStart = currentGoal?.startDate || '';
      const initialEnd = currentGoal?.deadline || '';

      setStartDate(initialStart);
      setDeadline(initialEnd);

      if (initialStart && initialEnd) {
        const diff = Math.max(1, differenceInCalendarDays(initialEnd, initialStart));
        setDurationDays(diff);
      } else {
        setDurationDays(0);
      }
      setErrorMsg(null);
    }
  }, [isOpen, currentGoal]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle start date change
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    setErrorMsg(null);
    if (!newStart) {
      if (!deadline) setDurationDays(0);
      return;
    }

    if (deadline) {
      const d1 = parseLocalDate(newStart);
      const d2 = parseLocalDate(deadline);

      if (d2 <= d1) {
        // Auto bump deadline based on current durationDays
        const days = durationDays > 0 ? durationDays : 30;
        const nextEnd = new Date(d1.getTime() + days * MS_PER_DAY);
        setDeadline(toIsoDateString(nextEnd));
        setDurationDays(days);
      } else {
        const diff = Math.max(1, differenceInCalendarDays(deadline, newStart));
        setDurationDays(diff);
      }
    }
  };

  // Handle deadline change
  const handleDeadlineChange = (newDeadline: string) => {
    setDeadline(newDeadline);
    setErrorMsg(null);
    if (!newDeadline) {
      if (!startDate) setDurationDays(0);
      return;
    }

    if (startDate) {
      const d1 = parseLocalDate(startDate);
      const d2 = parseLocalDate(newDeadline);

      if (d2 <= d1) {
        setErrorMsg('Deadline must be strictly after the start date.');
        return;
      }

      const diff = Math.max(1, differenceInCalendarDays(newDeadline, startDate));
      setDurationDays(diff);
    }
  };

  // Handle duration in days change
  const handleDurationChange = (days: number) => {
    if (days <= 0) {
      setDurationDays(0);
      return;
    }
    const validDays = Math.max(1, Math.floor(days));
    setDurationDays(validDays);
    setErrorMsg(null);

    const baseStart = startDate ? parseLocalDate(startDate) : new Date();
    if (!startDate) {
      setStartDate(toIsoDateString(baseStart));
    }
    const nextEnd = new Date(baseStart.getTime() + validDays * MS_PER_DAY);
    setDeadline(toIsoDateString(nextEnd));
  };

  // Preset quick day additions
  const applyPresetDays = (days: number) => {
    handleDurationChange(days);
  };

  // Sync to Global Baseline
  const syncWithGlobalBaseline = () => {
    const bStart = globalBaseline.startDate || toIsoDateString(new Date());
    const bEnd = globalBaseline.endDate || toIsoDateString(new Date(Date.now() + 30 * MS_PER_DAY));
    setStartDate(bStart);
    setDeadline(bEnd);

    const diff = Math.max(1, differenceInCalendarDays(bEnd, bStart));
    setDurationDays(diff);
    setErrorMsg(null);
  };

  // Real-time calculation previews
  const calculatedPacePreview = useMemo(() => {
    if (!startDate || !deadline) {
      return {
        totalDays: '--',
        daysRemaining: '--',
        reqPace: '--',
      };
    }

    const d1 = parseLocalDate(startDate);
    const d2 = parseLocalDate(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, differenceInCalendarDays(deadline, startDate));
    const daysRemaining = Math.max(0, differenceInCalendarDays(deadline, today));
    const effectiveDays = daysRemaining > 0 ? daysRemaining : totalDays;
    const reqPace = remainingChaptersCount > 0 ? (remainingChaptersCount / effectiveDays) : 0;

    return {
      totalDays: `${totalDays}`,
      daysRemaining: `${daysRemaining}`,
      reqPace: reqPace.toFixed(2),
    };
  }, [startDate, deadline, remainingChaptersCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !deadline) {
      setErrorMsg('Please select both start date and deadline.');
      return;
    }
    const d1 = parseLocalDate(startDate);
    const d2 = parseLocalDate(deadline);
    if (d2 <= d1) {
      setErrorMsg('Deadline must be later than the start date.');
      return;
    }

    onSaveGoal(startDate, deadline);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="subject-day-range-modal-backdrop"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto font-mono"
          onClick={onClose}
        >
          {/* ── MODAL CONTAINER ── */}
          <motion.div
            key="subject-day-range-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-3xl border border-white/[0.12] bg-[#0E121B]/95 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glows */}
            <div 
              className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-[#38BDF8]/15 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />
            <div 
              className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
              aria-hidden="true" 
            />

            {/* ── MODAL HEADER ── */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#0E121B]/95 backdrop-blur-md flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#38BDF8]/30 bg-[#38BDF8]/15 text-[#38BDF8] shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-mono text-base font-bold tracking-tight text-[#F8FAFC]">
                    Day Range Setting
                  </h2>
                  <p className="text-xs font-mono text-[#94A3B8] mt-0.5">
                    Target timeline & duration for <strong className="text-[#F8FAFC]">{subject.name}</strong>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:text-[#F8FAFC] text-[#94A3B8] flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── MODAL BODY (FORM) ── */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)] relative z-10 custom-scrollbar">
              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1">{errorMsg}</div>
                </div>
              )}

              {/* 1. Date Range Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#38BDF8]" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                    className="w-full bg-[#090D16] border border-white/[0.12] rounded-xl px-3 py-2.5 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none cursor-pointer"
                  />
                  <span className="text-[10px] text-[#64748B] block">
                    {startDate ? formatDisplayDate(startDate) : 'DD - Month - YYYY'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#F59E0B]" />
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => handleDeadlineChange(e.target.value)}
                    required
                    className="w-full bg-[#090D16] border border-white/[0.12] rounded-xl px-3 py-2.5 text-xs text-[#F8FAFC] font-mono focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none cursor-pointer"
                  />
                  <span className="text-[10px] text-[#64748B] block">
                    {deadline ? formatDisplayDate(deadline) : 'DD - Month - YYYY'}
                  </span>
                </div>
              </div>

              {/* 2. Direct Days Duration Input */}
              <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#070A12]/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#10B981]" />
                    Total Day Duration
                  </label>
                  <span className="text-xs font-bold font-mono text-[#38BDF8]">
                    {durationDays > 0 ? `${durationDays} Days` : '--'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1500"
                    value={durationDays > 0 ? durationDays : ''}
                    placeholder="Days"
                    onChange={(e) => handleDurationChange(parseInt(e.target.value, 10) || 0)}
                    className="w-28 bg-[#090D16] border border-white/[0.12] rounded-xl px-3 py-2 text-sm text-[#F8FAFC] font-mono font-bold focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none"
                  />
                  <span className="text-xs text-[#94A3B8] font-mono">Days to complete subject</span>
                </div>

                {/* Quick Presets Strip */}
                <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] mr-1">
                    Presets:
                  </span>
                  {[15, 30, 45, 60, 90, 180].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => applyPresetDays(d)}
                      className={`px-2 py-1 text-[11px] font-mono rounded-lg border transition-all cursor-pointer ${
                        durationDays === d
                          ? 'bg-[#38BDF8]/20 border-[#38BDF8]/40 text-[#38BDF8]'
                          : 'bg-white/[0.03] border-white/[0.06] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.08]'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={syncWithGlobalBaseline}
                    className="px-2 py-1 text-[10px] font-mono rounded-lg border border-white/[0.08] bg-white/[0.02] text-[#818CF8] hover:bg-[#818CF8]/10 transition-all cursor-pointer flex items-center gap-1 ml-auto"
                    title="Sync range to Global Baseline"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Global Baseline
                  </button>
                </div>
              </div>

              {/* 3. Live Pace Forecast Summary Tile */}
              <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0E121B]/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#94A3B8] flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-[#10B981]" />
                    Pace Forecast
                  </span>
                  <span className="text-[#38BDF8] font-bold">
                    {remainingChaptersCount} Chapters Remaining
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-[#94A3B8] uppercase">Day Range</div>
                    <div className="text-sm font-bold text-[#F8FAFC] mt-0.5">
                      {calculatedPacePreview.totalDays !== '--' ? `${calculatedPacePreview.totalDays} Days` : '--'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-[#94A3B8] uppercase">Days Left</div>
                    <div className="text-sm font-bold text-[#F59E0B] mt-0.5">
                      {calculatedPacePreview.daysRemaining !== '--' ? `${calculatedPacePreview.daysRemaining} Days` : '--'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-[#94A3B8] uppercase">Req Pace</div>
                    <div className="text-sm font-bold text-[#10B981] mt-0.5">
                      {calculatedPacePreview.reqPace !== '--' ? `${calculatedPacePreview.reqPace} CH/D` : '--'}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── MODAL FOOTER ── */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/[0.08]">
                {currentGoal && onClearGoal ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClearGoal();
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs font-mono text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Remove custom timeline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear Goal
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.03] text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#0284C7] text-xs font-mono font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Day Range
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
