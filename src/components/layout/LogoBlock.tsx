/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppRoute } from '../../types/navigation';
import { BackgroundMode } from '../../features/account/AccountView';

interface LogoBlockProps {
  onNavigate: (route: AppRoute) => void;
  backgroundMode?: BackgroundMode;
}

/**
 * X-29 — Independent Floating Logo Block
 * Part 1 of the 3-part shell architecture:
 * - Aligns horizontally with the Header (same height h-[4.75rem] and baseline).
 * - Matches the exact vertical width of the Navigation Menu below it (w-full in w-64).
 * - Does not connect to the Header or the Navigation Menu (separated by spatial gaps).
 */
export const LogoBlock: React.FC<LogoBlockProps> = ({
  onNavigate,
  backgroundMode = 'transparent',
}) => {
  const isGrid = backgroundMode === 'grid';

  return (
    <button
      onClick={() => onNavigate('/')}
      className={`
        group flex h-[4.75rem] w-full items-center justify-between px-5 rounded-2xl border transition-all duration-200 cursor-pointer text-left
        ${
          isGrid
            ? 'border-[#1F2637] bg-[#131722]/85 shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:border-white/[0.2] hover:bg-[#181f2f]'
            : 'border-white/[0.08] bg-[#131722]/40 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:border-white/[0.18] hover:bg-[#131722]/60'
        }
      `}
      aria-label="TraX Dashboard Home"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Compact Proportional Logo Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1F2637]/80 border border-white/[0.1] shadow-inner transition-transform group-hover:scale-105">
          <span className="font-mono text-sm font-black tracking-wider text-[#6366F1]">T</span>
          <span className="font-mono text-[10px] font-bold text-[#F8FAFC]">X</span>
        </div>

        {/* Proportional Brand Typography */}
        <div className="flex flex-col min-w-0">
          <span className="font-mono text-sm font-bold tracking-widest text-[#F8FAFC] group-hover:text-white leading-none">
            TraX
          </span>
          <span className="font-mono text-[9px] tracking-wider text-[#94A3B8] leading-none mt-1.5">
            COMMAND DECK
          </span>
        </div>
      </div>

      {/* Live Status Indicator Dot */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        <span className="h-2 w-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
      </div>
    </button>
  );
};
