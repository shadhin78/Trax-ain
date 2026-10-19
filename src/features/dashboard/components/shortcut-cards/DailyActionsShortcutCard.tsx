/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo } from 'react';
import { 
  ExternalLink, 
  Check, 
  X, 
  Briefcase, 
  GraduationCap, 
  Heart, 
  ClipboardCheck, 
  CheckSquare, 
  Flame, 
  Target, 
  BookOpen, 
  Code, 
  Dumbbell, 
  Brain, 
  Sparkles, 
  Zap, 
  List 
} from 'lucide-react';
import { useDailyActions } from '../../../daily-actions/context/DailyActionsContext';
import { DailyActionColor, DailyActionIcon } from '../../../daily-actions/types';
import { AppRoute } from '../../../../types/navigation';

interface DailyActionsShortcutCardProps {
  onNavigate?: (route: AppRoute) => void;
}

// Dynamic Icon Resolver based on action.icon and title keywords
function resolveActionIcon(icon?: DailyActionIcon, title: string = '') {
  const lower = title.toLowerCase().trim();
  if (lower === 'ca' || lower.includes('chartered') || lower.includes('work') || lower.includes('business')) {
    return Briefcase;
  }
  if (lower === 'bba' || lower.includes('degree') || lower.includes('college') || lower.includes('uni')) {
    return GraduationCap;
  }
  if (lower.includes('pushup') || lower.includes('fazr') || lower.includes('fajr') || lower.includes('health') || lower.includes('gym')) {
    return Heart;
  }
  if (
    lower.includes('johor') || lower.includes('dhuhr') || lower.includes('zuhr') ||
    lower.includes('asar') || lower.includes('asr') ||
    lower.includes('magrib') || lower.includes('maghrib') ||
    lower.includes('esha') || lower.includes('isha') ||
    lower.includes('namaz') || lower.includes('prayer')
  ) {
    return ClipboardCheck;
  }

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
    case 'list': return List;
    default: return CheckSquare;
  }
}

// Color Theme Resolver
function resolveThemeStyles(color?: DailyActionColor, title: string = '') {
  const lower = title.toLowerCase().trim();
  
  // Natural contextual accents matching mock reference
  if (!color || color === 'indigo') {
    if (lower === 'ca' || lower.includes('work')) {
      return {
        bg: 'rgba(20, 184, 166, 0.15)',
        border: 'rgba(20, 184, 166, 0.35)',
        color: '#2DD4BF',
        glow: 'rgba(20, 184, 166, 0.25)',
      };
    }
    if (lower === 'bba') {
      return {
        bg: 'rgba(139, 92, 246, 0.15)',
        border: 'rgba(139, 92, 246, 0.35)',
        color: '#A78BFA',
        glow: 'rgba(139, 92, 246, 0.25)',
      };
    }
    if (lower.includes('pushup') || lower.includes('fazr') || lower.includes('fajr')) {
      return {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.35)',
        color: '#34D399',
        glow: 'rgba(16, 185, 129, 0.25)',
      };
    }
    if (
      lower.includes('johor') || lower.includes('asar') ||
      lower.includes('magrib') || lower.includes('esha') ||
      lower.includes('namaz')
    ) {
      return {
        bg: 'rgba(139, 92, 246, 0.15)',
        border: 'rgba(139, 92, 246, 0.35)',
        color: '#A78BFA',
        glow: 'rgba(139, 92, 246, 0.25)',
      };
    }
  }

  switch (color) {
    case 'emerald':
      return {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.35)',
        color: '#34D399',
        glow: 'rgba(16, 185, 129, 0.25)',
      };
    case 'teal':
      return {
        bg: 'rgba(20, 184, 166, 0.15)',
        border: 'rgba(20, 184, 166, 0.35)',
        color: '#2DD4BF',
        glow: 'rgba(20, 184, 166, 0.25)',
      };
    case 'violet':
      return {
        bg: 'rgba(139, 92, 246, 0.15)',
        border: 'rgba(139, 92, 246, 0.35)',
        color: '#A78BFA',
        glow: 'rgba(139, 92, 246, 0.25)',
      };
    case 'cyan':
      return {
        bg: 'rgba(6, 182, 212, 0.15)',
        border: 'rgba(6, 182, 212, 0.35)',
        color: '#22D3EE',
        glow: 'rgba(6, 182, 212, 0.25)',
      };
    case 'sky':
      return {
        bg: 'rgba(2, 132, 199, 0.15)',
        border: 'rgba(2, 132, 199, 0.35)',
        color: '#38BDF8',
        glow: 'rgba(2, 132, 199, 0.25)',
      };
    case 'amber':
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.35)',
        color: '#FBBF24',
        glow: 'rgba(245, 158, 11, 0.25)',
      };
    case 'rose':
      return {
        bg: 'rgba(244, 63, 94, 0.15)',
        border: 'rgba(244, 63, 94, 0.35)',
        color: '#FB7185',
        glow: 'rgba(244, 63, 94, 0.25)',
      };
    case 'indigo':
    default:
      return {
        bg: 'rgba(99, 102, 241, 0.15)',
        border: 'rgba(99, 102, 241, 0.35)',
        color: '#818CF8',
        glow: 'rgba(99, 102, 241, 0.25)',
      };
  }
}

/**
 * Daily Actions Shortcut Card for X-29 Master Dashboard
 * Fully dynamic: zero hardcoded data made by agent.
 * Powered by live DailyActionsContext.
 * Features:
 * - Header with live completion %, mini progress bar, and ExternalLink navigation
 * - Quick Check-In grid with themed action icons, YES/NO status, track badge, and check/cross toggle
 * - Instant two-way synchronization with Firestore and localStorage
 */
