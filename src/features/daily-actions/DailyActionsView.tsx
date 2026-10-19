/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppRoute } from '../../types/navigation';
import { useDailyActions } from './context/DailyActionsContext';
import { DailyActionsProgressBarCard } from './components/DailyActionsProgressBarCard';
import { DailyActionCard } from './components/DailyActionCard';
import { MonthlyTargetsSetupCard } from './components/MonthlyTargetsSetupCard';
import { WeeklyTargetsCard } from './components/WeeklyTargetsCard';
import { CreateDailyActionTrackerForm } from './components/CreateDailyActionTrackerForm';

interface DailyActionsViewProps {
  onNavigate?: (route: AppRoute) => void;
}

const DailyActionsContent: React.FC<DailyActionsViewProps> = ({ onNavigate }) => {
  const { dailyActions } = useDailyActions();

  // Handle smooth scroll when navigating to specific sections via hash (e.g. #monthly-targets-section)
  React.useEffect(() => {
    const scrollToTargetHash = () => {
      const hash = window.location.hash;
      if (!hash) return;

      const rawId = hash.replace('#', '').trim();
      // Match canonical and alias target section IDs
      const targetElement = 
        document.getElementById(rawId) ||
        (rawId.includes('month') ? document.getElementById('monthly-targets-section') : null) ||
        (rawId.includes('week') ? document.getElementById('weekly-targets-section') : null);

      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    };

    scrollToTargetHash();
    window.addEventListener('hashchange', scrollToTargetHash);
    return () => window.removeEventListener('hashchange', scrollToTargetHash);
  }, []);

  return (
    <div className="w-full space-y-6 font-mono pb-12">
      {/* ── 0. DAILY ACTIONS PROGRESS BAR CARD (DYNAMIC COMPLETION % BAR WITH DATABASE BUTTON) ── */}
      <DailyActionsProgressBarCard />

      {/* ── 1. DAILY ACTION CARDS (4 CARDS IN ONE ROW ON DESKTOP) ── */}
      {dailyActions.length > 0 && (
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4.5">
            {dailyActions.map((action) => (
              <DailyActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}

      {/* ── 2. MONTHLY TARGETS CARD / SECTION ── */}
      <section 
        id="monthly-targets-section" 
        aria-label="Monthly Targets Section" 
        className="w-full scroll-mt-6"
      >
        <MonthlyTargetsSetupCard onNavigate={onNavigate} />
      </section>

      {/* ── 3. WEEKLY TARGETS CARD / SECTION ── */}
      <section 
        id="weekly-targets-section" 
        aria-label="Weekly Targets Section" 
        className="w-full scroll-mt-6"
      >
        <WeeklyTargetsCard onNavigate={onNavigate} />
      </section>

      {/* ── 4. CREATE DAILY ACTION TRACKER FORM (COLLAPSIBLE BUILDER) ── */}
      <CreateDailyActionTrackerForm />
    </div>
  );
};

export const DailyActionsView: React.FC<DailyActionsViewProps> = (props) => {
  return <DailyActionsContent {...props} />;
};
