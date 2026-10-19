/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { SpatialBackground } from './components/spatial/SpatialBackground';
import { AppNameContainer } from './components/layout/AppNameContainer';
import { Header, MobileHeaderRow2 } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { PageContainer } from './components/layout/PageContainer';
import { useRouter, getValidRedirectDestination } from './lib/router';
import { AuthSyncProvider, useAuthSync } from './context/AuthSyncContext';
import { AcademicHierarchyProvider, updateGlobalAppState } from './context/AcademicHierarchyContext';
import { PaceProvider } from './features/pace/context/PaceContext';
import { DailyActionsProvider } from './features/daily-actions/context/DailyActionsContext';
import { OutcomeProvider } from './features/outcome/context/OutcomeContext';
import { DeleteConfirmationProvider } from './context/DeleteConfirmationContext';
import { FocusTimerProvider } from './features/focus/context/FocusTimerContext';
import { ExamRoutineProvider } from './features/exam-routine/context/ExamRoutineContext';
import { DailyScheduleProvider } from './features/daily-schedule/context/DailyScheduleContext';
import { AuthLoadingScreen } from './components/auth/AuthLoadingScreen';

const DedicatedLoginPage = lazy(() => import('./features/auth/DedicatedLoginPage').then(m => ({ default: m.DedicatedLoginPage })));

function AppGlobalSyncBridge() {
  const { user, syncStatus, lastSyncedAt, appData, isCloudLoaded, flushPendingUpdates, forceRefreshFromCloud } = useAuthSync();

  useEffect(() => {
    updateGlobalAppState({
      userId: user?.uid || null,
      syncStatus,
      isCloudLoaded,
      lastSyncedAt,
      version: appData.version || 1,
      saveToCloud: flushPendingUpdates,
      forceRefreshFromCloud,
    });
  }, [user?.uid, syncStatus, isCloudLoaded, lastSyncedAt, appData.version, flushPendingUpdates, forceRefreshFromCloud]);

  return null;
}

/**
 * X-29 — Master Application Shell with Centralized Route Guard
 * 
 * Security Guard Enforcements:
 * 1. Explicit Session Verification: While authentication is pending, displays a neutral loading transition.
 *    No protected content or component flashes before verification.
 * 2. Unauthenticated Visitor Guard: All application routes are protected by default.
 *    Unauthenticated visitors are redirected to the dedicated login page.
 *    No feature providers, listeners, or cached records are mounted.
 * 3. Authenticated Access: Valid authenticated users enter the application and access only authorized pages.
 *    Deep links and refreshes preserve destination without false login redirects.
 * 4. Immediate Session Revocation: On logout or expired session, the protected application shell and all
 *    feature contexts are unmounted immediately.
 */