export const DailyActionsShortcutCard: React.FC<DailyActionsShortcutCardProps> = React.memo(({ onNavigate }) => {
  const { 
    dailyActions, 
    currentDayIso, 
    todayPercentage, 
    toggleDailyActionToday 
  } = useDailyActions();

  const handleNavigate = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onNavigate) {
      onNavigate('/daily-actions/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/daily-actions/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onNavigate]);

  const handleToggle = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleDailyActionToday(id);
  }, [toggleDailyActionToday]);

  return (
    <div className="w-full h-[270px] rounded-[24px] sm:rounded-[26px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl p-3 sm:p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] font-mono flex flex-col justify-between transition-all duration-300 md:hover:border-white/[0.14] select-none overflow-hidden relative group">
      {/* ── TOP HEADER ROW: TITLE + QUICK CHECK-IN + LIVE % + PROGRESS BAR + NAVIGATION ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] shrink-0">
        <div 
          onClick={handleNavigate}
          className="min-w-0 cursor-pointer group/header"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavigate();
            }
          }}
          title="Open Daily Actions"
        >
          <h3 className="text-xs sm:text-[13px] font-black text-[#F8FAFC] tracking-wider uppercase truncate group-hover/header:text-[#38BDF8] transition-colors">
            DAILY ACTIONS
          </h3>
          <p className="text-[8.5px] sm:text-[9px] font-bold text-[#64748B] tracking-widest uppercase">
            QUICK CHECK-IN
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Telemetry Progress Bar & % */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-[13px] font-black text-[#10B981] tracking-tight">
              {todayPercentage}%
            </span>
            <div 
              className="w-14 sm:w-16 h-1.5 bg-white/[0.08] rounded-full overflow-hidden" 
              role="progressbar" 
              aria-valuenow={todayPercentage} 
              aria-valuemin={0} 
              aria-valuemax={100}
            >
              <div 
                className="h-full bg-[#10B981] rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${todayPercentage}%` }}
              />
            </div>
          </div>

          {/* External Link Navigation Icon */}
          <button
            type="button"
            onClick={handleNavigate}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
            title="Open Daily Actions"
            aria-label="Open Daily Actions"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* ── ACTION ITEMS CONTENT AREA ── */}
      {dailyActions.length === 0 ? (
        <div 
          onClick={handleNavigate}
          className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 text-center cursor-pointer group/empty"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.04] text-white/40 border border-white/[0.08] mb-2 group-hover/empty:scale-105 group-hover/empty:text-[#38BDF8] group-hover/empty:border-[#38BDF8]/30 transition-all">
            <CheckSquare className="h-4.5 w-4.5" />
          </div>
          <p className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
            NO DAILY ACTIONS
          </p>
          <p className="text-[8.5px] font-semibold text-[#64748B] mt-0.5 tracking-wide uppercase">
            Configure habits & trackers in Daily Actions
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 mt-2 overflow-y-auto pr-0.5 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {dailyActions.map((action) => {
              const isCompleted = action.completedDates.includes(currentDayIso);
              const themeStyles = resolveThemeStyles(action.themeColor, action.title);
              const IconComponent = resolveActionIcon(action.icon, action.title);

              return (
                <div
                  key={action.id}
                  onClick={(e) => handleToggle(action.id, e)}
                  className={`group/item relative rounded-xl border p-1.5 sm:p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none ${
                    isCompleted 
                      ? 'bg-[#10B981]/[0.08] border-[#10B981]/30 hover:border-[#10B981]/50 shadow-[0_0_12px_rgba(16,185,129,0.12)]' 
                      : 'bg-white/[0.03] border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Top row: Themed Squircle Icon & Check/Cross Toggle Button */}
                  <div className="flex items-center justify-between gap-1">
                    <div 
                      className="flex h-6 w-6 sm:h-6.5 sm:w-6.5 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover/item:scale-105"
                      style={{
                        backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.2)' : themeStyles.bg,
                        borderColor: isCompleted ? 'rgba(16, 185, 129, 0.4)' : themeStyles.border,
                        color: isCompleted ? '#34D399' : themeStyles.color,
                      }}
                    >
                      <IconComponent className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </div>

                    {/* Check / Cross Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggle(action.id, e)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-[#10B981] border-[#10B981] text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : 'bg-white/[0.04] border-white/[0.12] text-white/30 group-hover/item:text-white/70 group-hover/item:border-white/[0.25]'
                      }`}
                      title={isCompleted ? 'Mark as Not Done' : 'Mark as Done Today'}
                      aria-label={isCompleted ? `Mark ${action.title} incomplete` : `Mark ${action.title} completed`}
                    >
                      {isCompleted ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : (
                        <X className="h-2.5 w-2.5" />
                      )}
                    </button>
                  </div>

                  {/* Bottom section: Title, Status & Track Pill */}
                  <div className="mt-1.5 min-w-0">
                    <h4 className="text-[11px] sm:text-xs font-black text-[#F8FAFC] tracking-tight truncate leading-tight">
                      {action.title}
                    </h4>

                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className={`text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider ${
                        isCompleted ? 'text-[#10B981]' : 'text-[#64748B]'
                      }`}>
                        {isCompleted ? 'YES' : 'NO'}
                      </span>

                      {action.track && (
                        <span className="px-1 py-0.2 rounded text-[7.5px] sm:text-[8px] font-black bg-white/[0.08] text-white/70 border border-white/[0.1] uppercase truncate max-w-[42px] leading-tight">
                          {action.track}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

DailyActionsShortcutCard.displayName = 'DailyActionsShortcutCard';
