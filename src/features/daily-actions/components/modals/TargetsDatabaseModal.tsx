/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Database, 
  Search, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  Minus, 
  Calendar,
  Layers,
  Check
} from 'lucide-react';
import { useDailyActions } from '../../context/DailyActionsContext';
import { MonthlyTarget } from '../../types';

interface TargetsDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdd?: () => void;
}

export const TargetsDatabaseModal: React.FC<TargetsDatabaseModalProps> = ({
  isOpen,
  onClose,
  onOpenAdd,
}) => {
  const { 
    monthlyTargets, 
    weeklyTargets,
    toggleMonthlyTargetComplete, 
    updateMonthlyTargetProgress, 
    deleteMonthlyTarget,
    toggleWeeklyTargetComplete,
    updateWeeklyTargetProgress,
    deleteWeeklyTarget
  } = useDailyActions();

  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly'>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress'>('all');
  const [isClosing, setIsClosing] = useState(false);

  // Reset period filter when switching tabs
  const handleTabChange = (tab: 'monthly' | 'weekly') => {
    setActiveTab(tab);
    setFilterMonth('all');
  };

  // Smooth exit on PC, instant on mobile
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

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') initiateClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initiateClose]);

  // All distinct periods in database
  const distinctPeriods = useMemo(() => {
    const set = new Set<string>();
    if (activeTab === 'monthly') {
      monthlyTargets.forEach((t) => set.add(t.monthKey));
    } else {
      weeklyTargets.forEach((t) => set.add(t.weekKey));
    }
    return Array.from(set).sort().reverse();
  }, [activeTab, monthlyTargets, weeklyTargets]);

  // Filtered targets
  const filteredMonthly = useMemo(() => {
    return monthlyTargets.filter((t) => {
      if (filterMonth !== 'all' && t.monthKey !== filterMonth) return false;
      if (filterStatus === 'completed' && !t.isCompleted) return false;
      if (filterStatus === 'in-progress' && t.isCompleted) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesTrack = t.track?.toLowerCase().includes(q);
        const matchesMonth = t.monthKey.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTrack && !matchesMonth) return false;
      }
      return true;
    });
  }, [monthlyTargets, filterMonth, filterStatus, searchQuery]);

  const filteredWeekly = useMemo(() => {
    return weeklyTargets.filter((t) => {
      if (filterMonth !== 'all' && t.weekKey !== filterMonth) return false;
      if (filterStatus === 'completed' && !t.isCompleted) return false;
      if (filterStatus === 'in-progress' && t.isCompleted) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesTrack = t.track?.toLowerCase().includes(q);
        const matchesWeek = t.weekKey.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTrack && !matchesWeek) return false;
      }
      return true;
    });
  }, [weeklyTargets, filterMonth, filterStatus, searchQuery]);

  // Telemetry aggregates based on active tab
  const activeDataset = activeTab === 'monthly' ? monthlyTargets : weeklyTargets;
  const totalCount = activeDataset.length;
  const completedCount = activeDataset.filter((t) => t.isCompleted).length;
  const totalUnits = activeDataset.reduce((sum, t) => sum + (t.targetCount || 1), 0);
  const completedUnits = activeDataset.reduce((sum, t) => sum + (t.isCompleted ? t.targetCount : (t.completedCount || 0)), 0);
  const completionPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  if (!isOpen || typeof document === 'undefined') return null;

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
          w-full max-w-4xl rounded-3xl border border-white/[0.12] bg-[#0B0F19]/90 backdrop-blur-2xl p-5 sm:p-7
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh] font-mono relative overflow-hidden
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient neon orbs */}
        <div 
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#38BDF8]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 shadow-[0_0_16px_rgba(99,102,241,0.2)]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] tracking-tight">
                  Targets Database
                </h3>
                <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-[#6366F1]/20 text-[#A5B4FC] border border-[#6366F1]/40 font-bold">
                  {totalCount} Targets
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Central repository for all monthly targets & milestone checklists
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAdd && (
              <button
                type="button"
                onClick={() => {
                  initiateClose();
                  setTimeout(() => onOpenAdd(), 200);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Target</span>
              </button>
            )}
            <button
              type="button"
              onClick={initiateClose}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab switch between Monthly Targets and Weekly Targets */}
        <div className="flex items-center gap-2 pt-3 pb-1 border-b border-white/[0.08] relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('monthly')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'monthly'
                ? 'bg-[#6366F1]/20 text-[#A5B4FC] border border-[#6366F1]/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] border border-transparent'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Monthly Targets ({monthlyTargets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('weekly')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'weekly'
                ? 'bg-[#06B6D4]/20 text-[#22D3EE] border border-[#06B6D4]/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] border border-transparent'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Weekly Targets ({weeklyTargets.length})</span>
          </button>
        </div>

        {/* Aggregate Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 shrink-0 relative z-10">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-wider">TOTAL TARGETS</span>
            <span className="text-lg font-black text-[#F8FAFC] mt-0.5">{totalCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-wider">COMPLETED</span>
            <span className="text-lg font-black text-[#10B981] mt-0.5">{completedCount} / {totalCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-wider">TOTAL VOLUME</span>
            <span className="text-lg font-black text-[#38BDF8] mt-0.5">{completedUnits} / {totalUnits}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-wider">COMPLETION RATE</span>
            <span className="text-lg font-black text-[#A5B4FC] mt-0.5">{completionPct}%</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 pb-3 border-b border-white/[0.08] shrink-0 relative z-10">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab} targets by name or track...`}
              className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.2] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#F8FAFC] placeholder:text-white/30 focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none transition-all"
            />
          </div>

          {/* Period Filter (Month or Week) */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.2] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none transition-all cursor-pointer"
          >
            <option value="all" className="bg-[#0E121B] text-[#F8FAFC]">
              {activeTab === 'monthly' ? 'All Months' : 'All Weeks'}
            </option>
            {distinctPeriods.map((p) => (
              <option key={p} value={p} className="bg-[#0E121B] text-[#F8FAFC]">
                {p}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="inline-flex rounded-xl p-0.5 bg-[#0E121B] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-[#6366F1]/30 text-[#F8FAFC] border border-[#6366F1]/50'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('in-progress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'in-progress'
                  ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'completed'
                  ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Done
            </button>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1 min-h-[220px]">
          {(() => {
            const currentList = activeTab === 'monthly' ? filteredMonthly : filteredWeekly;
            if (currentList.length === 0) {
              return (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01]">
                  <Database className="h-8 w-8 text-white/20 mb-2" />
                  <p className="text-xs text-[#94A3B8] font-bold">No {activeTab} targets found matching criteria</p>
                  <p className="text-[10px] text-white/40 mt-1">Try resetting filters or adjusting search</p>
                </div>
              );
            }

            return currentList.map((target: any) => {
              const currentCount = target.isCompleted ? target.targetCount : (target.completedCount || 0);
              const progressPct = Math.round((currentCount / target.targetCount) * 100);
              const periodKey = activeTab === 'monthly' ? target.monthKey : target.weekKey;

              const toggleFn = () => {
                if (activeTab === 'monthly') {
                  toggleMonthlyTargetComplete(target.id);
                } else {
                  toggleWeeklyTargetComplete(target.id);
                }
              };

              const updateProgressFn = (newCount: number) => {
                if (activeTab === 'monthly') {
                  updateMonthlyTargetProgress(target.id, newCount);
                } else {
                  updateWeeklyTargetProgress(target.id, newCount);
                }
              };

              const deleteFn = () => {
                if (activeTab === 'monthly') {
                  deleteMonthlyTarget(target.id);
                } else {
                  deleteWeeklyTarget(target.id);
                }
              };

              return (
                <div
                  key={target.id}
                  className={`
                    p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                    ${target.isCompleted 
                      ? 'bg-[#10B981]/[0.04] border-[#10B981]/20' 
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14]'
                    }
                  `}
                >
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={toggleFn}
                      className={`
                        mt-0.5 h-5 w-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0
                        ${target.isCompleted
                          ? 'bg-[#10B981] border-[#10B981] text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'border-white/30 hover:border-[#10B981]/80 bg-white/[0.04]'
                        }
                      `}
                    >
                      {target.isCompleted && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs sm:text-sm font-bold ${target.isCompleted ? 'line-through text-[#94A3B8]' : 'text-[#F8FAFC]'}`}>
                          {target.title}
                        </span>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#6366F1]/15 text-[#A5B4FC] border border-[#6366F1]/30">
                          {periodKey}
                        </span>
                        {target.track && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                            {target.track}
                          </span>
                        )}
                      </div>

                      {target.notes && (
                        <p className="text-[10px] text-[#94A3B8] mt-1 line-clamp-1">
                          {target.notes}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              target.isCompleted ? 'bg-[#10B981]' : activeTab === 'monthly' ? 'bg-[#6366F1]' : 'bg-[#06B6D4]'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#94A3B8] shrink-0">
                          {currentCount} / {target.targetCount} {target.unitLabel || 'Units'} ({progressPct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Progress Adjusters & Delete */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <div className="flex items-center bg-[#0E121B] rounded-xl border border-white/[0.08] p-0.5">
                      <button
                        type="button"
                        onClick={() => updateProgressFn(currentCount - 1)}
                        disabled={currentCount <= 0}
                        className="p-1.5 rounded-lg text-white/50 hover:text-white disabled:opacity-20 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Decrease Progress"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-[#F8FAFC]">
                        {currentCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateProgressFn(currentCount + 1)}
                        disabled={currentCount >= target.targetCount}
                        className="p-1.5 rounded-lg text-white/50 hover:text-white disabled:opacity-20 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Increase Progress"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={deleteFn}
                      className="p-2 rounded-xl text-[#F43F5E]/70 hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 border border-transparent hover:border-[#F43F5E]/30 transition-all cursor-pointer"
                      title="Delete target"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>,
    document.body
  );
};
