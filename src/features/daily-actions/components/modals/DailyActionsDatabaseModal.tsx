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
  Flame, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Tag, 
  Activity
} from 'lucide-react';
import { useDailyActions } from '../../context/DailyActionsContext';

interface DailyActionsDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyActionsDatabaseModal: React.FC<DailyActionsDatabaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { dailyActions, currentDayIso } = useDailyActions();
  const [searchQuery, setSearchQuery] = useState('');
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

  // Telemetry aggregates
  const totalTrackers = dailyActions.length;
  const totalCheckInsAllTime = dailyActions.reduce((sum, a) => sum + a.completedDates.length, 0);
  const highestStreak = dailyActions.reduce((max, a) => Math.max(max, a.streak), 0);
  const bestAllTimeStreak = dailyActions.reduce((max, a) => Math.max(max, a.bestStreak), 0);

  // Filtered trackers
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return dailyActions;
    const q = searchQuery.toLowerCase();
    return dailyActions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.track?.toLowerCase().includes(q)
    );
  }, [dailyActions, searchQuery]);

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
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#38BDF8]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0284C7]/15 text-[#38BDF8] border border-[#0284C7]/30 shadow-[0_0_16px_rgba(2,132,199,0.2)]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] tracking-tight">
                  Daily Actions Database
                </h3>
                <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-[#0284C7]/20 text-[#38BDF8] border border-[#0284C7]/40 font-bold">
                  {totalTrackers} Trackers
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Historical completion ledger and habit cadence telemetry
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

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 shrink-0 relative z-10">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-wider">TOTAL TRACKERS</span>
            <span className="text-lg font-black text-[#F8FAFC] mt-0.5">{totalTrackers}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-wider">ALL-TIME CHECK-INS</span>
            <span className="text-lg font-black text-[#10B981] mt-0.5">{totalCheckInsAllTime}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-wider">ACTIVE STREAK PEAK</span>
            <span className="text-lg font-black text-[#FBBF24] mt-0.5 flex items-center gap-1">
              <Flame className="h-4 w-4 fill-[#FBBF24]" />
              <span>{highestStreak}d</span>
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
            <span className="text-[9px] font-black uppercase text-[#94A3B8] tracking-wider">ALL-TIME BEST</span>
            <span className="text-lg font-black text-[#38BDF8] mt-0.5">{bestAllTimeStreak}d</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3 shrink-0 z-10">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action trackers by title, track, or description..."
            className="w-full bg-[#0E121B]/90 border border-white/[0.1] hover:border-white/[0.2] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#F8FAFC] placeholder:text-white/30 focus:ring-1 focus:ring-[#38BDF8] focus:border-[#38BDF8] outline-none transition-all"
          />
        </div>

        {/* Scrollable Ledger */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
          {filteredActions.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01]">
              <Database className="h-8 w-8 text-white/20 mb-2" />
              <p className="text-xs text-[#94A3B8] font-bold">No action trackers found in database</p>
              <p className="text-[10px] text-white/40 mt-1">Configure action trackers to build your history ledger</p>
            </div>
          ) : (
            filteredActions.map((action) => {
              const isDoneToday = action.completedDates.includes(currentDayIso);

              return (
                <div
                  key={action.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.14] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
                        {action.title}
                      </span>
                      {action.track && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                          {action.track}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                        isDoneToday 
                          ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30' 
                          : 'bg-white/[0.05] text-white/50 border-white/10'
                      }`}>
                        {isDoneToday ? 'Completed Today' : 'Pending Today'}
                      </span>
                    </div>

                    {action.description && (
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">
                        {action.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-[9px] text-white/40">
                      <span>Started: {action.startDate}</span>
                      <span>•</span>
                      <span>Total Check-ins: {action.completedDates.length}</span>
                      <span>•</span>
                      <span>Streak: {action.streak}d (Best: {action.bestStreak}d)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="text-xs font-mono font-bold text-[#FBBF24] flex items-center gap-1 bg-[#F59E0B]/10 px-2.5 py-1 rounded-lg border border-[#F59E0B]/20">
                      <Flame className="h-3.5 w-3.5 fill-[#FBBF24]" />
                      <span>{action.streak}d</span>
                    </span>
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
