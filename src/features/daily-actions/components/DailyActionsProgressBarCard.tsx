/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Activity, Sparkles, Clock } from 'lucide-react';
import { useDailyActions } from '../context/DailyActionsContext';
import { DailyActionsDatabaseModal } from './modals/DailyActionsDatabaseModal';

export const DailyActionsProgressBarCard: React.FC = React.memo(() => {
  const { 
    todayPercentage, 
    completedTodayCount, 
    totalDailyActions,
    timeUntilMidnightStr 
  } = useDailyActions();

  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);

  // Dynamic color progression: gets greener as completion increases
  const getProgressStyles = () => {
    if (todayPercentage === 0) {
      return {
        barGradient: 'bg-white/10',
        textColor: 'text-[#94A3B8]',
        glowShadow: 'none',
      };
    }
    if (todayPercentage <= 35) {
      return {
        // Early stage: Warm Amber / Orange
        barGradient: 'bg-gradient-to-r from-[#EA580C] to-[#F97316]',
        textColor: 'text-[#F97316]',
        glowShadow: 'shadow-[0_0_14px_rgba(249,115,22,0.65)]',
      };
    }
    if (todayPercentage <= 69) {
      // Mid stage: Golden Yellow (as in user screenshot)
      return {
        barGradient: 'bg-gradient-to-r from-[#D97706] to-[#EAB308]',
        textColor: 'text-[#FACC15]',
        glowShadow: 'shadow-[0_0_16px_rgba(234,179,8,0.7)]',
      };
    }
    if (todayPercentage < 100) {
      // Advanced stage: Lime / Light Emerald Green
      return {
        barGradient: 'bg-gradient-to-r from-[#65A30D] to-[#84CC16]',
        textColor: 'text-[#84CC16]',
        glowShadow: 'shadow-[0_0_18px_rgba(132,204,22,0.75)]',
      };
    }
    // Complete 100%: Vibrant Emerald Glow
    return {
      barGradient: 'bg-gradient-to-r from-[#059669] to-[#10B981]',
      textColor: 'text-[#10B981]',
      glowShadow: 'shadow-[0_0_22px_rgba(16,185,129,0.9)]',
    };
  };

  const currentStyles = getProgressStyles();

  return (
    <>
      <div 
        id="daily-actions-progress-bar-card"
        className="w-full rounded-[24px] border border-white/[0.08] bg-[#0B0F19]/60 backdrop-blur-xl px-5 py-3.5 sm:px-6 sm:py-4.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] relative overflow-hidden font-mono transition-all duration-300"
      >
        {/* Subtle dynamic ambient glow matching current progress */}
        <div 
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-500"
          style={{
            backgroundColor:
              todayPercentage === 0 ? 'transparent' :
              todayPercentage <= 35 ? '#F97316' :
              todayPercentage <= 69 ? '#EAB308' :
              '#10B981',
          }}
          aria-hidden="true" 
        />

        {/* ── TOP ROW: TITLE + DATABASE BUTTON on LEFT, PERCENTAGE on RIGHT ── */}
        <div className="flex items-center justify-between gap-3 relative z-10 pb-2.5">
          
          {/* Left: DAILY ACTIONS TRACKER + DATABASE Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-[#F8FAFC] uppercase">
              DAILY ACTIONS TRACKER
            </span>

            {/* DATABASE Pill Button */}
            <button
              type="button"
              onClick={() => setIsDatabaseOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#6366F1]/15 hover:bg-[#6366F1]/30 text-[#818CF8] hover:text-white border border-[#6366F1]/30 hover:border-[#6366F1]/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(99,102,241,0.15)] md:active:scale-95"
              title="Open Daily Actions History Database"
            >
              <Database className="h-3 w-3" />
              <span>DATABASE</span>
            </button>

            {/* Today completion ratio counter */}
            <span className="text-[10px] text-[#94A3B8] font-bold hidden sm:inline-block">
              ({completedTodayCount}/{totalDailyActions} done today)
            </span>
          </div>

          {/* Right: Reset hint + Percentage text */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Midnight reset label */}
            <span className="text-[9px] sm:text-[10px] text-white/40 hidden md:inline-flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              <span>Resets 12:00 AM {timeUntilMidnightStr ? `(${timeUntilMidnightStr})` : ''}</span>
            </span>

            {/* Percentage Text */}
            <span className={`font-mono text-base sm:text-lg font-black tracking-tight transition-colors duration-300 ${currentStyles.textColor}`}>
              {todayPercentage}%
            </span>
          </div>

        </div>

        {/* ── BOTTOM ROW: FULL-WIDTH HORIZONTAL PROGRESS BAR ── */}
        <div className="w-full relative z-10 pt-1">
          {/* Track */}
          <div className="w-full h-2 sm:h-2.5 bg-black/40 rounded-full border border-white/[0.06] overflow-hidden p-0.5 relative shadow-inner">
            {/* Progress Fill */}
            <div 
              className={`h-full rounded-full md:transition-all md:duration-500 ease-out relative ${currentStyles.barGradient} ${currentStyles.glowShadow}`}
              style={{ width: `${Math.min(100, Math.max(0, todayPercentage))}%` }}
            >
              {/* PC-only illuminated leading tip glow */}
              {todayPercentage > 0 && todayPercentage < 100 && (
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Database Modal */}
      {isDatabaseOpen && (
        <DailyActionsDatabaseModal
          isOpen={isDatabaseOpen}
          onClose={() => setIsDatabaseOpen(false)}
        />
      )}
    </>
  );
});
