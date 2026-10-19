/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppRoute } from '../../types/navigation';
import { DailyScheduleProvider } from './context/DailyScheduleContext';
import { ActiveNowCard } from './components/ActiveNowCard';
import { RoutineHoursSummaryCard } from './components/RoutineHoursSummaryCard';
import { RoutineAllocationCard } from './components/RoutineAllocationCard';
import { CategoryManagementCard } from './components/CategoryManagementCard';
import { DailyTimelineGrid } from './components/DailyTimelineGrid';
import { DailyGapTimeCard } from './components/DailyGapTimeCard';

interface DailyScheduleViewProps {
  onNavigate?: (route: AppRoute) => void;
}

const DailyScheduleContent: React.FC<DailyScheduleViewProps> = () => {
  return (
    <div className="w-full pb-16 font-mono">
      {/* ── TWO-COLUMN COMMAND DECK LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column: Active Now + Routine Summary + 24-Hr Allocation + Category Management */}
        <div className="lg:col-span-5 xl:col-span-4 w-full space-y-5 sm:space-y-6">
          {/* 1. ACTIVE NOW CARD (REAL-TIME ZERO-WRITE COUNTDOWN & PROGRESS BAR) */}
          <ActiveNowCard />

          {/* 2. ROUTINE HOURS SUMMARY CARD */}
          <RoutineHoursSummaryCard />

          {/* 3. 24-HOUR ROUTINE ALLOCATION CARD */}
          <RoutineAllocationCard />

          {/* 4. CATEGORY MANAGEMENT CARD (CREATE, EDIT, DELETE CATEGORIES) */}
          <CategoryManagementCard />
        </div>

        {/* Right Column: Daily Timeline Grid (~60-65% desktop) + Gap Time Section */}
        <div className="lg:col-span-7 xl:col-span-8 w-full space-y-5 sm:space-y-6">
          <DailyTimelineGrid />
          <DailyGapTimeCard />
        </div>
      </div>
    </div>
  );
};

export const DailyScheduleView: React.FC<DailyScheduleViewProps> = (props) => {
  return <DailyScheduleContent {...props} />;
};
