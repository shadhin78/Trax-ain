/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MoreVertical, 
  X,
  LayoutDashboard,
  BarChart3,
  Target,
  CheckSquare,
  Calendar,
  BookOpen,
  Gauge,
  Sliders,
  Trophy,
  CalendarCheck,
  User,
} from 'lucide-react';
import { AppRoute, NavItemConfig } from '../../types/navigation';
import { XLogo } from '../ui/XLogo';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { usePace } from '../../features/pace/context/PaceContext';
import { 
  parseLocalDate, 
  calculateYMDDiff, 
  formatYMDString,
  differenceInCalendarDays,
} from '../../features/pace/utils/paceCalculations';
import { useUpcomingExamHeader } from '../../features/exam-routine/utils/useUpcomingExamHeader';
import { useOutcome } from '../../features/outcome/context/OutcomeContext';

interface HeaderProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

function useGlobalPaceDays() {
  const { globalGoal, globalBaseline, hasGlobalGoal } = usePace();

  const startDateStr = (hasGlobalGoal && globalGoal?.startDate) || globalBaseline?.startDate;
  const deadlineStr = (hasGlobalGoal && globalGoal?.deadline) || globalBaseline?.endDate;

  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Time Elapsed: how many fully elapsed calendar days from global pace startDate (exclusive day counting)
    let timeElapsedDisplay = '--';
    if (startDateStr) {
      const elapsedDays = Math.max(0, differenceInCalendarDays(today, startDateStr));
      timeElapsedDisplay = `${elapsedDays} ${elapsedDays === 1 ? 'Day' : 'Days'}`;
    }

    // 2. Final Deadline: how many calendar days remain until global pace deadline
    let finalDeadlineDisplay = '--';
    if (deadlineStr) {
      const diffDays = differenceInCalendarDays(deadlineStr, today);
      const remainingDays = Math.max(0, diffDays);
      finalDeadlineDisplay = `${remainingDays} ${remainingDays === 1 ? 'Day' : 'Days'}`;
    }

    return {
      timeElapsedDisplay,
      finalDeadlineDisplay,
    };
  }, [startDateStr, deadlineStr]);
}

const MENU_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', title: 'Dashboard', route: '/', icon: LayoutDashboard },
  { id: 'analytics', title: 'Analytics', route: '/analytics/', icon: BarChart3 },
  { id: 'focus', title: 'Focus', route: '/focus/', icon: Target },
  { id: 'daily-actions', title: 'Daily Actions', route: '/daily-actions/', icon: CheckSquare },
  { id: 'daily-schedule', title: 'Daily Schedule', route: '/daily-schedule/', icon: Calendar },
  { id: 'subjects', title: 'Subjects', route: '/subjects/', icon: BookOpen },
  { id: 'pace-management', title: 'Pace Management', route: '/pace-management/', icon: Gauge },
  { id: 'master-config', title: 'Master Config', route: '/master-config/', icon: Sliders },
  { id: 'outcome', title: 'Outcome', route: '/outcome/', icon: Trophy },
  { id: 'exam-routine', title: 'Exam Routine', route: '/exam-routine/', icon: CalendarCheck },
  { id: 'account', title: 'Account', route: '/account/', icon: User },
];

/**
 * Bulletproof Responsive Floating Header for X-29.
 * - Desktop (>= lg): Desktop Upcoming Exam + 4 floating blocks (Clock, Success Score, Time Elapsed, Final Deadline).
 * - Mobile (< lg): Compact header with Upcoming Exam on top, 3-dot menu button,
 *   and responsive row: Success Score | Day Elapsed | Final Deadline (guaranteed visible down to 320px).
 * - Mobile 3-Dot Menu: Smooth floating glass navigation modal with outside-click close.
 */
