/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Info } from 'lucide-react';
import { usePace } from '../context/PaceContext';
import { formatDisplayDate } from '../utils/paceCalculations';

export const GlobalBaselineCard: React.FC = React.memo(() => {
  const { globalGoal, hasGlobalGoal } = usePace();

  // Always link with the global pace goal timeline range (global pace = global baseline)
  const startDate = globalGoal?.startDate;
  const endDate = globalGoal?.deadline;

  const formattedStart = hasGlobalGoal && startDate ? formatDisplayDate(startDate).toUpperCase() : null;
  const formattedEnd = hasGlobalGoal && endDate ? formatDisplayDate(endDate).toUpperCase() : null;
  const hasValidRange = Boolean(formattedStart && formattedEnd);

  return (
    <div 
      id="global-baseline-card"
      className="w-full rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl px-5 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] font-mono"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
          <Info className="h-4 w-4" />
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap font-mono text-xs sm:text-sm">
          <span className="font-bold tracking-wide text-[#38BDF8]">
            Global Baseline
          </span>
          <span className="text-white/30" aria-hidden="true">|</span>
          <span className="text-[#F8FAFC] tracking-wider uppercase font-semibold text-xs sm:text-sm">
            {hasValidRange ? `${formattedStart} → ${formattedEnd}` : 'NOT SET'}
          </span>
        </div>
      </div>
    </div>
  );
});

GlobalBaselineCard.displayName = 'GlobalBaselineCard';
