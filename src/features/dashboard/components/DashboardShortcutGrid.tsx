/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppRoute } from '../../../types/navigation';
import { PaceTimelineShortcutCard } from './shortcut-cards/PaceTimelineShortcutCard';
import { FocusHeatmapShortcutCard } from './shortcut-cards/FocusHeatmapShortcutCard';
import { MonthlyTargetsShortcutCard } from './shortcut-cards/MonthlyTargetsShortcutCard';
import { GlobalCompletionShortcutCard } from './shortcut-cards/GlobalCompletionShortcutCard';
import { OutcomeCgpaShortcutCard } from './shortcut-cards/OutcomeCgpaShortcutCard';
import { FocusTimerShortcutCard } from './shortcut-cards/FocusTimerShortcutCard';
import { ActiveNowShortcutCard } from './shortcut-cards/ActiveNowShortcutCard';
import { WeeklyTargetsShortcutCard } from './shortcut-cards/WeeklyTargetsShortcutCard';
import { DailyActionsShortcutCard } from './shortcut-cards/DailyActionsShortcutCard';
import { UpcomingExamsShortcutCard } from './shortcut-cards/UpcomingExamsShortcutCard';
import { PassedSubjectsShortcutCard } from './shortcut-cards/PassedSubjectsShortcutCard';

interface DashboardShortcutGridProps {
  onNavigate?: (route: AppRoute) => void;
}

/**
 * Master Dashboard Shortcut Cards Grid
 * Layout matches reference structure:
 * - Row 1: PACE & TIMELINE | FOCUS HEATMAP | MONTHLY TARGETS
 * - Row 2: GLOBAL COMPLETION | OUTCOME & CGPA | FOCUS TIMER
 * - Row 3: ACTIVE NOW | WEEKLY TARGETS | DAILY ACTIONS
 * - Row 4 (Last Row): UPCOMING EXAMS | PASSED SUBJECTS | (1 Slot Empty)
 *
 * Every single card has the exact same dimensions (width & height).
 * Fully dynamic, zero hardcoding, responsive on Mobile, Tablet, and Desktop.
 */
export const DashboardShortcutGrid: React.FC<DashboardShortcutGridProps> = React.memo(({ onNavigate }) => {
  return (
    <section aria-label="Dashboard Shortcut Command Deck" className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* ── ROW 1 ── */}
        <PaceTimelineShortcutCard onNavigate={onNavigate} />
        <FocusHeatmapShortcutCard onNavigate={onNavigate} />
        <MonthlyTargetsShortcutCard onNavigate={onNavigate} />

        {/* ── ROW 2 ── */}
        <GlobalCompletionShortcutCard onNavigate={onNavigate} />
        <OutcomeCgpaShortcutCard onNavigate={onNavigate} />
        <FocusTimerShortcutCard onNavigate={onNavigate} />

        {/* ── ROW 3 ── */}
        <ActiveNowShortcutCard onNavigate={onNavigate} />
        <WeeklyTargetsShortcutCard onNavigate={onNavigate} />
        <DailyActionsShortcutCard onNavigate={onNavigate} />

        {/* ── ROW 4 (LAST ROW: 2 CARDS, 1 EMPTY) ── */}
        <UpcomingExamsShortcutCard onNavigate={onNavigate} />
        <PassedSubjectsShortcutCard onNavigate={onNavigate} />
      </div>
    </section>
  );
});

DashboardShortcutGrid.displayName = 'DashboardShortcutGrid';
