/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Database, 
  Plus, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Trash2,
  Sparkles,
  Target,
  Edit2
} from 'lucide-react';
import { useDailyActions } from '../context/DailyActionsContext';
import { useAcademicHierarchy } from '../../../context/AcademicHierarchyContext';
import { AddMonthlyTargetModal } from './modals/AddMonthlyTargetModal';
import { TargetsDatabaseModal } from './modals/TargetsDatabaseModal';
import { EditTargetAllocationModal } from './modals/EditTargetAllocationModal';
import { AppRoute } from '../../../types/navigation';
import { MonthlyTarget } from '../types';
import { formatChapterTargetDisplay } from '../utils/targetDisplayUtils';

interface MonthlyTargetsSetupCardProps {
  onNavigate?: (route: AppRoute) => void;
}

export const MonthlyTargetsSetupCard: React.FC<MonthlyTargetsSetupCardProps> = React.memo(({ onNavigate }) => {
  const { chapters, subjects } = useAcademicHierarchy();
  const {
    selectedDate,
    isCurrentMonth,
    goToPrevMonth,
    goToCurrentMonth,
    goToNextMonth,
    formattedMonthRange,
    formattedToday,
    currentMonthTargets,
    monthlyPaceStats,
    toggleMonthlyTargetComplete,
    deleteMonthlyTarget,
  } = useDailyActions();

  // Determine whether the currently selected date is in a past, present, or future month
  const isPastMonth = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const selYear = selectedDate.getFullYear();
    const selMonth = selectedDate.getMonth();
    return selYear < curYear || (selYear === curYear && selMonth < curMonth);
  }, [selectedDate]);

  const isFutureMonth = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const selYear = selectedDate.getFullYear();
    const selMonth = selectedDate.getMonth();
    return selYear > curYear || (selYear === curYear && selMonth > curMonth);
  }, [selectedDate]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<MonthlyTarget | null>(null);

  // Status badge color & style
  const getEstFinishBadge = () => {
    switch (monthlyPaceStats.estFinish) {
      case 'Goal Met':
        return 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]';
      case 'On Track':
        return 'bg-[#06B6D4]/20 text-[#22D3EE] border-[#06B6D4]/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]';
      case 'Behind Pace':
        return 'bg-[#F59E0B]/20 text-[#FBBF24] border-[#F59E0B]/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]';
      case 'Overdue':
        return 'bg-[#F43F5E]/20 text-[#FB7185] border-[#F43F5E]/40 shadow-[0_0_12px_rgba(244,63,94,0.2)]';
      default:
        return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  return (
    <>
      <div 
        id="monthly-targets-setup-card"
        className="w-full rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.4)] relative overflow-hidden font-mono transition-none md:transition-all md:duration-300 md:hover:border-white/[0.14] md:hover:shadow-[0_16px_50px_rgba(0,0,0,0.55)]"
      >
        {/* Ambient neon orbs - animated on PC, static on phone */}
        <div 
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#6366F1]/5 blur-3xl pointer-events-none opacity-40 md:opacity-100 md:animate-pulse" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#10B981]/5 blur-3xl pointer-events-none opacity-40 md:opacity-100 md:animate-pulse" 
          aria-hidden="true" 
        />

        {/* ── TOP HEADER ROW ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-white/[0.08] relative z-10">
          
          {/* Left: Icon, Title & Date Info */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 shadow-[0_0_16px_rgba(99,102,241,0.2)] transition-none md:transition-transform md:duration-300 md:hover:scale-105">
              <Calendar className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#F8FAFC]">
                Monthly Targets
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Month Range Pill */}
                <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#818CF8] bg-[#6366F1]/10 border border-[#6366F1]/30 px-2.5 py-0.5 rounded-lg tracking-wide">
                  {formattedMonthRange}
                </span>

                {/* Today Indicator */}
                <span className="font-mono text-[10px] sm:text-[11px] text-[#94A3B8] uppercase font-semibold">
                  {formattedToday}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Month Controls, Buttons & Pace Badges */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            
            {/* 1. Month Switcher Button Group */}
            <div className="inline-flex items-center rounded-xl bg-[#0E121B] border border-white/[0.08] p-0.5 shadow-inner backdrop-blur-sm">
              <button
                type="button"
                onClick={goToPrevMonth}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-none md:transition-all md:duration-200 cursor-pointer flex items-center gap-1 active:scale-95 select-none ${
                  isPastMonth
                    ? 'relative z-10 bg-[#4F46E5] text-white shadow-[0_0_20px_rgba(99,102,241,0.7),0_0_36px_rgba(99,102,241,0.4)] border border-[#818CF8]/70 ring-1 ring-[#818CF8]/40'
                    : 'text-[#94A3B8] border border-transparent hover:text-[#F8FAFC] hover:bg-white/[0.06] hover:shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                }`}
                title="Previous Month"
              >
                <span>&lt;- Past Month</span>
              </button>

              <button
                type="button"
                onClick={goToCurrentMonth}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-none md:transition-all md:duration-200 cursor-pointer active:scale-95 select-none ${
                  isCurrentMonth
                    ? 'relative z-10 bg-[#4F46E5] text-white shadow-[0_0_20px_rgba(99,102,241,0.7),0_0_36px_rgba(99,102,241,0.4)] border border-[#818CF8]/70 ring-1 ring-[#818CF8]/40'
                    : 'text-[#94A3B8] border border-transparent hover:text-[#F8FAFC] hover:bg-white/[0.06] hover:shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                }`}
                title="Current Real-world Month"
              >
                Present Month
              </button>

              <button
                type="button"
                onClick={goToNextMonth}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-none md:transition-all md:duration-200 cursor-pointer flex items-center gap-1 active:scale-95 select-none ${
                  isFutureMonth
                    ? 'relative z-10 bg-[#4F46E5] text-white shadow-[0_0_20px_rgba(99,102,241,0.7),0_0_36px_rgba(99,102,241,0.4)] border border-[#818CF8]/70 ring-1 ring-[#818CF8]/40'
                    : 'text-[#94A3B8] border border-transparent hover:text-[#F8FAFC] hover:bg-white/[0.06] hover:shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                }`}
                title="Next Month"
              >
                <span>Future Month -&gt;</span>
              </button>
            </div>

            {/* 2. TARGETS DATABASE Button */}
            <button
              type="button"
              onClick={() => setIsDatabaseModalOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#6366F1]/20 hover:bg-[#6366F1]/35 text-[#C7D2FE] border border-[#6366F1]/40 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-none md:transition-all md:duration-200 cursor-pointer flex items-center gap-1.5 shadow-[0_0_14px_rgba(99,102,241,0.2)] active:scale-95 md:hover:scale-[1.02]"
            >
              <Database className="h-3.5 w-3.5" />
              <span>TARGETS DATABASE</span>
            </button>

            {/* 3. + ADD Button -> Navigates to Monthly Target Set Up page */}
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('/monthly-target-setup/');
                } else if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/monthly-target-setup/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                } else {
                  setIsAddModalOpen(true);
                }
              }}
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider transition-none md:transition-all md:duration-200 cursor-pointer flex items-center gap-1 shadow-[0_0_16px_rgba(16,185,129,0.35)] md:hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 md:hover:scale-[1.02]"
              title="Open Monthly Target Set Up Page"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>ADD</span>
            </button>

            {/* 4. Telemetry Metric Badges */}
            <div className="flex items-center gap-2">
              {/* REQ. PACE */}
              <div className="px-2.5 py-1 rounded-xl bg-[#0E121B] border border-white/[0.08] flex flex-col items-center justify-center min-w-[76px]">
                <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#94A3B8] tracking-widest">
                  REQ. PACE
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
                  {monthlyPaceStats.requiredPace.toFixed(2)} <span className="text-[9px] font-normal text-white/50">/Day</span>
                </span>
              </div>

              {/* ACTUAL PACE */}
              <div className="px-2.5 py-1 rounded-xl bg-[#0E121B] border border-white/[0.08] flex flex-col items-center justify-center min-w-[76px]">
                <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#94A3B8] tracking-widest">
                  ACTUAL PACE
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#22D3EE]">
                  {monthlyPaceStats.actualPace.toFixed(2)} <span className="text-[9px] font-normal text-white/50">/Day</span>
                </span>
              </div>

              {/* EST. FINISH */}
              <div className="px-2.5 py-1 rounded-xl bg-[#0E121B] border border-white/[0.08] flex flex-col items-center justify-center min-w-[84px]">
                <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#94A3B8] tracking-widest">
                  EST. FINISH
                </span>
                <span className={`text-[10px] sm:text-[11px] font-black uppercase px-2 py-0.5 rounded-md border mt-0.5 ${getEstFinishBadge()}`}>
                  {monthlyPaceStats.estFinish}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ── BOTTOM SECTION: MONTHLY TARGET CHECKLIST ── */}
        <div className="mt-5 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#94A3B8]">
              MONTHLY TARGET CHECKLIST
            </span>
            {currentMonthTargets.length > 0 && (
              <span className="text-[10px] font-mono text-[#10B981] font-bold">
                {currentMonthTargets.filter((t) => t.isCompleted).length} / {currentMonthTargets.length} Completed
              </span>
            )}
          </div>

          {/* If No Targets Set: Empty State Container */}
          {currentMonthTargets.length === 0 ? (
            <div className="w-full py-10 sm:py-14 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.01] flex flex-col items-center justify-center text-center px-4 transition-all">
              <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-white/40">
                NO MONTHLY TARGETS SET FOR THIS MONTH.
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] text-xs font-bold text-[#818CF8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Set First Monthly Target</span>
              </button>
            </div>
          ) : (
            /* Active Targets Checklist (Clean single-row format, 3 per row on desktop) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {currentMonthTargets.map((target) => {
                const displayInfo = formatChapterTargetDisplay(target, chapters, subjects);

                return (
                  <div
                    key={target.id}
                    className={`
                      px-3 py-2 sm:px-3 sm:py-2.5 rounded-xl border transition-none md:transition-all md:duration-200 flex items-center justify-between gap-2
                      ${target.isCompleted
                        ? 'bg-[#10B981]/[0.05] border-[#10B981]/25 md:hover:border-[#10B981]/40'
                        : 'bg-white/[0.02] border-white/[0.07] md:hover:border-white/[0.16] md:hover:bg-white/[0.035] md:hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {/* Left: Checkbox & Target Details */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleMonthlyTargetComplete(target.id)}
                        className={`
                          h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-none md:transition-all md:duration-200 active:scale-90 md:hover:scale-105 cursor-pointer shrink-0
                          ${target.isCompleted
                            ? 'bg-[#10B981] border-[#10B981] text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                            : 'border-white/30 hover:border-[#10B981] bg-white/[0.04]'
                          }
                        `}
                        title={target.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                      >
                        {target.isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        {displayInfo.isChapterTarget ? (
                          <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                            <span className={`text-xs font-bold shrink-0 ${target.isCompleted ? 'line-through text-[#94A3B8]' : 'text-[#F8FAFC]'}`}>
                              {displayInfo.subjectName}
                            </span>
                            <span className="text-white/30 text-xs font-mono select-none shrink-0">-</span>
                            <span className={`text-xs font-bold font-mono shrink-0 ${target.isCompleted ? 'line-through text-[#94A3B8]' : 'text-[#818CF8]'}`}>
                              {displayInfo.chapterNumber && (String(displayInfo.chapterNumber).trim().toLowerCase().startsWith('ch')
                                ? displayInfo.chapterNumber
                                : `Ch ${displayInfo.chapterNumber}`)}
                            </span>
                            {displayInfo.topicName && (
                              <>
                                <span className="text-white/30 text-xs font-mono select-none shrink-0">-</span>
                                <span 
                                  className={`text-[11px] font-normal truncate min-w-0 ${target.isCompleted ? 'line-through text-[#64748B]' : 'text-[#94A3B8]'}`}
                                  title={displayInfo.topicName}
                                >
                                  {displayInfo.topicName}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className={`text-xs font-bold truncate block ${target.isCompleted ? 'line-through text-[#94A3B8]' : 'text-[#F8FAFC]'}`}>
                            {target.title}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Edit Button & Delete Button */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingTarget(target)}
                        className="p-1 rounded-lg text-[#38BDF8]/80 hover:text-[#38BDF8] hover:bg-[#38BDF8]/10 border border-transparent hover:border-[#38BDF8]/30 transition-all cursor-pointer"
                        title="Edit target allocation (Month & Week)"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMonthlyTarget(target.id)}
                        className="p-1 rounded-lg text-[#F43F5E]/70 hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 border border-transparent hover:border-[#F43F5E]/30 transition-all cursor-pointer"
                        title="Delete target"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {isAddModalOpen && (
        <AddMonthlyTargetModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {isDatabaseModalOpen && (
        <TargetsDatabaseModal
          isOpen={isDatabaseModalOpen}
          onClose={() => setIsDatabaseModalOpen(false)}
          onOpenAdd={() => setIsAddModalOpen(true)}
        />
      )}

      {editingTarget && (
        <EditTargetAllocationModal
          isOpen={!!editingTarget}
          onClose={() => setEditingTarget(null)}
          target={editingTarget}
          targetType="monthly"
        />
      )}
    </>
  );
});