export const Header: React.FC<HeaderProps> = ({ currentRoute, onNavigate }) => {
  const { timeElapsedDisplay, finalDeadlineDisplay } = useGlobalPaceDays();
  const { coreCoursesPassedPercent, overallPassedCount, totalCoreCoursesCount } = useOutcome();
  const upcomingExam = useUpcomingExamHeader();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const menuModalRef = useRef<HTMLDivElement>(null);

  // Live 12-hour clock (AM/PM)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Lock body container scroll when mobile 3-dot modal is open without shifting the page
  useEffect(() => {
    const bodyEl = document.getElementById('body-container');
    if (isMenuOpen) {
      if (bodyEl) bodyEl.style.overflow = 'hidden';
    } else {
      if (bodyEl) bodyEl.style.overflow = '';
    }
    return () => {
      if (bodyEl) bodyEl.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* ── CONTAINER 2: HEADER CONTAINER ── */}
      <header 
        id="header-container"
        data-container="header"
        className="flex-1 min-w-0 px-2.5 sm:px-6 lg:pr-8 lg:pl-3 py-2 sm:py-3 bg-transparent"
      >
        
        {/* ==================================================================== */}
        {/* 1. MOBILE HEADER (< lg: 320px - 1023px) — ROW 1: FIXED / STICKY      */}
        {/* ==================================================================== */}
        <div className="flex lg:hidden flex-col w-full">
          
          {/* ── ROW 1 — FIXED: Upcoming Exam on left, Clock + Navigation 3-Dot Menu on right ── */}
          <div className="relative z-30 flex items-center justify-between gap-2 w-full rounded-2xl border border-white/[0.08] bg-[#131722]/90 p-3 sm:p-3.5 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center min-w-0 pr-1 font-mono">
              {upcomingExam.hasUpcomingExam ? (
                <div className="flex items-center min-w-0">
                  {/* Exam Subject Name */}
                  <span className="font-black text-[#F8FAFC] text-xs sm:text-sm truncate max-w-[95px] xs:max-w-[130px] sm:max-w-[180px]">
                    {upcomingExam.subjectName}
                  </span>

                  {/* Separator Dash */}
                  <span className="font-bold text-[#64748B] text-xs sm:text-sm mx-1.5 shrink-0 select-none">
                    -
                  </span>

                  {/* Countdown or Live Display */}
                  {upcomingExam.status === 'LIVE_IN_PROGRESS' ? (
                    <span className="inline-flex items-center gap-1 font-black text-[#F43F5E] text-xs sm:text-sm shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F43F5E]" />
                      LIVE NOW
                    </span>
                  ) : upcomingExam.units && upcomingExam.units.length > 0 ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {upcomingExam.units.map((unit, idx) => (
                        <span key={idx} className="inline-flex items-baseline font-mono">
                          <span className="font-black text-[#F43F5E] text-xs sm:text-sm">
                            {unit.value}
                          </span>
                          <span className="font-bold text-[#F8FAFC]/90 text-[10px] sm:text-xs lowercase ml-0.5 select-none">
                            {unit.unit}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="font-black text-[#F43F5E] text-xs sm:text-sm shrink-0">
                      {upcomingExam.countdownDisplay}
                    </span>
                  )}
                </div>
              ) : (
                <span className="font-semibold text-xs text-[#94A3B8]">
                  {upcomingExam.subjectName}
                </span>
              )}
            </div>

            {/* Right side of Row 1: Clock (left of navigation dot) + Navigation 3-Dot Menu */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Clock Block */}
              <div className="flex flex-col items-center justify-center shrink-0 min-w-[85px] sm:min-w-[95px] rounded-xl border border-white/[0.08] bg-[#0E121B]/60 px-2.5 py-1.5 text-center">
                <span className="font-mono text-[9px] text-[#94A3B8] uppercase tracking-wider truncate w-full">
                  Clock
                </span>
                <span className="font-mono text-[11px] sm:text-xs font-bold text-[#F8FAFC] mt-0.5 whitespace-nowrap">
                  {currentTime || '12:00:00 AM'}
                </span>
              </div>

              {/* Navigation 3-Dot Menu Button */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-[#131722]/80 text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#6366F1]/50 active:scale-95 transition-all focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                aria-label="Open navigation menu"
                aria-expanded={isMenuOpen}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

        </div>

        {/* ==================================================================== */}
        {/* 2. DESKTOP FLOATING HEADER (>= lg: 1024px+)                         */}
        {/* ==================================================================== */}
        <div className="hidden lg:flex min-h-[5.5rem] w-full flex-wrap items-center justify-between gap-3">
          
          {/* Left: Upcoming Exam Block */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <div 
              id="header-upcoming-exam-card"
              onClick={() => onNavigate('/exam-routine/')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate('/exam-routine/');
                }
              }}
              title={upcomingExam.hasUpcomingExam ? `Upcoming Exam: ${upcomingExam.subjectName} — Click to view Exam Routine` : 'Exam Routine — Click to view'}
              className="flex items-center justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-5 sm:px-6 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all duration-300 lg:hover:border-white/[0.2] lg:hover:bg-[#131722]/60 lg:hover:shadow-[0_0_28px_rgba(244,63,94,0.18)] w-[520px] max-w-full h-[66px] shrink-0 cursor-pointer select-none"
            >
              {upcomingExam.hasUpcomingExam ? (
                <div className="flex items-center justify-center w-full min-w-0 font-mono tracking-tight select-none">
                  {/* Subject Name: Prominent bold size filling the card, with multi-line break for long titles */}
                  {(upcomingExam.subjectName || '').length > 20 ? (
                    <div className="min-w-0 max-w-[265px] flex items-center justify-center text-center px-1">
                      <span 
                        className="font-black text-[#F8FAFC] text-xs sm:text-sm lg:text-[14px] xl:text-[15px] leading-tight line-clamp-2 break-words drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                        title={upcomingExam.subjectName}
                      >
                        {upcomingExam.subjectName}
                      </span>
                    </div>
                  ) : (
                    <span 
                      className="font-black text-[#F8FAFC] text-base sm:text-lg lg:text-xl xl:text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] truncate max-w-[265px]"
                      title={upcomingExam.subjectName}
                    >
                      {upcomingExam.subjectName}
                    </span>
                  )}

                  {/* Dash Separator */}
                  <span className="font-bold text-[#64748B] text-base sm:text-lg lg:text-xl xl:text-2xl mx-2 sm:mx-2.5 xl:mx-3 shrink-0 select-none">
                    -
                  </span>

                  {/* 4 Countdown units with unit name */}
                  {upcomingExam.status === 'LIVE_IN_PROGRESS' ? (
                    <span className="inline-flex items-center gap-2 font-black text-[#F43F5E] text-base sm:text-lg lg:text-xl xl:text-2xl lg:animate-pulse shrink-0">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#F43F5E] shadow-[0_0_10px_#F43F5E]" />
                      LIVE NOW
                    </span>
                  ) : upcomingExam.units && upcomingExam.units.length > 0 ? (
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 tabular-nums">
                      {upcomingExam.units.map((unit, idx) => (
                        <span key={idx} className="inline-flex items-baseline font-mono">
                          <span className="font-black text-[#F43F5E] text-base sm:text-lg lg:text-xl xl:text-2xl tracking-tight lg:drop-shadow-[0_0_10px_rgba(244,63,94,0.45)]">
                            {unit.value}
                          </span>
                          <span className="font-bold text-[#F8FAFC]/90 text-xs sm:text-sm lg:text-base lowercase ml-0.5 select-none">
                            {unit.unit}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="font-black text-[#F43F5E] text-base sm:text-lg lg:text-xl xl:text-2xl shrink-0 tabular-nums">
                      {upcomingExam.countdownDisplay}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center w-full font-mono">
                  <span className="font-bold text-sm sm:text-base lg:text-lg text-[#94A3B8] tracking-wider truncate">
                    {upcomingExam.subjectName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Four Floating Telemetry Blocks */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 pointer-events-auto">
            
            {/* Block 1: Clock */}
            <div className="flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-5 py-3 sm:px-6 sm:py-3.5 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.18] hover:bg-[#131722]/55 min-w-[115px]">
              <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-[#94A3B8]">
                Clock
              </span>
              <span className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#F8FAFC] whitespace-nowrap">
                {currentTime || '12:00:00 AM'}
              </span>
            </div>

            {/* Block 2: Success Score */}
            <div 
              className="flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-5 py-3 sm:px-6 sm:py-3.5 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.18] hover:bg-[#131722]/55 min-w-[110px]"
              title={`Milestone Celebration Core Targets: ${overallPassedCount} of ${totalCoreCoursesCount} Passed (${coreCoursesPassedPercent}%)`}
            >
              <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-[#94A3B8]">
                Success Score
              </span>
              <span className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#10B981]">
                {coreCoursesPassedPercent}%
              </span>
            </div>

            {/* Block 3: Time Elapsed */}
            <div 
              className="flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-5 py-3 sm:px-6 sm:py-3.5 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.18] hover:bg-[#131722]/55 min-w-[105px]"
            >
              <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-[#94A3B8]">
                Time Elapsed
              </span>
              <span className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#F8FAFC]">
                {timeElapsedDisplay}
              </span>
            </div>

            {/* Block 4: Final Deadline */}
            <div 
              className="flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#131722]/40 px-5 py-3 sm:px-6 sm:py-3.5 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/[0.18] hover:bg-[#131722]/55 min-w-[110px]"
            >
              <span className="font-mono text-[10px] sm:text-xs font-semibold tracking-wider text-[#94A3B8]">
                Final Deadline
              </span>
              <span className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#F43F5E]">
                {finalDeadlineDisplay}
              </span>
            </div>

            {/* In-App PWA Install Trigger (Appears when installable, auto-hides when standalone) */}
            <PWAInstallButton />

          </div>

        </div>

      </header>

      {/* ==================================================================== */}
      {/* 3. MOBILE 3-DOT FLOATING NAVIGATION MODAL (SMOOTH ANIMATIONS)       */}
      {/* ==================================================================== */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-menu-backdrop touch-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMenuOpen(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          <div 
            ref={menuModalRef}
            className="flex flex-col w-full max-w-sm max-h-[85vh] rounded-3xl border border-white/[0.12] bg-[#131722]/95 p-4 sm:p-5 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] animate-menu-modal touch-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F2637] border border-white/[0.1] p-1">
                  <XLogo size={18} />
                </div>
                <span className="font-mono text-xs font-bold tracking-widest text-[#F8FAFC]">
                  NAVIGATION
                </span>
              </div>

              {/* Close Button (min 44x44px touch target) */}
              <button
                onClick={() => setIsMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#131722] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#181f30] active:scale-95 transition-all focus:outline-none"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Menu Items List with Cascading Staggered Smooth Entrance */}
            <div className="flex-1 overflow-y-auto py-3 space-y-1.5 pr-1">
              {MENU_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentRoute === item.route;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.route);
                      setIsMenuOpen(false);
                    }}
                    style={{ animationDelay: `${index * 18}ms` }}
                    className={`
                      animate-menu-item group relative flex w-full items-center min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-medium tracking-wide
                      transition-all duration-200 ease-out text-left border
                      ${
                        isActive
                          ? 'border-[#6366F1] bg-[#6366F1]/20 text-[#F8FAFC] shadow-[0_0_16px_rgba(99,102,241,0.3)]'
                          : 'border-white/[0.06] bg-[#131722]/50 text-[#94A3B8] hover:border-white/[0.18] hover:bg-[#131722]/80 hover:text-[#F8FAFC] active:scale-[0.98]'
                      }
                    `}
                  >
                    {/* Fixed Icon Container */}
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-[#6366F1]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                        }`}
                      />
                    </div>

                    {/* Text Label with Fixed Horizontal Offset */}
                    <span className="ml-3 truncate font-medium text-left">
                      {item.title}
                    </span>

                    {/* Active Pip */}
                    {isActive && (
                      <span
                        className="ml-auto h-2 w-2 shrink-0 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,1)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-[#64748B]">
              <span>TraX COMMAND SHELL</span>
              <div className="flex items-center gap-2">
                <PWAInstallButton compact={true} />
                <span className="text-[#10B981]">ROUTE SYNCED</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

/**
 * Mobile Row 2 — Telemetry Row in Normal Document Flow (< lg only).
 * Sits directly above body content in normal document flow.
 * Scrolls naturally with the body without any fixed/sticky behavior or special JS.
 */
export const MobileHeaderRow2: React.FC = () => {
  const { timeElapsedDisplay, finalDeadlineDisplay } = useGlobalPaceDays();
  const { coreCoursesPassedPercent, overallPassedCount, totalCoreCoursesCount } = useOutcome();

  return (
    <div className="flex lg:hidden flex-nowrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full max-w-full rounded-2xl border border-white/[0.08] bg-[#131722]/65 p-2 sm:p-2.5 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.4)] mb-3 shrink-0 overscroll-x-contain touch-pan-x">
      {/* Block 1: Success Score */}
      <div 
        className="flex flex-col items-center justify-center shrink-0 flex-1 min-w-[85px] rounded-xl border border-white/[0.08] bg-[#0E121B]/60 px-2.5 py-1.5 text-center"
        title={`Milestone Celebration Core Targets: ${overallPassedCount} of ${totalCoreCoursesCount} Passed (${coreCoursesPassedPercent}%)`}
      >
        <span className="font-mono text-[9px] text-[#94A3B8] uppercase tracking-wider truncate w-full">
          Success Score
        </span>
        <span className="font-mono text-[11px] sm:text-xs font-bold text-[#10B981] mt-0.5">
          {coreCoursesPassedPercent}%
        </span>
      </div>

      {/* Block 2: Time Elapsed */}
      <div 
        className="flex flex-col items-center justify-center shrink-0 flex-1 min-w-[80px] rounded-xl border border-white/[0.08] bg-[#0E121B]/60 px-2.5 py-1.5 text-center"
      >
        <span className="font-mono text-[9px] text-[#94A3B8] uppercase tracking-wider truncate w-full">
          Time Elapsed
        </span>
        <span className="font-mono text-[11px] sm:text-xs font-bold text-[#F8FAFC] mt-0.5">
          {timeElapsedDisplay}
        </span>
      </div>

      {/* Block 3: Final Deadline */}
      <div 
        className="flex flex-col items-center justify-center shrink-0 flex-1 min-w-[85px] rounded-xl border border-white/[0.08] bg-[#0E121B]/60 px-2.5 py-1.5 text-center"
      >
        <span className="font-mono text-[9px] text-[#94A3B8] uppercase tracking-wider truncate w-full">
          Final Deadline
        </span>
        <span className="font-mono text-[11px] sm:text-xs font-bold text-[#F43F5E] mt-0.5">
          {finalDeadlineDisplay}
        </span>
      </div>
    </div>
  );
};

