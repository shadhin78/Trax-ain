/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Flame, 
  Check, 
  Plus, 
  Trash2, 
  List, 
  Target, 
  BookOpen, 
  Code, 
  Dumbbell, 
  Brain, 
  Sparkles, 
  Zap,
  Clock,
  Sparkle
} from 'lucide-react';
import { useDailyActions, toIsoDate } from '../context/DailyActionsContext';
import { DailyAction, DailyActionColor, DailyActionIcon } from '../types';

// Icon mapper
function getActionIcon(icon: DailyActionIcon) {
  switch (icon) {
    case 'check': return CheckSquare;
    case 'flame': return Flame;
    case 'target': return Target;
    case 'book': return BookOpen;
    case 'code': return Code;
    case 'dumbbell': return Dumbbell;
    case 'brain': return Brain;
    case 'sparkles': return Sparkles;
    case 'zap': return Zap;
    case 'list':
    default:
      return List;
  }
}

// Color theme styles mapper
function getColorThemeStyles(color: DailyActionColor) {
  switch (color) {
    case 'emerald':
      return {
        accent: '#10B981',
        bgPill: 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30',
        glow: 'rgba(16, 185, 129, 0.2)',
        checkBtn: 'bg-[#10B981] text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]',
        border: 'border-[#10B981]/20 hover:border-[#10B981]/40',
      };
    case 'amber':
      return {
        accent: '#F59E0B',
        bgPill: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30',
        glow: 'rgba(245, 158, 11, 0.2)',
        checkBtn: 'bg-[#F59E0B] text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]',
        border: 'border-[#F59E0B]/20 hover:border-[#F59E0B]/40',
      };
    case 'cyan':
      return {
        accent: '#06B6D4',
        bgPill: 'bg-[#06B6D4]/15 text-[#22D3EE] border-[#06B6D4]/30',
        glow: 'rgba(6, 182, 212, 0.2)',
        checkBtn: 'bg-[#06B6D4] text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]',
        border: 'border-[#06B6D4]/20 hover:border-[#06B6D4]/40',
      };
    case 'rose':
      return {
        accent: '#F43F5E',
        bgPill: 'bg-[#F43F5E]/15 text-[#FB7185] border-[#F43F5E]/30',
        glow: 'rgba(244, 63, 94, 0.2)',
        checkBtn: 'bg-[#F43F5E] text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]',
        border: 'border-[#F43F5E]/20 hover:border-[#F43F5E]/40',
      };
    case 'violet':
      return {
        accent: '#8B5CF6',
        bgPill: 'bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/30',
        glow: 'rgba(139, 92, 246, 0.2)',
        checkBtn: 'bg-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]',
        border: 'border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40',
      };
    case 'sky':
      return {
        accent: '#0284C7',
        bgPill: 'bg-[#0284C7]/15 text-[#38BDF8] border-[#0284C7]/30',
        glow: 'rgba(2, 132, 199, 0.2)',
        checkBtn: 'bg-[#0284C7] text-white shadow-[0_0_12px_rgba(2,132,199,0.4)]',
        border: 'border-[#0284C7]/20 hover:border-[#0284C7]/40',
      };
    case 'teal':
      return {
        accent: '#14B8A6',
        bgPill: 'bg-[#14B8A6]/15 text-[#2DD4BF] border-[#14B8A6]/30',
        glow: 'rgba(20, 184, 166, 0.2)',
        checkBtn: 'bg-[#14B8A6] text-black shadow-[0_0_12px_rgba(20,184,166,0.4)]',
        border: 'border-[#14B8A6]/20 hover:border-[#14B8A6]/40',
      };
    case 'indigo':
    default:
      return {
        accent: '#6366F1',
        bgPill: 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30',
        glow: 'rgba(99, 102, 241, 0.2)',
        checkBtn: 'bg-[#6366F1] text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]',
        border: 'border-[#6366F1]/20 hover:border-[#6366F1]/40',
      };
  }
}

interface ActiveDailyActionTrackersCardProps {
  onScrollToCreateForm?: () => void;
}

