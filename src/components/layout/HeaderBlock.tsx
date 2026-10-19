/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  Flame,
  Activity,
  Hourglass,
} from 'lucide-react';
import { AppRoute, NavItemConfig } from '../../types/navigation';
import { useUpcomingExamHeader } from '../../features/exam-routine/utils/useUpcomingExamHeader';
import { useOutcome } from '../../features/outcome/context/OutcomeContext';

interface HeaderBlockProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const MENU_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', title: '1. Dashboard', route: '/', icon: LayoutDashboard },
  { id: 'analytics', title: '2. Analytics', route: '/analytics/', icon: BarChart3 },
  { id: 'focus', title: '3. Focus', route: '/focus/', icon: Target },
  { id: 'daily-actions', title: '4. Daily Actions', route: '/daily-actions/', icon: CheckSquare },
  { id: 'daily-schedule', title: '5. Daily Schedule', route: '/daily-schedule/', icon: Calendar },
  { id: 'subjects', title: '6. Subjects', route: '/subjects/', icon: BookOpen },
  { id: 'pace-management', title: '7. Pace Management', route: '/pace-management/', icon: Gauge },
  { id: 'master-config', title: '8. Master Config', route: '/master-config/', icon: Sliders },
  { id: 'outcome', title: '9. Outcome', route: '/outcome/', icon: Trophy },
  { id: 'exam-routine', title: '10. Exam Routine', route: '/exam-routine/', icon: CalendarCheck },
  { id: 'account', title: 'Account Page', route: '/account/', icon: User },
];

/**
 * BLOCK 02 — Header Block (Top-Right Quadrant)
 * Completely transparent background, position secured by borders.
 * Displays Upcoming Exam countdown, live Clock, Success Score, Day Elapsed, and Final Deadline.
 */
