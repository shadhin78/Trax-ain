/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { AppRoute } from '../../types/navigation';
import { useAuthSync } from '../../context/AuthSyncContext';
import { Lock } from 'lucide-react';

// Dynamic code-splitting for all 13 route views
const AccountView = lazy(() => import('../../features/account/AccountView').then(m => ({ default: m.AccountView })));
const DedicatedLoginPage = lazy(() => import('../../features/auth/DedicatedLoginPage').then(m => ({ default: m.DedicatedLoginPage })));
const MasterConfigView = lazy(() => import('../../features/master-config/MasterConfigView').then(m => ({ default: m.MasterConfigView })));
const SubjectPageView = lazy(() => import('../../features/subjects/SubjectPageView').then(m => ({ default: m.SubjectPageView })));
const AnalyticsView = lazy(() => import('../../features/analytics/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const PaceManagementView = lazy(() => import('../../features/pace/PaceManagementView').then(m => ({ default: m.PaceManagementView })));
const DailyActionsView = lazy(() => import('../../features/daily-actions/DailyActionsView').then(m => ({ default: m.DailyActionsView })));
const MonthlyTargetSetupView = lazy(() => import('../../features/daily-actions/MonthlyTargetSetupView').then(m => ({ default: m.MonthlyTargetSetupView })));
const FocusView = lazy(() => import('../../features/focus/FocusView').then(m => ({ default: m.FocusView })));
const DailyScheduleView = lazy(() => import('../../features/daily-schedule/DailyScheduleView').then(m => ({ default: m.DailyScheduleView })));
const OutcomeView = lazy(() => import('../../features/outcome/OutcomeView').then(m => ({ default: m.OutcomeView })));
const ExamRoutineView = lazy(() => import('../../features/exam-routine/ExamRoutineView').then(m => ({ default: m.ExamRoutineView })));
const DashboardView = lazy(() => import('../../features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));

/**
 * Lightweight, zero-shift spatial skeleton loader for dynamic routes.
 * Preserves dark theme tokens and prevents layout shift during route transitions.
 */
const PageFallbackLoader: React.FC = () => (
  <div className="w-full min-h-[380px] flex flex-col gap-4 animate-pulse pt-2" aria-busy="true" aria-label="Loading page">
    <div className="h-7 w-44 rounded-xl bg-white/[0.04] border border-white/[0.06]" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div className="h-44 rounded-2xl bg-[#131722]/50 border border-white/[0.06]" />
      <div className="h-44 rounded-2xl bg-[#131722]/50 border border-white/[0.06]" />
      <div className="h-44 rounded-2xl bg-[#131722]/50 border border-white/[0.06]" />
    </div>
  </div>
);

interface PageContainerProps {
  route: AppRoute;
  title: string;
  isTransitioning: boolean;
  onNavigate?: (route: AppRoute) => void;
}

/**
 * Body Container for X-29.
 * - Dedicated /login/ route displays the dedicated Login page.
 * - /master-config/ displays Master Configuration (authoritative hierarchy data management).
 * - /subjects/ displays Subject Page (authoritative dynamic hierarchy display).
 * - /analytics/ displays Analytics Page (Commitment Radar & Performance Matrix).
 * - /focus/ displays Real-Time Focus Timer & Chronometer Deck.
 * - /daily-schedule/ displays Daily Schedule & Routine Timeline Grid.
 * - /outcome/ displays Outcome, CGPA Results & Performance Trend.
 * - /exam-routine/ displays Exam Routine & Timetable, Live Countdown Banner.
 * - /pace-management/ displays Pace Management (Velocity Tracking & Trajectory Targeting).
 * - /monthly-target-setup/ displays Monthly Target Setup workspace.
 * - /account/ displays Account Manager.
 * - Other protected routes prompt for authentication when unauthenticated.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  route,
  title,
  isTransitioning,
  onNavigate,
}) => {
  const { user, authLoading } = useAuthSync();
  const isLoginRoute = route === '/login/';
  const isAccountRoute = route === '/account/';
  const isMasterConfigRoute = route === '/master-config/';
  const isSubjectsRoute = route === '/subjects/';
  const isAnalyticsRoute = route === '/analytics/';
  const isFocusRoute = route === '/focus/';
  const isDailyScheduleRoute = route === '/daily-schedule/';
  const isOutcomeRoute = route === '/outcome/';
  const isExamRoutineRoute = route === '/exam-routine/' || route === '/exam/';
  const isPaceManagementRoute = route === '/pace-management/';
  const isDailyActionsRoute = route === '/daily-actions/';
  const isMonthlyTargetSetupRoute = route === '/monthly-target-setup/';
  const isDashboardRoute = route === '/' || route === '/dashboard/';

  return (
    <div
      className={`
        w-full min-w-0 flex flex-col transition-all duration-200 ease-out
        ${
          isTransitioning
            ? 'opacity-0 translate-y-1'
            : 'opacity-100 translate-y-0'
        }
      `}
    >
      {/* ── BREADCRUMBS (TOP-LEFT OF BODY CONTAINER) ── */}
      <nav 
        aria-label="Breadcrumb"
        className="flex items-center gap-2 font-mono text-xs sm:text-sm text-[#94A3B8] mb-3"
      >
        <button
          onClick={() => onNavigate && onNavigate('/')}
          className="hover:text-[#F8FAFC] transition-colors focus:outline-none focus-visible:underline cursor-pointer"
        >
          Home
        </button>
        <span className="text-white/25 select-none" aria-hidden="true">/</span>
        <span className="text-[#F8FAFC] font-medium tracking-wide">
          {title}
        </span>
      </nav>

      {/* ── 1. DEDICATED LOGIN ROUTE ── */}
      <Suspense fallback={<PageFallbackLoader />}>
        {isLoginRoute ? (
          <div className="mt-4 sm:mt-6 w-full flex justify-center">
            <DedicatedLoginPage onNavigate={onNavigate || (() => {})} />
          </div>
        ) : isDashboardRoute ? (
          /* ── 0. DASHBOARD ROUTE (X BAR DIRECTLY LINKED WITH ACTIVE PACING TIMELINES) ── */
          <div className="w-full flex-1">
            <DashboardView onNavigate={onNavigate} />
          </div>
        ) : isMasterConfigRoute ? (
          /* ── 2. MASTER CONFIGURATION (AUTHORITATIVE HIERARCHY MANAGEMENT) ── */
          <div className="w-full flex-1">
            <MasterConfigView onNavigate={onNavigate} />
          </div>
        ) : isSubjectsRoute ? (
          /* ── 3. SUBJECTS PAGE (DYNAMIC ACADEMIC HIERARCHY OUTPUT) ── */
          <div className="w-full flex-1">
            <SubjectPageView onNavigate={onNavigate} />
          </div>
        ) : isAnalyticsRoute ? (
          /* ── 4. ANALYTICS PAGE (SYLLABUS CIRCLE CHART & TELEMETRY) ── */
          <div className="w-full flex-1">
            <AnalyticsView onNavigate={onNavigate} />
          </div>
        ) : isPaceManagementRoute ? (
          /* ── 5. PACE MANAGEMENT PAGE (VELOCITY & TRAJECTORY DASHBOARD) ── */
          <div className="w-full flex-1">
            <PaceManagementView onNavigate={onNavigate} />
          </div>
        ) : isDailyActionsRoute ? (
          /* ── 6. DAILY ACTIONS (MONTHLY TARGETS SETUP & DAILY ACTION TRACKERS) ── */
          <div className="w-full flex-1">
            <DailyActionsView onNavigate={onNavigate} />
          </div>
        ) : isMonthlyTargetSetupRoute ? (
          /* ── 6B. MONTHLY TARGET SETUP (DEDICATED MILESTONE ALLOCATION & BUILDER) ── */
          <div className="w-full flex-1">
            <MonthlyTargetSetupView onNavigate={onNavigate} />
          </div>
        ) : isFocusRoute ? (
          /* ── 7. FOCUS (REAL-TIME MULTI-DEVICE TIMER & CHRONOMETER DECK) ── */
          <div className="w-full flex-1">
            <FocusView onNavigate={onNavigate} />
          </div>
        ) : isDailyScheduleRoute ? (
          /* ── 8. DAILY SCHEDULE (ROUTINE TIMELINE GRID & ACTIVE NOW DECK) ── */
          <div className="w-full flex-1">
            <DailyScheduleView onNavigate={onNavigate} />
          </div>
        ) : isOutcomeRoute ? (
          /* ── 9. OUTCOME (SUCCESS & RESULTS, PERFORMANCE TREND, FREEZE & CELEBRATION) ── */
          <div className="w-full flex-1">
            <OutcomeView onNavigate={onNavigate} />
          </div>
        ) : isExamRoutineRoute ? (
          /* ── 10. EXAM ROUTINE (TIMETABLE, LIVE COUNTDOWN & STUDY TARGETS) ── */
          <div className="w-full flex-1">
            <ExamRoutineView onNavigate={onNavigate} />
          </div>
        ) : isAccountRoute ? (
          /* ── 11. ACCOUNT MANAGER ── */
          <div className="mt-2 w-full">
            <AccountView onNavigate={onNavigate} />
          </div>
        ) : authLoading ? (
          /* Subtle loading state while authentication initializes */
          <div className="flex-1 flex min-h-[360px] sm:min-h-[440px] items-center justify-center text-[#94A3B8] font-mono text-xs">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-[#6366F1] mr-2" />
            Verifying session...
          </div>
        ) : !user ? (
        /* ── 5. UNAUTHENTICATED STATE FOR OTHER PROTECTED ROUTES ── */
        <div className="mt-6 sm:mt-10 flex-1 flex min-h-[380px] sm:min-h-[460px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.14] bg-transparent p-6 sm:p-12 text-center relative overflow-hidden group hover:border-[#6366F1]/40 transition-colors">
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(99,102,241,0.15) 0%, transparent 60%)',
            }}
            aria-hidden="true"
          />

          {/* Center Lock Glyph */}
          <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-white/[0.14] bg-transparent backdrop-blur-sm text-[#F59E0B] shadow-[0_0_24px_rgba(245,158,11,0.2)] mb-4">
            <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-[#F59E0B]" />
          </div>

          {/* Heading */}
          <h2 className="font-mono text-base sm:text-lg lg:text-xl font-bold tracking-wider text-[#F8FAFC]">
            Authentication Required
          </h2>

          {/* Center Login Message */}
          <p className="mt-2 text-xs sm:text-sm text-[#94A3B8] max-w-sm sm:max-w-md">
            Please log in to access your data.
          </p>

          {/* Center Login Button */}
          <button
            onClick={() => onNavigate && onNavigate('/login/')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_16px_rgba(99,102,241,0.2)]"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Login</span>
          </button>
        </div>
      ) : (
        /* Authenticated default/placeholder for other routes */
        <div className="flex-1 flex min-h-[360px] sm:min-h-[440px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.14] bg-transparent p-6 sm:p-12 text-center relative overflow-hidden">
          <h2 className="font-mono text-base sm:text-lg lg:text-xl font-bold tracking-wider text-[#F8FAFC]">
            {title}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#94A3B8] max-w-sm sm:max-w-md">
            Workspace viewport for {title}.
          </p>
        </div>
      )}
      </Suspense>

    </div>
  );
};
