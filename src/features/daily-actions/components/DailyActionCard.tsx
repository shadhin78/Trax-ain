/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  Edit3, 
  List, 
  CheckSquare, 
  Flame, 
  Target, 
  BookOpen, 
  Code, 
  Dumbbell, 
  Brain, 
  Sparkles, 
  Zap,
  Check
} from 'lucide-react';
import { DailyAction, DailyActionColor, DailyActionIcon } from '../types';
import { useDailyActions, toIsoDate } from '../context/DailyActionsContext';
import { ActionAnalyticsModal } from './modals/ActionAnalyticsModal';
import { EditDailyActionModal } from './modals/EditDailyActionModal';

interface DailyActionCardProps {
  action: DailyAction;
}

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

const MONTH_NAMES_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const DailyActionCard: React.FC<DailyActionCardProps> = React.memo(({ action: propAction }) => {
  const { toggleDailyActionDate, currentDayIso, dailyActions } = useDailyActions();

  // Always bind directly to live context action so rapid clicking reflects with 0ms delay
  const action = useMemo(() => {
    return dailyActions.find((a) => a.id === propAction.id) || propAction;
  }, [dailyActions, propAction]);

  // Modals state
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const IconComponent = getActionIcon(action.icon);
  const isCompletedToday = action.completedDates.includes(currentDayIso);

  // Calculate days between today and action.startDate
  const daysSinceStart = useMemo(() => {
    if (!action.startDate) return 60;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(action.startDate);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }, [action.startDate]);

  // View scope: if action.startDate is set, default to from-start; otherwise 60d
  const [historyScope, setHistoryScope] = useState<'from-start' | '60d'>(() => {
    return action.startDate ? 'from-start' : '60d';
  });

  const numTiles = useMemo(() => {
    if (historyScope === 'from-start' && action.startDate) {
      return daysSinceStart;
    }
    return 60; // 60 days of history
  }, [historyScope, daysSinceStart, action.startDate]);

  // Generate date tiles: from today going back numTiles days (max 60 days or from-start days)
  const dateTiles = useMemo(() => {
    const tiles: { iso: string; monthLabel: string; dayLabel: string; isCompleted: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < numTiles; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = toIsoDate(d);
      tiles.push({
        iso,
        monthLabel: MONTH_NAMES_SHORT[d.getMonth()],
        dayLabel: String(d.getDate()),
        isCompleted: action.completedDates.includes(iso),
      });
    }
    return tiles;
  }, [action.completedDates, numTiles]);

  // Handle YES toggle (mark today complete)
  const handleToggleYes = () => {
    if (!isCompletedToday) {
      toggleDailyActionDate(action.id, currentDayIso);
    }
  };

  // Handle NO toggle (unmark today)
  const handleToggleNo = () => {
    if (isCompletedToday) {
      toggleDailyActionDate(action.id, currentDayIso);
    }
  };

  return (
    <>
      <div 
        className="w-full h-[375px] rounded-[24px] sm:rounded-[26px] border border-[#6366F1]/30 hover:border-[#6366F1]/50 bg-[#0B0F19]/75 backdrop-blur-xl p-4 sm:p-4.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] font-mono relative overflow-hidden transition-all duration-300 md:hover:-translate-y-1 flex flex-col justify-between"
      >
        {/* Subtle ambient corner glow */}
        <div 
          className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-[#6366F1]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        {/* ── 1. HEADER ROW: ICON + TITLE + QUESTION + (ANALYTICS & EDIT BUTTONS) ── */}
        <div className="flex items-start justify-between gap-2.5 pb-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Themed Icon Squircle */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
              <IconComponent className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-[#F8FAFC] tracking-tight truncate">
                {action.title}
              </h3>
              <p className="font-mono text-[9px] font-bold text-[#94A3B8] tracking-wider uppercase mt-0.5 truncate">
                {action.description || `DID YOU COMPLETE ${action.title.toUpperCase()}?`}
              </p>
            </div>
          </div>

          {/* Analytics & Edit buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsAnalyticsOpen(true)}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-[#94A3B8] hover:text-[#818CF8] transition-colors cursor-pointer"
              title="View Heatmap Analytics"
            >
              <BarChart2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              title="Edit Daily Action Tracker"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── 2. YES / NO SEGMENTED TOGGLE (DEFAULT NO IN VIBRANT RED) ── */}
        <div className="my-2.5 flex rounded-xl bg-[#0E131F] border border-white/[0.08] p-1 shadow-inner shrink-0">
          <button
            type="button"
            onClick={handleToggleYes}
            className={`
              flex-1 py-2 sm:py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5
              ${isCompletedToday
                ? 'bg-[#10B981] text-white shadow-[0_0_18px_rgba(16,185,129,0.55)] border border-[#34D399]'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
              }
            `}
          >
            {isCompletedToday && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            <span>YES</span>
          </button>

          <button
            type="button"
            onClick={handleToggleNo}
            className={`
              flex-1 py-2 sm:py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center
              ${!isCompletedToday
                ? 'bg-[#EF4444] text-white shadow-[0_0_18px_rgba(239,68,68,0.5)] border border-[#F87171]'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
              }
            `}
          >
            <span>NO</span>
          </button>
        </div>

        {/* ── 3. DATE TILES GRID (UNIFORM HEIGHT FOR ALL CARDS, ONLY HISTORY DATA DIFFERS) ── */}
        <div className="flex-1 flex flex-col min-h-0 pt-1">
          {/* History Scope Indicator & Switcher */}
          <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-mono pb-2 h-7 shrink-0">
            <span className="font-bold uppercase tracking-wider text-[8.5px] sm:text-[9px] text-[#CBD5E1] truncate">
              {historyScope === 'from-start' && action.startDate
                ? `HISTORY: TODAY TO START (${numTiles}D)`
                : `HISTORY: LAST 60 DAYS`}
            </span>

            {/* Pill switcher when action.startDate is provided */}
            {action.startDate && (
              <div className="flex items-center bg-[#0E131F] rounded-lg border border-white/[0.08] p-0.5 text-[8px] font-bold shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => setHistoryScope('from-start')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    historyScope === 'from-start'
                      ? 'bg-[#6366F1] text-white shadow-sm'
                      : 'text-white/40 hover:text-white'
                  }`}
                  title="Show history from today back to start date"
                >
                  Start ({daysSinceStart}d)
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryScope('60d')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    historyScope === '60d'
                      ? 'bg-[#6366F1] text-white shadow-sm'
                      : 'text-white/40 hover:text-white'
                  }`}
                  title="Show last 60 days history"
                >
                  60D
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 auto-rows-max content-start">
              {dateTiles.map((tile) => (
                <button
                  key={tile.iso}
                  type="button"
                  onClick={() => toggleDailyActionDate(action.id, tile.iso)}
                  className={`
                    p-1.5 sm:p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all select-none cursor-pointer md:hover:scale-105 active:scale-95
                    ${tile.isCompleted
                      ? 'bg-[#10B981] text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                      : 'bg-[#EF4444] text-white shadow-[0_0_8px_rgba(239,68,68,0.25)]'
                    }
                  `}
                  title={`${tile.iso}: ${tile.isCompleted ? 'Completed (Click to unmark)' : 'Not completed (Click to complete)'}`}
                >
                  <span className="font-mono text-[8px] sm:text-[9px] font-bold tracking-wider uppercase opacity-90">
                    {tile.monthLabel}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black leading-tight mt-0.5">
                    {tile.dayLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Analytics Modal */}
      {isAnalyticsOpen && (
        <ActionAnalyticsModal
          action={action}
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
        />
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <EditDailyActionModal
          action={action}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  );
});