export const HeaderBlock: React.FC<HeaderBlockProps> = ({
  currentRoute,
  onNavigate,
}) => {
  const upcomingExam = useUpcomingExamHeader();
  const { coreCoursesPassedPercent, overallPassedCount, totalCoreCoursesCount } = useOutcome();
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

  // Lock body scroll when mobile modal is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <>
      <header 
        data-block="header"
        className="relative flex h-full w-full items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-transparent"
      >
        {/* ==================================================================== */}
        {/* DESKTOP HEADER VIEW (>= lg)                                         */}
        {/* ==================================================================== */}
        <div className="hidden lg:flex w-full items-center justify-between gap-4">
          
          {/* Left item in header: Upcoming Exam */}
          <div className="flex items-center gap-3">
            <div 
              id="header-block-upcoming-exam-card"
              className="flex items-center justify-center rounded-xl border border-white/[0.12] bg-transparent px-4 sm:px-6 py-2.5 sm:py-3 backdrop-blur-sm transition-all duration-300 lg:hover:border-white/[0.22] lg:hover:shadow-[0_0_24px_rgba(244,63,94,0.18)]"
            >
              {upcomingExam.hasUpcomingExam ? (
                <div className="flex items-center font-mono tracking-tight select-none">
                  {/* Subject Name */}
                  <span className="font-black text-[#F8FAFC] text-base sm:text-lg lg:text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                    {upcomingExam.subjectName}
                  </span>

                  {/* Separator Dash */}
                  <span className="font-bold text-[#64748B] text-base sm:text-lg lg:text-xl mx-2 sm:mx-2.5">
                    -
                  </span>

                  {/* 4 Countdown units with unit name */}
                  {upcomingExam.status === 'LIVE_IN_PROGRESS' ? (
                    <span className="inline-flex items-center gap-1.5 font-black text-[#F43F5E] text-base sm:text-lg lg:text-xl lg:animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-[#F43F5E] shadow-[0_0_10px_#F43F5E]" />
                      LIVE NOW
                    </span>
                  ) : upcomingExam.units && upcomingExam.units.length > 0 ? (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {upcomingExam.units.map((unit, idx) => (
                        <span key={idx} className="inline-flex items-baseline font-mono">
                          <span className="font-black text-[#F43F5E] text-base sm:text-lg lg:text-xl tracking-tight lg:drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                            {unit.value}
                          </span>
                          <span className="font-bold text-[#F8FAFC]/90 text-xs sm:text-sm lowercase ml-0.5">
                            {unit.unit}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="font-black text-[#F43F5E] text-base sm:text-lg lg:text-xl">
                      {upcomingExam.countdownDisplay}
                    </span>
                  )}
                </div>
              ) : (
                <span className="font-mono text-xs sm:text-sm font-semibold text-[#94A3B8]">
                  {upcomingExam.subjectName}
                </span>
              )}
            </div>

            {/* Subtle block label */}
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#6366F1] border border-[#6366F1]/30 rounded px-1.5 py-0.5">
              header
            </span>
          </div>

          {/* Right items in header: 4 Telemetry Blocks */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Clock */}
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-transparent px-3 py-1.5 backdrop-blur-sm hover:border-white/[0.2] transition-colors">
              <Clock className="h-3.5 w-3.5 text-[#94A3B8]" />
              <div className="flex flex-col text-left">
                <span className="font-mono text-[8px] uppercase tracking-wider text-[#94A3B8]">Clock</span>
                <span className="font-mono text-xs font-bold text-[#F8FAFC] whitespace-nowrap">
                  {currentTime || '12:00:00 AM'}
                </span>
              </div>
            </div>

            {/* Success Score */}
            <div 
              className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-transparent px-3 py-1.5 backdrop-blur-sm hover:border-white/[0.2] transition-colors"
              title={`Milestone Celebration Core Targets: ${overallPassedCount} of ${totalCoreCoursesCount} Passed (${coreCoursesPassedPercent}%)`}
            >
              <Activity className="h-3.5 w-3.5 text-[#10B981]" />
              <div className="flex flex-col text-left">
                <span className="font-mono text-[8px] uppercase tracking-wider text-[#94A3B8]">Success Score</span>
                <span className="font-mono text-xs font-bold text-[#10B981]">
                  {coreCoursesPassedPercent}%
                </span>
              </div>
            </div>

            {/* Time Elapsed */}
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-transparent px-3 py-1.5 backdrop-blur-sm hover:border-white/[0.2] transition-colors">
              <Hourglass className="h-3.5 w-3.5 text-[#94A3B8]" />
              <div className="flex flex-col text-left">
                <span className="font-mono text-[8px] uppercase tracking-wider text-[#94A3B8]">Day Elapsed</span>
                <span className="font-mono text-xs font-bold text-[#F8FAFC]">
                  04:12
                </span>
              </div>
            </div>

            {/* Final Deadline */}
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-transparent px-3 py-1.5 backdrop-blur-sm hover:border-white/[0.2] transition-colors">
              <div className="h-2 w-2 rounded-full bg-[#F43F5E] shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
              <div className="flex flex-col text-left">
                <span className="font-mono text-[8px] uppercase tracking-wider text-[#94A3B8]">Final Deadline</span>
                <span className="font-mono text-xs font-bold text-[#F43F5E]">
                  Nov 24
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ==================================================================== */}
        {/* MOBILE HEADER VIEW (< lg)                                           */}
        {/* ==================================================================== */}
        <div className="flex lg:hidden w-full items-center justify-between gap-2">
          {/* Upcoming Exam Compact */}
          <div className="flex items-center min-w-0 pr-1 font-mono">
            {upcomingExam.hasUpcomingExam ? (
              <div className="flex items-center min-w-0">
                <span className="font-black text-[#F8FAFC] text-xs truncate max-w-[100px] sm:max-w-[160px]">
                  {upcomingExam.subjectName}
                </span>
                <span className="font-bold text-[#64748B] text-xs mx-1.5 shrink-0 select-none">
                  -
                </span>
                {upcomingExam.status === 'LIVE_IN_PROGRESS' ? (
                  <span className="font-black text-[#F43F5E] text-xs shrink-0">
                    LIVE NOW
                  </span>
                ) : upcomingExam.units && upcomingExam.units.length > 0 ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {upcomingExam.units.map((unit, idx) => (
                      <span key={idx} className="inline-flex items-baseline font-mono">
                        <span className="font-black text-[#F43F5E] text-xs">
                          {unit.value}
                        </span>
                        <span className="font-bold text-[#F8FAFC]/90 text-[10px] lowercase ml-0.5 select-none">
                          {unit.unit}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="font-black text-[#F43F5E] text-xs shrink-0">
                    {upcomingExam.countdownDisplay}
                  </span>
                )}
              </div>
            ) : (
              <span className="font-mono text-[11px] font-semibold text-[#94A3B8]">
                {upcomingExam.subjectName}
              </span>
            )}
          </div>

          {/* Quick Stats & 3-Dot Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 border border-white/[0.1] rounded-lg px-2 py-1 text-center font-mono text-[10px]">
              <span className="text-[#10B981] font-bold">98.4%</span>
              <span className="text-[#64748B]">·</span>
              <span className="text-[#F8FAFC]">{currentTime || '21:32:25'}</span>
            </div>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.12] bg-transparent text-[#94A3B8] hover:text-white hover:border-[#6366F1]/50 active:scale-95 transition-all"
              aria-label="Open header telemetry & navigation"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quiet Block Marker */}
        <div 
          className="hidden lg:block absolute bottom-1 right-3 font-mono text-[8.5px] uppercase tracking-widest text-[#64748B]/60 pointer-events-none"
          aria-hidden="true"
        >
          Block 02
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MOBILE 3-DOT QUICK ACCESS MODAL                                      */}
      {/* ==================================================================== */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-menu-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsMenuOpen(false);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div 
            ref={menuModalRef}
            className="flex flex-col w-full max-w-sm max-h-[85vh] rounded-2xl border border-white/[0.14] bg-[#0E121B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-2xl animate-menu-modal"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-widest text-[#F8FAFC]">
                  HEADER TELEMETRY & NAV
                </span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-transparent text-[#94A3B8] hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Telemetry Summary */}
            <div className="grid grid-cols-3 gap-2 py-3 border-b border-white/[0.08] text-center font-mono">
              <div className="rounded-lg border border-white/[0.08] p-2 bg-transparent">
                <div className="text-[9px] text-[#94A3B8]">Clock</div>
                <div className="text-xs font-bold text-[#F8FAFC] mt-0.5">{currentTime}</div>
              </div>
              <div className="rounded-lg border border-white/[0.08] p-2 bg-transparent">
                <div className="text-[9px] text-[#94A3B8]">Score</div>
                <div className="text-xs font-bold text-[#10B981] mt-0.5">98.4%</div>
              </div>
              <div className="rounded-lg border border-white/[0.08] p-2 bg-transparent">
                <div className="text-[9px] text-[#94A3B8]">Deadline</div>
                <div className="text-xs font-bold text-[#F43F5E] mt-0.5">Nov 24</div>
              </div>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto py-3 space-y-1 pr-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentRoute === item.route;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.route);
                      setIsMenuOpen(false);
                    }}
                    className={`
                      flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-colors
                      ${
                        isActive
                          ? 'border-[#6366F1] bg-[#6366F1]/20 text-white'
                          : 'border-white/[0.06] bg-transparent text-[#94A3B8] hover:text-white hover:border-white/[0.15]'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
