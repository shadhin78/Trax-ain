/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppRoute } from '../../types/navigation';
import { DashboardShortcutGrid } from './components/DashboardShortcutGrid';
import { ProgramCompletionSection } from './components/ProgramCompletionSection';
import { TrackCompletionSection } from './components/TrackCompletionSection';

interface DashboardViewProps {
  onNavigate?: (route: AppRoute) => void;
}

/**
 * Dashboard View for X-29.
 * Features:
 * - Dynamic Shortcut Cards Deck (Pace & Timeline, Focus Heatmap, Monthly Targets, Global Completion, Outcome & CGPA, Focus Timer, Active Now, Weekly Targets)
 * - Program Completion deck for all enrolled study programs
 * - Track Completion deck for all enrolled study tracks
 */
export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  return (
    <div className="w-full space-y-7 sm:space-y-8 font-mono pb-8">
      {/* ── DYNAMIC SHORTCUT CARDS DECK ── */}
      <DashboardShortcutGrid onNavigate={onNavigate} />

      {/* ── PROGRAM COMPLETION ── */}
      <ProgramCompletionSection onNavigate={onNavigate} />

      {/* ── TRACK COMPLETION ── */}
      <TrackCompletionSection onNavigate={onNavigate} />
    </div>
  );
};

