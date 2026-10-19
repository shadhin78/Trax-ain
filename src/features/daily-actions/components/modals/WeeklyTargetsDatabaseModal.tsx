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
  Check,
  TrendingUp
} from 'lucide-react';
import { useDailyActions } from '../../context/DailyActionsContext';
import { WeeklyTarget } from '../../types';

interface WeeklyTargetsDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyTargetsDatabaseModal: React.FC<WeeklyTargetsDatabaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    weeklyTargets, 
    toggleWeeklyTargetComplete, 
    updateWeeklyTargetProgress, 
    deleteWeeklyTarget 
  } = useDailyActions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress'>('all');
  const [isClosing, setIsClosing] = useState(false);

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

  // Distinct weeks list
  const availableWeeks = useMemo(() => {
    const set = new Set<string>();
    weeklyTargets.forEach((t) => set.add(t.weekKey));
    return Array.from(set).sort().reverse();
  }, [weeklyTargets]);

  // Filtered targets
  const filteredTargets = useMemo(() => {
    return weeklyTargets.filter((t) => {
      if (filterWeek !== 'all' && t.weekKey !== filterWeek) return false;
      if (filterStatus === 'completed' && !t.isCompleted) return false;
      if (filterStatus === 'in-progress' && t.isCompleted) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesTrack = t.track?.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTrack && !matchesNotes) return false;
      }
      return true;
    });
  }, [weeklyTargets, filterWeek, filterStatus, searchQuery]);

  // Aggregate stats
  const totalInDb = weeklyTargets.length;
  const completedInDb = weeklyTargets.filter((t) => t.isCompleted).length;
  const completionPct = totalInDb > 0 ? Math.round((completedInDb / totalInDb) * 100) : 0;

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className={`
        fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md font-mono
        ${isClosing ? 'animate-trend-backdrop-out' : 'animate-trend-backdrop-in'}
      `}
      onClick={initiateClose}
    >
      <div 
        className={`
          w-full max-w-4xl max-h-[90vh] rounded-[28px] border border-white/[0.12] bg-[#0B0F19]/95 backdrop-blur-2xl p-5 sm:p-7
          shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col font-mono relative overflow-hidden
          ${isClosing ? 'animate-trend-modal-out' : 'animate-trend-modal-in'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glows */}
        <div 
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[#06B6D4]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* ── TOP HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08] relative z-10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#06B6D4]/15 text-[#22D3EE] border border-[#06B6D4]/30 shadow-[0_0_16px_rgba(6,182,212,0.25)]">
              <Database className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-[#F8FAFC]">
                  WEEKLY TARGETS DATABASE
                </h2>
                <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#06B6D4]/15 border border-[#06B6D4]/30 text-[#22D3EE]">
                  ARCHIVE & LOGS
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                Complete historical record of weekly milestones, quotas & pacing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={initiateClose}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── METRICS SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-4 relative z-10 shrink-0 border-b border-white/[0.06]">
          <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest block">
              TOTAL TARGETS
            </span>
            <span className="text-sm sm:text-base font-bold text-[#F8FAFC] mt-0.5 block">
              {totalInDb}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest block">
              COMPLETED
            </span>
            <span className="text-sm sm:text-base font-bold text-[#10B981] mt-0.5 block">
              {completedInDb}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest block">
              IN PROGRESS
            </span>
            <span className="text-sm sm:text-base font-bold text-[#F59E0B] mt-0.5 block">
              {totalInDb - completedInDb}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-widest block">
              ALL-TIME SUCCESS
            </span>
            <span className="text-sm sm:text-base font-bold text-[#22D3EE] mt-0.5 block">
              {completionPct}%
            </span>
          </div>
        </div>

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 py-3 relative z-10 shrink-0">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search weekly targets by title, track or notes..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0E121B] border border-white/[0.08] text-xs text-[#F8FAFC] placeholder-white/30 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4]/40 transition-all"
            />
          </div>

          {/* Week Selector Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0E121B] border border-white/[0.08] text-xs text-[#F8FAFC] focus:border-[#06B6D4] focus:outline-none cursor-pointer"
            >
              <option value="all">All Weeks ({availableWeeks.length})</option>
              {availableWeeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>

            {/* Status Segmented Pill */}
            <div className="inline-flex rounded-xl bg-[#0E121B] border border-white/[0.08] p-0.5">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-[#06B6D4] text-black font-black'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('in-progress')}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                  filterStatus === 'in-progress'
                    ? 'bg-[#F59E0B] text-black font-black'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                  filterStatus === 'completed'
                    ? 'bg-[#10B981] text-black font-black'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>

        {/* ── RECORDS LIST CONTAINER ── */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-2 relative z-10 min-h-0">
          {filteredTargets.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01]">
              <Database className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <p className="text-xs font-bold uppercase text-white/40 tracking-wider">
                NO WEEKLY TARGETS FOUND MATCHING FILTERS.
              </p>
            </div>
          ) : (
            filteredTargets.map((target) => {
              const currentCount = target.isCompleted ? target.targetCount : (target.completedCount || 0);
              const progressPct = Math.round((currentCount / target.targetCount) * 100);

              return (
                <div
                  key={target.id}
                  className={`
                    p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                    ${target.isCompleted
                      ? 'bg-[#10B981]/[0.05] border-[#10B981]/25'
                      : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.16]'
                    }
                  `}
                >
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleWeeklyTargetComplete(target.id)}
                      className={`
                        mt-0.5 h-5 w-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0
                        ${target.isCompleted
                          ? 'bg-[#10B981] border-[#10B981] text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'border-white/30 hover:border-[#10B981] bg-white/[0.04]'
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

                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30">
                          {target.weekKey}
                        </span>

                        {target.track && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#06B6D4]/15 text-[#22D3EE] border border-[#06B6D4]/30">
                            {target.track}
                          </span>
                        )}
                      </div>

                      {target.notes && (
                        <p className="text-[10px] text-[#94A3B8] mt-0.5 line-clamp-1">
                          {target.notes}
                        </p>
                      )}

                      {/* Progress Bar & Numeric Counter */}
                      <div className="mt-2 flex items-center gap-2 max-w-md">
                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              target.isCompleted ? 'bg-[#10B981]' : 'bg-gradient-to-r from-[#06B6D4] to-[#10B981]'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#94A3B8] shrink-0">
                          {currentCount} / {target.targetCount} {target.unitLabel || 'Chapters'} ({progressPct}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stepper Adjusters & Delete */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <div className="flex items-center bg-[#0E121B] rounded-xl border border-white/[0.08] p-0.5">
                      <button
                        type="button"
                        onClick={() => updateWeeklyTargetProgress(target.id, currentCount - 1)}
                        disabled={currentCount <= 0}
                        className="p-1 rounded-lg text-white/50 hover:text-white disabled:opacity-20 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Decrease Progress"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-[#F8FAFC]">
                        {currentCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateWeeklyTargetProgress(target.id, currentCount + 1)}
                        disabled={currentCount >= target.targetCount}
                        className="p-1 rounded-lg text-white/50 hover:text-white disabled:opacity-20 hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Increase Progress"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteWeeklyTarget(target.id)}
                      className="p-1.5 rounded-xl text-[#F43F5E]/70 hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 border border-transparent hover:border-[#F43F5E]/30 transition-all cursor-pointer"
                      title="Delete weekly target"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
