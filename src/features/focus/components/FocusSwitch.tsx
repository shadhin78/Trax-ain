/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TimerMode } from '../types';

interface FocusSwitchProps {
  currentMode: TimerMode;
  onSelectMode: (mode: TimerMode) => void;
  disabled?: boolean;
}

/**
 * Segmented mode switch: STOPWATCH | TIMER | ALARM RANGE.
 * Follows Project-X design tokens with inner translucent glow styling.
 */
export const FocusSwitch: React.FC<FocusSwitchProps> = ({
  currentMode,
  onSelectMode,
  disabled = false,
}) => {
  const modes: { id: TimerMode; label: string }[] = [
    { id: 'STOPWATCH', label: 'STOPWATCH' },
    { id: 'TIMER', label: 'TIMER' },
    { id: 'ALARM_RANGE', label: 'ALARM RANGE' },
  ];

  return (
    <div 
      className="inline-flex items-center gap-1 p-1 bg-transparent border border-white/[0.08] rounded-2xl select-none font-mono"
      role="tablist"
      aria-label="Timer Mode Switch"
    >
      {modes.map(({ id, label }) => {
        const isActive = currentMode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onSelectMode(id)}
            className={`
              relative px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-mono font-bold tracking-wider rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isActive
                  ? 'text-white border border-[#6366F1] bg-[#6366F1]/25 shadow-[inset_0_0_14px_rgba(99,102,241,0.6),0_0_16px_rgba(99,102,241,0.35)] md:hover:shadow-[inset_0_0_18px_rgba(99,102,241,0.8),0_0_20px_rgba(99,102,241,0.5)]'
                  : 'text-[#94A3B8] border border-transparent bg-transparent hover:text-[#F8FAFC] hover:border-white/[0.08] md:hover:bg-white/[0.03]'
              }
            `}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