export const ActiveDailyActionTrackersCard: React.FC<ActiveDailyActionTrackersCardProps> = ({
  onScrollToCreateForm,
}) => {
  const { 
    dailyActions, 
    toggleDailyActionToday, 
    toggleDailyActionDate, 
    deleteDailyAction, 
    formattedToday 
  } = useDailyActions();

  // Filter state: 'all' | 'pending' | 'completed'
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  // Compute Telemetry
  const totalCount = dailyActions.length;
  const completedTodayCount = dailyActions.filter((a) => a.completedDates.includes(todayIso)).length;
  const pendingTodayCount = totalCount - completedTodayCount;
  const highestStreak = dailyActions.reduce((max, a) => Math.max(max, a.streak), 0);
  const completionPct = totalCount > 0 ? Math.round((completedTodayCount / totalCount) * 100) : 0;

  // Filtered List
  const filteredActions = useMemo(() => {
    return dailyActions.filter((a) => {
      const isDone = a.completedDates.includes(todayIso);
      if (filterMode === 'pending') return !isDone;
      if (filterMode === 'completed') return isDone;
      return true;
    });
  }, [dailyActions, filterMode, todayIso]);

  // Status Badge calculation
  const getStatusBadge = () => {
    if (totalCount === 0) {
      return {
        text: 'NO ACTIONS',
        className: 'bg-white/10 text-white/60 border-white/20',
      };
    }
    if (completedTodayCount === totalCount) {
      return {
        text: 'GOAL MET',
        className: 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      };
    }
    if (completedTodayCount > 0) {
      return {
        text: `${completionPct}% DONE`,
        className: 'bg-[#06B6D4]/20 text-[#22D3EE] border-[#06B6D4]/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
      };
    }
    return {
      text: 'PENDING',
      className: 'bg-[#F59E0B]/20 text-[#FBBF24] border-[#F59E0B]/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    };
  };

  const statusBadge = getStatusBadge();

  // Scroll to form handler
  const handleTriggerCreate = () => {
    if (onScrollToCreateForm) {
      onScrollToCreateForm();
    } else {
      const el = document.getElementById('create-daily-action-tracker-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div 
      id="active-daily-action-trackers-card"
      className="w-full rounded-[28px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.4)] relative overflow-hidden font-mono transition-all duration-300"
    >
      {/* Ambient neon orbs */}
      <div 
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#06B6D4]/5 blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#10B981]/5 blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />

      {/* ── TOP HEADER ROW (STRUCTURED AS THE TOP CARD IN THE IMAGE) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-white/[0.08] relative z-10">
        
        {/* Left: Icon, Title & Date Info */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#06B6D4]/15 text-[#22D3EE] border border-[#06B6D4]/30 shadow-[0_0_16px_rgba(6,182,212,0.2)]">
            <CheckSquare className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#F8FAFC]">
              Active Daily Action Trackers
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              {/* Today Date Badge */}
              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#22D3EE] bg-[#06B6D4]/10 border border-[#06B6D4]/30 px-2.5 py-0.5 rounded-lg tracking-wide">
                [ {formattedToday} ]
              </span>

              {/* Status Indicator */}
              <span className="font-mono text-[10px] sm:text-[11px] text-[#94A3B8] uppercase font-semibold">
                CADENCE: {completedTodayCount} / {totalCount} COMPLETED TODAY
              </span>
            </div>
          </div>
        </div>

        {/* Right: Filter Buttons, Add Trigger & Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          
          {/* 1. Filter Switcher Button Group */}
          <div className="inline-flex items-center rounded-xl bg-[#0E121B] border border-white/[0.08] p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#0284C7] text-white shadow-[0_0_12px_rgba(2,132,199,0.4)] border border-[#38BDF8]/50'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06]'
              }`}
              title="Show all daily action trackers"
            >
              All ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('pending')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'pending'
                  ? 'bg-[#D97706] text-white shadow-[0_0_12px_rgba(245,158,11,0.4)] border border-[#F59E0B]/50'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06]'
              }`}
              title="Show pending action trackers for today"
            >
              Pending ({pendingTodayCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('completed')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'completed'
                  ? 'bg-[#059669] text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] border border-[#10B981]/50'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06]'
              }`}
              title="Show completed action trackers for today"
            >
              Done ({completedTodayCount})
            </button>
          </div>

          {/* 2. + ADD TRACKER Button */}
          <button
            type="button"
            onClick={handleTriggerCreate}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_16px_rgba(16,185,129,0.35)] md:hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] md:active:scale-95"
            title="Configure and add a new action tracker below"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>ADD</span>
          </button>

          {/* 3. Telemetry Metric Badges */}
          <div className="flex items-center gap-2">
            
            {/* TODAY COMPLETED */}
            <div className="px-2.5 py-1 rounded-xl bg-[#0E121B] border border-white/[0.08] flex flex-col items-center justify-center min-w-[76px]">
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#94A3B8] tracking-widest">
                TODAY DONE
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
                {completedTodayCount} <span className="text-[9px] font-normal text-white/50">/ {totalCount}</span>
              </span>
            </div>

            {/* ACTIVE STREAK */}
            <div className="px-2.5 py-1 rounded-xl bg-[#0E121B] border border-white/[0.08] flex flex-col items-center justify-center min-w-[76px]">
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#94A3B8] tracking-widest">
                BEST STREAK
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#FBBF24] flex items-center gap-0.5">
                <Flame className="h-3 w-3 fill-[#FBBF24]" />
                <span>{highestStreak}d</span>
              </span>
            </div>

            {/* STATUS BADGE */}
            <div className="px-2.5 py-1 rounded-xl bg-[#0E121B] border border-white/[0.08] flex flex-col items-center justify-center min-w-[84px]">
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#94A3B8] tracking-widest">
                TODAY STATUS
              </span>
              <span className={`text-[10px] sm:text-[11px] font-black uppercase px-2 py-0.5 rounded-md border mt-0.5 ${statusBadge.className}`}>
                {statusBadge.text}
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* ── BOTTOM SECTION: DAILY ACTION TRACKERS CHECKLIST ── */}
      <div className="mt-5 space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#94A3B8]">
            DAILY ACTION TRACKERS CHECKLIST
          </span>
          {totalCount > 0 && (
            <span className="text-[10px] font-mono text-[#22D3EE] font-bold">
              {completedTodayCount} / {totalCount} Checked Today ({completionPct}%)
            </span>
          )}
        </div>

        {/* Empty State Container (If no daily actions created yet) */}
        {totalCount === 0 ? (
          <div className="w-full py-10 sm:py-14 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.01] flex flex-col items-center justify-center text-center px-4 transition-all">
            <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-white/40">
              NO DAILY ACTION TRACKERS CREATED YET.
            </p>
            <button
              type="button"
              onClick={handleTriggerCreate}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] text-xs font-bold text-[#22D3EE] hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Configure Daily Action Tracker</span>
            </button>
          </div>
        ) : filteredActions.length === 0 ? (
          /* Empty for active filter */
          <div className="w-full py-8 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] flex flex-col items-center justify-center text-center px-4">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-white/40">
              No trackers matching filter "{filterMode}".
            </p>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className="mt-2 text-xs text-[#38BDF8] hover:underline cursor-pointer"
            >
              Show All Trackers
            </button>
          </div>
        ) : (
          /* Active Trackers Checklist Items */
          <div className="space-y-2.5">
            {filteredActions.map((action) => {
              const isDoneToday = action.completedDates.includes(todayIso);
              const theme = getColorThemeStyles(action.themeColor);
              const IconComponent = getActionIcon(action.icon);

              // 7-day mini cadence
              const last7Days: { dateIso: string; label: string; isCompleted: boolean }[] = [];
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const iso = toIsoDate(d);
                const dayShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
                last7Days.push({
                  dateIso: iso,
                  label: i === 0 ? 'Today' : dayShort,
                  isCompleted: action.completedDates.includes(iso),
                });
              }

              return (
                <div
                  key={action.id}
                  className={`
                    p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5
                    ${isDoneToday
                      ? 'bg-[#10B981]/[0.05] border-[#10B981]/25'
                      : 'bg-white/[0.02] border-white/[0.07] hover:border-white/[0.16]'
                    }
                  `}
                >
                  {/* Left: Checkbox, Themed Icon, Title, Description, Tags */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    
                    {/* Checkbox for Today */}
                    <button
                      type="button"
                      onClick={() => toggleDailyActionToday(action.id)}
                      className={`
                        mt-0.5 h-6 w-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0
                        ${isDoneToday
                          ? `${theme.checkBtn} border-transparent`
                          : 'border-white/30 hover:border-[#10B981] bg-white/[0.04]'
                        }
                      `}
                      title={isDoneToday ? 'Mark as not completed today' : 'Check in for today'}
                    >
                      {isDoneToday && <Check className="h-4 w-4 stroke-[3]" />}
                    </button>

                    {/* Themed Icon Box */}
                    <div className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 ${theme.bgPill}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs sm:text-sm font-bold ${isDoneToday ? 'line-through text-[#94A3B8]' : 'text-[#F8FAFC]'}`}>
                          {action.title}
                        </span>

                        {action.track && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                            {action.track}
                          </span>
                        )}

                        {/* Streak Badge */}
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 flex items-center gap-0.5">
                          <Flame className="h-2.5 w-2.5 fill-[#FBBF24]" />
                          <span>{action.streak}d streak</span>
                        </span>
                      </div>

                      {action.description && (
                        <p className="text-[10px] text-[#94A3B8] mt-0.5 line-clamp-1">
                          {action.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-[9px] text-white/40">
                        <span>Started: {action.startDate}</span>
                        <span>•</span>
                        <span>Best: {action.bestStreak}d</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: 7-Day History Cadence Dots & Delete */}
                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    
                    {/* Mini 7-Day Dots */}
                    <div className="flex items-center gap-1 bg-[#0E121B] rounded-xl border border-white/[0.08] p-1.5">
                      {last7Days.map((d) => (
                        <button
                          key={d.dateIso}
                          type="button"
                          onClick={() => toggleDailyActionDate(action.id, d.dateIso)}
                          className={`
                            flex flex-col items-center justify-center px-1 py-0.5 rounded-md text-[7px] font-bold transition-all cursor-pointer
                            ${d.isCompleted
                              ? `${theme.bgPill}`
                              : 'text-white/30 hover:text-white/60'
                            }
                          `}
                          title={`${d.dateIso}: ${d.isCompleted ? 'Completed' : 'Not completed'}`}
                        >
                          <span>{d.label[0]}</span>
                          <div 
                            className={`h-1 w-1 rounded-full mt-0.5 ${
                              d.isCompleted ? 'bg-current' : 'bg-white/20'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Delete Action */}
                    <button
                      type="button"
                      onClick={() => deleteDailyAction(action.id)}
                      className="p-1.5 rounded-xl text-[#F43F5E]/70 hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 border border-transparent hover:border-[#F43F5E]/30 transition-all cursor-pointer"
                      title="Delete tracker"
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
  );
};