function AppGuardShell() {
  const { user, authLoading } = useAuthSync();
  const { currentRoute, currentTitle, navigate, isTransitioning } = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (route: Parameters<typeof navigate>[0]) => {
    navigate(route);
    // Smoothly scroll the body container to the top upon route change
    if (typeof document !== 'undefined') {
      const bodyEl = document.getElementById('body-container');
      if (bodyEl) {
        bodyEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Route Synchronization Guard Effect:
  // Coordinates browser URL updates without calling state changes during render
  useEffect(() => {
    if (authLoading) return;

    if (!user && currentRoute !== '/login/') {
      // Unauthenticated visitor on protected route: silently save destination in sessionStorage and navigate to clean /login/
      if (currentRoute && currentRoute !== '/' && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('x29_redirect_destination', currentRoute);
        } catch {}
      }
      navigate('/login/');
    } else if (user && currentRoute === '/login/') {
      // Authenticated user on /login/: forward to saved destination or default Dashboard
      let savedDest: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          savedDest = sessionStorage.getItem('x29_redirect_destination');
          sessionStorage.removeItem('x29_redirect_destination');
          if (!savedDest) {
            const searchParams = new URLSearchParams(window.location.search);
            savedDest = searchParams.get('redirect');
          }
        } catch {}
      }
      const destination = getValidRedirectDestination(savedDest);
      navigate(destination);
    }
  }, [authLoading, user, currentRoute, navigate]);

  // 1. Explicit Loading State: Authentication restoration in progress
  if (authLoading) {
    return (
      <SpatialBackground enableParallax={false} enableAutoAnimation={true} mode="transparent">
        <AuthLoadingScreen />
      </SpatialBackground>
    );
  }

  // 2. Unauthenticated State: Mandatory Login Page
  // All private application providers, components, and listeners remain unmounted
  if (!user) {
    return (
      <SpatialBackground enableParallax={true} enableAutoAnimation={true} mode="transparent">
        <Suspense fallback={<AuthLoadingScreen />}>
          <DedicatedLoginPage onNavigate={handleNavigate} />
        </Suspense>
      </SpatialBackground>
    );
  }

  // 3. Authenticated Transition State: If user is on /login/, show neutral transition while redirecting
  if (currentRoute === '/login/') {
    return (
      <SpatialBackground enableParallax={false} enableAutoAnimation={true} mode="transparent">
        <AuthLoadingScreen />
      </SpatialBackground>
    );
  }

  // 4. Authenticated Application Deck: Mount feature tree and render protected UI
  return (
    <AcademicHierarchyProvider>
      <OutcomeProvider>
        <PaceProvider>
          <DailyActionsProvider>
            <DailyScheduleProvider>
              <ExamRoutineProvider>
                <FocusTimerProvider>
                  <AppGlobalSyncBridge />
                  <DeleteConfirmationProvider>
                    <SpatialBackground 
                      enableParallax={true} 
                      enableAutoAnimation={true}
                      mode="transparent"
                    >
                      <div className="relative flex h-full h-dvh w-full max-w-full flex-col overflow-hidden bg-transparent">
                        
                        {/* ── TOP ROW: CONTAINER 1 (APP NAME) + CONTAINER 2 (HEADER) ── */}
                        <div className="sticky top-0 z-30 flex w-full shrink-0 items-center bg-transparent">
                          {/* 1. APP NAME / LOGO CONTAINER */}
                          <AppNameContainer
                            onNavigate={handleNavigate}
                            onCloseMobile={() => setIsMobileMenuOpen(false)}
                          />

                          {/* 2. HEADER CONTAINER */}
                          <Header
                            currentRoute={currentRoute}
                            onNavigate={handleNavigate}
                          />
                        </div>

                        {/* ── MAIN ROW: CONTAINER 3 (NAVIGATION) + CONTAINER 4 (BODY) ── */}
                        <div className="flex flex-1 min-h-0 w-full overflow-hidden bg-transparent">
                          {/* 3. NAVIGATION / MENU CONTAINER */}
                          <Sidebar
                            currentRoute={currentRoute}
                            onNavigate={handleNavigate}
                            isOpenMobile={isMobileMenuOpen}
                            onCloseMobile={() => setIsMobileMenuOpen(false)}
                          />

                          {/* 4. BODY / CONTENT CONTAINER */}
                          <main
                            id="body-container"
                            data-container="body"
                            className="flex-1 min-w-0 w-full max-w-full h-full overflow-y-auto overflow-x-hidden overscroll-y-contain overscroll-x-none px-2.5 pt-1 pb-4 sm:p-6 lg:p-8 bg-transparent"
                          >
                            {/* Mobile Row 2 — Normal Document Flow (< lg only) */}
                            <MobileHeaderRow2 />

                            <PageContainer
                              route={currentRoute}
                              title={currentTitle}
                              isTransitioning={isTransitioning}
                              onNavigate={handleNavigate}
                            />
                          </main>
                        </div>

                      </div>
                    </SpatialBackground>
                  </DeleteConfirmationProvider>
                </FocusTimerProvider>
              </ExamRoutineProvider>
            </DailyScheduleProvider>
          </DailyActionsProvider>
        </PaceProvider>
      </OutcomeProvider>
    </AcademicHierarchyProvider>
  );
}

export default function App() {
  return (
    <AuthSyncProvider>
      <AppGuardShell />
    </AuthSyncProvider>
  );
}
