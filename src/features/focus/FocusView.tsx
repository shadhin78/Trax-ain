/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { AppRoute } from '../../types/navigation';
import { FocusTimerProvider, FocusTimerContext } from './context/FocusTimerContext';
import { MainTimerDeck } from './components/MainTimerDeck';
import { FocusTelemetrySidebar } from './components/FocusTelemetrySidebar';
import { SubjectTargetTracker } from './components/SubjectTargetTracker';
import { SessionHistoryTable } from './components/SessionHistoryTable';

interface FocusViewProps {
  onNavigate?: (route: AppRoute) => void;
}

const FocusContent: React.FC<FocusViewProps> = ({ onNavigate }) => {
  return (
    <div className="w-full space-y-6 sm:space-y-7 pb-16 font-mono">
      {/* ── TOP SECTION: MAIN TIMER DECK (LEFT) + TELEMETRY CARDS (RIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column: Analog + Digital Chronometer Deck (7-8 cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 w-full">
          <MainTimerDeck />
        </div>

        {/* Right Column: Focus Metric Cards & Subject Allocation (4-5 cols on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 w-full">
          <FocusTelemetrySidebar />
        </div>
      </div>

      {/* ── MIDDLE SECTION: SUBJECT TARGET TRACKER ── */}
      <div className="w-full">
        <SubjectTargetTracker />
      </div>

      {/* ── BOTTOM SECTION: SESSION HISTORY & LOGS TABLE ── */}
      <div className="w-full">
        <SessionHistoryTable onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export const FocusView: React.FC<FocusViewProps> = (props) => {
  const existingContext = useContext(FocusTimerContext);
  if (existingContext) {
    return <FocusContent {...props} />;
  }
  return (
    <FocusTimerProvider>
      <FocusContent {...props} />
    </FocusTimerProvider>
  );
};
