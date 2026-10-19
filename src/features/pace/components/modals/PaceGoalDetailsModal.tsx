/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, TrendingUp, CheckCircle2 } from 'lucide-react';
import { PaceGoal } from '../../types';
import { usePace } from '../../context/PaceContext';
import { formatDisplayDate, formatPaceValue } from '../../utils/paceCalculations';

interface PaceGoalDetailsModalProps {
  goal: PaceGoal | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTrend?: (goal: PaceGoal) => void;
}

export const PaceGoalDetailsModal: React.FC<PaceGoalDetailsModalProps> = ({
  goal,
  isOpen,
  onClose,
  onOpenTrend,
}) => {
  const { calculateStatsForGoal, goals } = usePace();
  const [isClosing, setIsClosing] = useState(false);

  // Smooth exit animation handler (PC only; instant on mobile)
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

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to smoothly close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        initiateClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  if (!isOpen || !goal || typeof document === 'undefined') return null;

  const stats = calculateStatsForGoal(goal);
  const goalTitle = goal.type === 'global' ? 'Global Pace' : (goal.target || 'Pace Target');

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
          w-full max-w-5xl rounded-3xl border border-white/[0.12] bg-[#0B0F19]/80 backdrop-blur-2xl p-5 sm:p-7
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh] overflow-hidden font-mono relative
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient legacy background glow orbs */}
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#38BDF8]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 shadow-[0_0_16px_rgba(56,189,248,0.2)]">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-[#F8FAFC] font-mono tracking-tight">
                  {goalTitle}
                </h3>
                <span className="font-mono text-[9px] uppercase px-2.5 py-0.5 rounded-full bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 font-bold">
                  Workload Breakdown
                </span>
              </div>
              <p className="font-mono text-xs text-[#94A3B8] mt-0.5">
                Timeline: {formatDisplayDate(goal.startDate)} — {formatDisplayDate(goal.deadline)} • {stats.subjectDetails.length} Subjects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTrend && (
              <button
                type="button"
                onClick={() => onOpenTrend(goal)}
                className="p-2 rounded-xl text-[#818CF8] hover:text-white hover:bg-[#6366F1]/20 border border-white/[0.08] hover:border-[#6366F1]/50 transition-all cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.15)] flex items-center gap-1.5 text-xs font-bold"
                title="Burn-Up Trajectory Line Chart"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Line Chart</span>
              </button>
            )}

            <button
              type="button"
              onClick={initiateClose}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 relative z-10">
          {/* Summary Strip: Overall Workload & Pace KPIs */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#070A11]/60 backdrop-blur-md grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Overall Workload
              </span>
              <div className="font-mono text-sm sm:text-base font-black text-[#F8FAFC] mt-0.5">
                {stats.completed} / {stats.total} Ch ({stats.percentage}%)
              </div>
            </div>

            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Remaining
              </span>
              <div className="font-mono text-sm sm:text-base font-bold text-[#F97316] mt-0.5">
                {stats.remaining} Ch
              </div>
            </div>

            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Required Pace
              </span>
              <div className="font-mono text-sm sm:text-base font-black text-[#38BDF8] mt-0.5">
                {formatPaceValue(stats.reqPace)} <span className="text-[10px] text-[#94A3B8] font-normal">ch/d</span>
              </div>
            </div>

            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">
                Actual Pace
              </span>
              <div className="font-mono text-sm sm:text-base font-black text-[#10B981] mt-0.5">
                {formatPaceValue(stats.curPace)} <span className="text-[10px] text-[#94A3B8] font-normal">ch/d</span>
              </div>
            </div>
          </div>

          {/* Micro Progress Bar for Goal */}
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#38BDF8] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, stats.percentage))}%` }}
            />
          </div>

          {/* Linked Secondary Paces (if global goal has any) */}
          {goal.secondaryPaces && goal.secondaryPaces.length > 0 && (
            <div className="p-3 rounded-2xl border border-[#38BDF8]/20 bg-[#38BDF8]/5 space-y-2">
              <span className="font-mono text-[10px] font-black uppercase text-[#38BDF8] block">
                Linked Secondary Paces ({goal.secondaryPaces.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {goals
                  .filter((g) => goal.secondaryPaces?.includes(g.id))
                  .map((sec) => (
                    <div 
                      key={sec.id} 
                      className="px-3 py-1.5 rounded-xl bg-[#0E121B] border border-white/[0.1] font-mono text-xs text-[#F8FAFC] flex items-center gap-2"
                    >
                      <span>{sec.target || (sec.type === 'programs' ? 'Program Goal' : 'Bundle Goal')}</span>
                      <span className="text-[9px] uppercase font-bold text-[#38BDF8]">
                        {sec.type}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Subjects Grid: 3 subjects in 1 row on desktop */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                INCLUDED SUBJECTS BREAKDOWN ({stats.subjectDetails.length}):
              </span>
            </div>

            {stats.subjectDetails.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-white/[0.1] text-center font-mono text-xs text-[#94A3B8]">
                No subjects matched this goal scope.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                {stats.subjectDetails.map((sub) => {
                  const reqPaceDisplay = formatPaceValue(sub.reqPace || 0);
                  const curPaceDisplay = formatPaceValue(sub.curPace || 0);

                  const handleOpenSubTrend = () => {
                    if (!onOpenTrend) return;
                    const subGoal: PaceGoal = {
                      id: `goal_subject_${sub.id}`,
                      type: 'subjects',
                      target: sub.name,
                      startDate: goal.startDate,
                      deadline: goal.deadline,
                      subjects: [sub.id],
                      notes: `Timeline pace for ${sub.name}`,
                      createdAt: new Date().toISOString(),
                    };
                    onOpenTrend(subGoal);
                  };

                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-white/[0.08] hover:border-white/[0.2] bg-[#0E121B]/75 hover:bg-[#0E121B]/95 p-3.5 sm:p-4 space-y-3 backdrop-blur-md transition-all duration-200 flex flex-col justify-between group shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
                    >
                      {/* Top Header of Subject Card */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-mono text-xs sm:text-sm font-bold text-[#F8FAFC] truncate group-hover:text-[#38BDF8] transition-colors" title={sub.name}>
                              {sub.name}
                            </h4>
                            <span className="font-mono text-[10px] text-[#94A3B8] block truncate">
                              {sub.programName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onOpenTrend && (
                              <button
                                type="button"
                                onClick={handleOpenSubTrend}
                                className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-[#6366F1]/20 hover:border-[#6366F1]/50 text-[#94A3B8] hover:text-[#818CF8] transition-all cursor-pointer"
                                title={`Burn-Up Line Chart for ${sub.name}`}
                              >
                                <TrendingUp className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {sub.isPassed ? (
                              <span className="font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>PASSED</span>
                              </span>
                            ) : (
                              <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-white/[0.05] text-[#94A3B8] border border-white/[0.06]">
                                {sub.remainingChapters} rem
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Chapters Progress & Micro Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#94A3B8]">
                            <strong className="text-[#F8FAFC] font-bold">{sub.completedChapters}</strong> / {sub.totalChapters} Ch
                          </span>
                          <span className="text-xs font-bold text-[#818CF8]">
                            {sub.percentage}%
                          </span>
                        </div>

                        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`
                              h-full rounded-full transition-all duration-300
                              ${
                                sub.isPassed
                                  ? 'bg-[#10B981]'
                                  : 'bg-gradient-to-r from-[#6366F1] to-[#38BDF8]'
                              }
                            `}
                            style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }}
                          />
                        </div>
                      </div>

                      {/* Required Pace & Actual Pace Split Boxes */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.06]">
                        {/* Required Pace */}
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <span className="block font-mono text-[8.5px] font-black uppercase tracking-wider text-[#94A3B8]">
                            REQ PACE
                          </span>
                          <div className="font-mono text-xs sm:text-sm font-black text-[#F8FAFC] mt-0.5">
                            {reqPaceDisplay} <span className="text-[9px] font-normal text-[#94A3B8]">ch/d</span>
                          </div>
                        </div>

                        {/* Actual Pace */}
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <span className="block font-mono text-[8.5px] font-black uppercase tracking-wider text-[#94A3B8]">
                            ACT PACE
                          </span>
                          <div className="font-mono text-xs sm:text-sm font-black text-[#10B981] mt-0.5">
                            {curPaceDisplay} <span className="text-[9px] font-normal text-[#94A3B8]">ch/d</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/[0.08] flex justify-end relative z-10">
          <button
            type="button"
            onClick={initiateClose}
            className="px-6 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono font-bold text-[#F8FAFC] transition-colors cursor-pointer border border-white/[0.08]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
